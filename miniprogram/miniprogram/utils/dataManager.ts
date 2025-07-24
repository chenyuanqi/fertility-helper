/**
 * 数据管理工具类
 * 提供统一的数据操作接口，包括增删改查、数据验证、缓存管理等
 */

import { StorageManager, FertilityStorage } from './storage';
import { DateUtils } from './date';
import { Validator } from './validator';
import {
  DayRecord,
  TemperatureRecord,
  MenstrualRecord,
  IntercourseRecord,
  SymptomRecord,
  MenstrualCycle,
  UserSettings,
  StatisticsData,
  QueryOptions,
  StatisticsOptions,
  DataOperationResult,
  STORAGE_KEYS
} from '../types/index';

export class DataManager {
  private static instance: DataManager;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 获取单例实例
   */
  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * 私有构造函数
   */
  private constructor() {
    this.initializeData();
  }

  /**
   * 初始化数据
   */
  private async initializeData(): Promise<void> {
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
  private async checkDataVersion(): Promise<void> {
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
  private async migrateData(fromVersion: string | undefined, toVersion: string): Promise<void> {
    console.log(`数据迁移: ${fromVersion || '未知'} -> ${toVersion}`);
    
    // 这里可以添加具体的数据迁移逻辑
    // 例如：字段重命名、数据结构调整等
    
    if (!fromVersion) {
      // 首次安装，无需迁移
      return;
    }
    
    // 根据版本执行相应的迁移逻辑
    // if (fromVersion === '0.9.0') {
    //   await this.migrateFrom090To100();
    // }
  }

  /**
   * 初始化默认数据
   */
  private async initializeDefaultData(): Promise<void> {
    // 检查并初始化用户设置
    const userSettings = await FertilityStorage.getUserSettings();
    if (!userSettings) {
      const defaultSettings: UserSettings = {
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
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 缓存管理
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  private getCache(key: string): any {
    const expiry = this.cacheExpiry.get(key);
    if (expiry && Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  private clearCache(key?: string): void {
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
  async saveTemperatureRecord(record: Omit<TemperatureRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataOperationResult<TemperatureRecord>> {
    try {
      // 数据验证
      const validation = Validator.validateObject(record, {
        date: Validator.validateDate,
        time: Validator.validateTime,
        temperature: Validator.validateTemperature,
        note: Validator.validateNote,
      });

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
      const fullRecord: TemperatureRecord = {
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
   * 保存月经记录
   */
  async saveMenstrualRecord(record: Omit<MenstrualRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataOperationResult<MenstrualRecord>> {
    try {
      // 数据验证
      const validation = Validator.validateObject(record, {
        date: Validator.validateDate,
        flow: Validator.validateMenstrualFlow,
        note: Validator.validateNote,
      });

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
      const fullRecord: MenstrualRecord = {
        ...record,
        id: this.generateId(),
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date()),
      };

      // 获取当天记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[record.date] || { date: record.date };

      // 更新月经记录
      dayRecord.menstrual = fullRecord;

      // 保存到存储
      dayRecords[record.date] = dayRecord;
      await FertilityStorage.saveDayRecords(dayRecords);

      // 如果是经期开始或结束，更新周期数据
      if (record.isStart || record.isEnd) {
        await this.updateMenstrualCycles(record);
      }

      // 清除相关缓存
      this.clearCache(`dayRecord_${record.date}`);
      this.clearCache('allDayRecords');
      this.clearCache('cycles');

      return {
        success: true,
        data: fullRecord,
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
   * 保存同房记录
   */
  async saveIntercourseRecord(record: Omit<IntercourseRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataOperationResult<IntercourseRecord>> {
    try {
      // 数据验证
      const validation = Validator.validateObject(record, {
        date: Validator.validateDate,
        time: Validator.validateTime,
        note: Validator.validateNote,
      });

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
      const fullRecord: IntercourseRecord = {
        ...record,
        id: this.generateId(),
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date()),
      };

      // 获取当天记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const dayRecord = dayRecords[record.date] || { date: record.date };

      // 更新同房记录（支持一天多次）
      if (!dayRecord.intercourse) {
        dayRecord.intercourse = [];
      }
      dayRecord.intercourse.push(fullRecord);

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
   * 获取指定日期的记录
   */
  async getDayRecord(date: string): Promise<DataOperationResult<DayRecord | null>> {
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
  async getDayRecordsInRange(startDate: string, endDate: string): Promise<DataOperationResult<DayRecord[]>> {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const dateRange = DateUtils.getDateRange(startDate, endDate);
      
      const records: DayRecord[] = [];
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
  async deleteRecord(date: string, type: 'temperature' | 'menstrual' | 'intercourse' | 'symptoms', recordId?: string): Promise<DataOperationResult<boolean>> {
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
  private async updateMenstrualCycles(record: MenstrualRecord): Promise<void> {
    const cycles = await FertilityStorage.getCycles();
    
    if (record.isStart) {
      // 经期开始，创建新周期或更新现有周期
      const newCycle: MenstrualCycle = {
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

  /**
   * 获取统计数据
   */
  async getStatistics(options?: StatisticsOptions): Promise<DataOperationResult<StatisticsData>> {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const cycles = await FertilityStorage.getCycles();
      
      // 计算统计数据
      const totalRecords = Object.keys(dayRecords).length;
      
      // 计算平均周期长度
      const completeCycles = cycles.filter(cycle => cycle.isComplete && cycle.length);
      const averageCycleLength = completeCycles.length > 0 
        ? completeCycles.reduce((sum, cycle) => sum + (cycle.length || 0), 0) / completeCycles.length
        : 28;

      // 计算平均体温
      const temperatureRecords = Object.values(dayRecords)
        .filter(record => record.temperature)
        .map(record => record.temperature!.temperature);
      
      const averageTemperature = temperatureRecords.length > 0
        ? temperatureRecords.reduce((sum, temp) => sum + temp, 0) / temperatureRecords.length
        : 0;

      // 计算周期规律性（简化版本）
      const cycleRegularity = completeCycles.length >= 3 
        ? this.calculateCycleRegularity(completeCycles)
        : 0;

      const statistics: StatisticsData = {
        totalRecords,
        averageCycleLength: Math.round(averageCycleLength * 10) / 10,
        averageTemperature: Math.round(averageTemperature * 100) / 100,
        fertileWindowAccuracy: 0.8, // 这里需要实际的算法计算
        cycleRegularity,
        lastUpdated: DateUtils.formatISO(new Date()),
      };

      // 保存统计数据
      await FertilityStorage.saveStatistics(statistics);

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STATISTICS_ERROR',
          message: '获取统计数据失败',
          details: error,
        },
      };
    }
  }

  /**
   * 计算周期规律性
   */
  private calculateCycleRegularity(cycles: MenstrualCycle[]): number {
    if (cycles.length < 3) return 0;

    const lengths = cycles.map(cycle => cycle.length || 0);
    const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    
    // 计算标准差
    const variance = lengths.reduce((sum, length) => sum + Math.pow(length - average, 2), 0) / lengths.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 规律性评分（标准差越小，规律性越高）
    const regularity = Math.max(0, 1 - (standardDeviation / 7)); // 7天作为基准
    
    return Math.round(regularity * 100) / 100;
  }

  /**
   * 清理历史数据
   */
  async cleanupOldData(daysToKeep: number = 365): Promise<DataOperationResult<number>> {
    try {
      const cutoffDate = DateUtils.subtractDays(DateUtils.getToday(), daysToKeep);
      const dayRecords = await FertilityStorage.getDayRecords();
      
      let deletedCount = 0;
      const updatedRecords: { [date: string]: DayRecord } = {};
      
      Object.entries(dayRecords).forEach(([date, record]) => {
        if (date >= cutoffDate) {
          updatedRecords[date] = record;
        } else {
          deletedCount++;
        }
      });

      await FertilityStorage.saveDayRecords(updatedRecords);
      
      // 清除所有缓存
      this.clearCache();

      return {
        success: true,
        data: deletedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: '清理历史数据失败',
          details: error,
        },
      };
    }
  }
}