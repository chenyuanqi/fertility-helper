/**
 * 数据管理工具类
 * 提供统一的数据操作接口，包括增删改查、数据验证、缓存管理等
 */

const { StorageManager, FertilityStorage, STORAGE_KEYS } = require('./storage');
const { DateUtils } = require('./date');
const { Validator } = require('./validator');

class DataManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
    this.initializeData();
  }

  /**
   * 确保周期数据已补齐到今天（基于平均周期长度进行预测生成）
   * - 若本地无周期，但有月经开始记录(isStart)，则据此生成周期
   * - 若最后一个周期已过期（今天已超过预测下次开始日），则自动生成后续周期，直到覆盖今天
   */
  async ensureCyclesUpToCurrentDate() {
    try {
      const today = DateUtils.formatDate(new Date());
      let cycles = await FertilityStorage.getCycles() || [];
      const userSettings = await FertilityStorage.getUserSettings();
      const averageCycleLength = userSettings?.personalInfo?.averageCycleLength || 28;

      let changed = false;

      // 若没有任何周期，尝试根据日记录推断
      if (!cycles || cycles.length === 0) {
        const dayRecords = await FertilityStorage.getDayRecords();
        const startDates = Object.values(dayRecords || {})
          .filter(r => r && r.menstrual && r.menstrual.isStart)
          .map(r => r.menstrual.date || r.date)
          .filter(Boolean)
          .sort((a, b) => new Date(a) - new Date(b));

        if (startDates.length > 0) {
          cycles = startDates.map(d => ({
            id: this.generateId(),
            startDate: d,
            isComplete: false,
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          }));
          changed = true;
        }
      }

      if (cycles && cycles.length > 0) {
        // 1) 按开始日期排序
        cycles.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        // 2) 规范化周期结束日期：优先使用“下个周期开始前一天”，最后一个周期用平均长度预测
        for (let i = 0; i < cycles.length; i++) {
          const current = cycles[i];
          const next = cycles[i + 1];
          if (next && next.startDate) {
            const expectedEnd = DateUtils.subtractDays(next.startDate, 1);
            if (current.endDate !== expectedEnd) {
              current.endDate = expectedEnd;
              current.length = DateUtils.getDaysDifference(current.startDate, current.endDate) + 1;
              current.updatedAt = DateUtils.formatISO(new Date());
              changed = true;
            }
          } else {
            // 最后一个周期：若无结束日期，按平均长度补齐
            if (!current.endDate) {
              current.endDate = DateUtils.addDays(current.startDate, averageCycleLength - 1);
              current.length = averageCycleLength;
              current.updatedAt = DateUtils.formatISO(new Date());
              changed = true;
            }
          }
        }

        // 3) 根据平均周期长度，自动生成后续周期直到覆盖今天
        let last = cycles[cycles.length - 1];
        while (new Date(today) > new Date(last.endDate)) {
          const nextStart = DateUtils.addDays(last.startDate, averageCycleLength);
          const nextEnd = DateUtils.addDays(nextStart, averageCycleLength - 1);
          const newCycle = {
            id: this.generateId(),
            startDate: nextStart,
            endDate: nextEnd,
            length: averageCycleLength,
            isComplete: false,
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          };
          cycles.push(newCycle);
          last = newCycle;
          changed = true;
        }
      }

      if (changed) {
        await FertilityStorage.saveCycles(cycles);
        this.clearCache('cycles');
      }
    } catch (error) {
      console.warn('ensureCyclesUpToCurrentDate 执行失败（不影响主流程）:', error);
    }
  }

  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * 初始化数据
   */
  async initializeData() {
    try {
      // 检查数据版本
      await this.checkDataVersion();
      
      // 初始化默认数据
      await this.initializeDefaultData();
      
      console.log('数据管理器初始化完成');
    } catch (error) {
      console.error('数据管理器初始化失败:', error);
    }
  }

  /**
   * 检查数据版本
   */
  async checkDataVersion() {
    const currentVersion = '1.0.0';
    const storedVersion = await StorageManager.getItem(STORAGE_KEYS.APP_VERSION);
    
    if (!storedVersion || storedVersion !== currentVersion) {
      // 执行数据迁移
      await this.migrateData(storedVersion, currentVersion);
      await StorageManager.setItem(STORAGE_KEYS.APP_VERSION, currentVersion);
    }
  }

  /**
   * 数据迁移
   */
  async migrateData(fromVersion, toVersion) {
    console.log(`数据迁移: ${fromVersion || '未知'} -> ${toVersion}`);
    
    if (!fromVersion) {
      // 首次安装，无需迁移
      return;
    }

    // 兼容旧的经量记录（flow -> padCount）
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      let changed = false;
      for (const [date, record] of Object.entries(dayRecords)) {
        if (record.menstrual) {
          const m = record.menstrual;
          if (m.flow && m.padCount === undefined) {
            const map = { none: 0, light: 1, medium: 2, heavy: 3 };
            m.padCount = map[m.flow] ?? 0;
            delete m.flow;
            changed = true;
          }
        }
      }
      if (changed) {
        await FertilityStorage.saveDayRecords(dayRecords);
      }
    } catch (e) {
      console.warn('经量数据迁移失败（可忽略）:', e);
    }
  }

  /**
   * 初始化默认数据
   */
  async initializeDefaultData() {
    // 检查并初始化用户设置
    const userSettings = await FertilityStorage.getUserSettings();
    if (!userSettings) {
      const defaultSettings = {
        id: this.generateId(),
        personalInfo: {
          averageCycleLength: 28,
          averageLutealPhase: 14,
        },
        reminders: {
          morningTemperature: {
            enabled: true,
            time: '07:00',
          },
          fertileWindow: {
            enabled: true,
            daysBeforeOvulation: 3,
          },
          periodPrediction: {
            enabled: true,
            daysBeforePeriod: 2,
          },
        },
        preferences: {
          temperatureUnit: 'celsius',
          theme: 'light',
          language: 'zh-CN',
        },
        privacy: {
          enableAnalytics: false,
          enableDataExport: true,
        },
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date()),
      };
      
      await FertilityStorage.saveUserSettings(defaultSettings);
    }

    // 初始化空的日记录
    const dayRecords = await FertilityStorage.getDayRecords();
    if (!dayRecords || Object.keys(dayRecords).length === 0) {
      await FertilityStorage.saveDayRecords({});
    }

    // 初始化空的周期数据
    const cycles = await FertilityStorage.getCycles();
    if (!cycles || cycles.length === 0) {
      await FertilityStorage.saveCycles([]);
    }
  }

  /**
   * 兼容并规范化月经记录（flow -> padCount）
   */
  normalizeMenstrualRecord(record) {
    if (!record) return null;
    if (typeof record.padCount === 'number') return record;
    // flow 映射
    const map = { none: 0, light: 1, medium: 2, heavy: 3 };
    const padCount = map[record.flow] ?? 0;
    const normalized = {
      date: record.date,
      padCount,
      color: record.color,
      isStart: !!record.isStart,
      isEnd: !!record.isEnd,
      note: record.note,
    };
    return normalized;
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 缓存管理
   */
  setCache(key, data) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  getCache(key) {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  clearCache(key) {
    if (key) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * 保存体温记录
   */
  async saveTemperatureRecord(record) {
    try {
      // 数据验证
      const validation = this.validateTemperatureRecord(record);

      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validation.errors,
          },
        };
      }

      // 创建完整的记录
      const fullRecord = {
        ...record,
        id: this.generateId(),
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date()),
      };

      // 获取当天记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[record.date] || { date: record.date };

      // 更新体温记录
      dayRecord.temperature = fullRecord;

      // 保存到存储
      dayRecords[record.date] = dayRecord;
      await FertilityStorage.saveDayRecords(dayRecords);

      // 清除相关缓存
      this.clearCache(`dayRecord_${record.date}`);
      this.clearCache('allDayRecords');

      return {
        success: true,
        data: fullRecord,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: '保存体温记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 验证体温记录
   */
  validateTemperatureRecord(record) {
    const errors = {};
    let valid = true;

    // 验证日期
    const dateValidation = Validator.validateDate(record.date);
    if (!dateValidation.valid) {
      errors.date = dateValidation.message;
      valid = false;
    }

    // 验证时间
    const timeValidation = Validator.validateTime(record.time);
    if (!timeValidation.valid) {
      errors.time = timeValidation.message;
      valid = false;
    }

    // 验证体温
    const tempValidation = Validator.validateTemperature(record.temperature);
    if (!tempValidation.valid) {
      errors.temperature = tempValidation.message;
      valid = false;
    }

    // 验证备注
    if (record.note) {
      const noteValidation = Validator.validateNote(record.note);
      if (!noteValidation.valid) {
        errors.note = noteValidation.message;
        valid = false;
      }
    }

    return { valid, errors };
  }

  /**
   * 保存月经记录
   */
  async saveMenstrualRecord(record) {
    try {
      // 数据验证（兼容旧数据结构）
      const normalized = this.normalizeMenstrualRecord(record);
      const validation = this.validateMenstrualRecord(normalized);

      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validation.errors,
          },
        };
      }

      // 获取当天记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[normalized.date] || { date: normalized.date };

      // 如果是"无月经"，保存无月经的标记记录
      if (normalized.padCount === 0) {
        const fullRecord = {
          ...normalized,
          id: this.generateId(),
          createdAt: DateUtils.formatISO(new Date()),
          updatedAt: DateUtils.formatISO(new Date()),
        };

        // 保存"无月经"记录
        dayRecord.menstrual = fullRecord;
        dayRecords[normalized.date] = dayRecord;
      } else {
        // 创建完整的记录
        const fullRecord = {
          ...normalized,
          id: this.generateId(),
          createdAt: DateUtils.formatISO(new Date()),
          updatedAt: DateUtils.formatISO(new Date()),
        };

        // 更新月经记录
        dayRecord.menstrual = fullRecord;

        // 保存到存储
        dayRecords[normalized.date] = dayRecord;

        // 如果是经期开始或结束，更新周期数据
        if (normalized.isStart || normalized.isEnd) {
          await this.updateMenstrualCycles(fullRecord);
        }
      }

      // 保存数据
      await FertilityStorage.saveDayRecords(dayRecords);

      // 清除相关缓存
      this.clearCache(`dayRecord_${normalized.date}`);
      this.clearCache('allDayRecords');
      this.clearCache('cycles');

      return {
        success: true,
        data: normalized.padCount === 0 ? null : normalized,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: '保存月经记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 验证月经记录
   */
  validateMenstrualRecord(record) {
    const errors = {};
    let valid = true;

    // 验证日期
    const dateValidation = Validator.validateDate(record.date);
    if (!dateValidation.valid) {
      errors.date = dateValidation.message;
      valid = false;
    }

    // 验证经量（padCount + color）
    const menValidation = Validator.validateMenstrualRecord({ padCount: record.padCount, color: record.color });
    if (!menValidation.valid) {
      errors.menstrual = menValidation.message;
      valid = false;
    }

    // 验证备注
    if (record.note) {
      const noteValidation = Validator.validateNote(record.note);
      if (!noteValidation.valid) {
        errors.note = noteValidation.message;
        valid = false;
      }
    }

    return { valid, errors };
  }

  /**
   * 保存同房记录
   */
  async saveIntercourseRecord(record) {
    try {
      // 数据验证
      const validation = this.validateIntercourseRecord(record);

      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '数据验证失败',
            details: validation.errors,
          },
        };
      }

      // 创建完整的记录
      const fullRecord = {
        ...record,
        id: this.generateId(),
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date()),
      };

      // 获取当天记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[record.date] || { date: record.date };

      // 检查是否已有同房记录
      if (!dayRecord.intercourse) {
        dayRecord.intercourse = [];
      }

      // 检查是否是编辑现有记录（如果当天已有记录，则替换而不是添加）
      const existingRecords = dayRecord.intercourse.filter(item => item.type !== 'none');
      
      if (existingRecords.length > 0) {
        // 如果已有同房记录，替换第一条记录，保持只有一条有效记录
        const recordIndex = dayRecord.intercourse.findIndex(item => item.type !== 'none');
        if (recordIndex !== -1) {
          dayRecord.intercourse[recordIndex] = fullRecord;
        } else {
          dayRecord.intercourse.push(fullRecord);
        }
      } else {
        // 如果没有同房记录，直接添加
        dayRecord.intercourse.push(fullRecord);
      }

      // 保存到存储
      dayRecords[record.date] = dayRecord;
      await FertilityStorage.saveDayRecords(dayRecords);

      // 清除相关缓存
      this.clearCache(`dayRecord_${record.date}`);
      this.clearCache('allDayRecords');

      return {
        success: true,
        data: fullRecord,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: '保存同房记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 验证同房记录
   */
  validateIntercourseRecord(record) {
    const errors = {};
    let valid = true;

    // 验证日期
    const dateValidation = Validator.validateDate(record.date);
    if (!dateValidation.valid) {
      errors.date = dateValidation.message;
      valid = false;
    }

    // 验证时间
    const timeValidation = Validator.validateTime(record.time);
    if (!timeValidation.valid) {
      errors.time = timeValidation.message;
      valid = false;
    }

    // 验证备注
    if (record.note) {
      const noteValidation = Validator.validateNote(record.note);
      if (!noteValidation.valid) {
        errors.note = noteValidation.message;
        valid = false;
      }
    }

    return { valid, errors };
  }

  /**
   * 保存无同房记录
   */
  async saveNoIntercourseRecord(record) {
    try {
      // 创建完整的记录
      const fullRecord = {
        ...record,
        id: this.generateId(),
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date()),
      };

      // 获取当天记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[record.date] || { date: record.date };

      // 保存无同房标记（替换所有同房记录为无同房标记）
      dayRecord.intercourse = [fullRecord];

      // 保存到存储
      dayRecords[record.date] = dayRecord;
      await FertilityStorage.saveDayRecords(dayRecords);

      // 清除相关缓存
      this.clearCache(`dayRecord_${record.date}`);
      this.clearCache('allDayRecords');

      return {
        success: true,
        data: fullRecord,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SAVE_ERROR',
          message: '保存无同房记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 获取指定日期的记录
   */
  async getDayRecord(date) {
    try {
      // 先检查缓存
      const cacheKey = `dayRecord_${date}`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // 从存储获取
      const dayRecords = await FertilityStorage.getDayRecords();
      const record = dayRecords[date] || null;

      // 设置缓存
      if (record) {
        this.setCache(cacheKey, record);
      }

      return {
        success: true,
        data: record,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ERROR',
          message: '获取日记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 获取日期范围内的记录
   */
  async getDayRecordsInRange(startDate, endDate) {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const dateRange = DateUtils.getDateRange(startDate, endDate);
      
      const records = [];
      dateRange.forEach(date => {
        if (dayRecords[date]) {
          records.push(dayRecords[date]);
        }
      });

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_ERROR',
          message: '获取日期范围记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 删除记录
   */
  async deleteRecord(date, type, recordId) {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[date];

      if (!dayRecord) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '记录不存在',
          },
        };
      }

      // 根据类型删除相应记录
      switch (type) {
        case 'temperature':
          delete dayRecord.temperature;
          break;
        case 'menstrual':
          delete dayRecord.menstrual;
          break;
        case 'intercourse':
          if (recordId && dayRecord.intercourse) {
            dayRecord.intercourse = dayRecord.intercourse.filter(record => record.id !== recordId);
            if (dayRecord.intercourse.length === 0) {
              delete dayRecord.intercourse;
            }
          } else {
            delete dayRecord.intercourse;
          }
          break;
        case 'symptoms':
          delete dayRecord.symptoms;
          break;
      }

      // 如果当天没有任何记录，删除整个日记录
      const hasAnyRecord = dayRecord.temperature || dayRecord.menstrual || 
                          (dayRecord.intercourse && dayRecord.intercourse.length > 0) || 
                          dayRecord.symptoms;

      if (!hasAnyRecord) {
        delete dayRecords[date];
      } else {
        dayRecords[date] = dayRecord;
      }

      // 保存到存储
      await FertilityStorage.saveDayRecords(dayRecords);

      // 清除缓存
      this.clearCache(`dayRecord_${date}`);
      this.clearCache('allDayRecords');

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: '删除记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 更新月经周期数据
   */
  async updateMenstrualCycles(record) {
    const cycles = await FertilityStorage.getCycles();
    
    if (record.isStart) {
      // 经期开始，创建新周期
      const newCycle = {
        id: this.generateId(),
        startDate: record.date,
        isComplete: false,
        averageTemperature: {
          follicular: 0,
          luteal: 0,
        },
      };
      
      cycles.push(newCycle);
    } else if (record.isEnd) {
      // 经期结束，更新最近的周期
      const latestCycle = cycles[cycles.length - 1];
      if (latestCycle && !latestCycle.endDate) {
        latestCycle.endDate = record.date;
        latestCycle.length = DateUtils.getDaysDifference(latestCycle.startDate, record.date) + 1;
        
        // 如果有下一个周期的开始日期，标记为完整周期
        if (cycles.length > 1) {
          const previousCycle = cycles[cycles.length - 2];
          if (previousCycle && !previousCycle.isComplete) {
            previousCycle.isComplete = true;
            previousCycle.length = DateUtils.getDaysDifference(previousCycle.startDate, latestCycle.startDate);
          }
        }
      }
    }
    
    await FertilityStorage.saveCycles(cycles);
  }
}

module.exports = {
  DataManager
};