/**
 * 数据统一性测试工具类
 * 提供测试数据工厂、环境管理、验证工具等
 */
const { DataManager } = require('../../utils/dataManager.js');
const { FertilityStorage } = require('../../utils/storage.js');
const { DateUtils } = require('../../utils/date.js');

class TestUtils {
  /**
   * 清空所有存储数据
   */
  static async clearAllStorage() {
    try {
      // 清理微信小程序存储
      if (typeof wx !== 'undefined' && wx.clearStorageSync) {
        wx.clearStorageSync();
      } else {
        // 模拟环境下的清理
        global.mockStorage = {};
      }
      
      // 重置DataManager实例
      DataManager.resetInstance && DataManager.resetInstance();
      
      console.log('测试环境清理完成');
    } catch (error) {
      console.error('清理测试环境失败:', error);
    }
  }

  /**
   * 设置测试环境
   */
  static async setupTestEnvironment() {
    // 初始化默认用户设置
    const defaultSettings = {
      id: 'test_user_settings',
      personalInfo: {
        averageCycleLength: 28,
        averageLutealPhase: 14,
      },
      reminders: {
        morningTemperature: {
          enabled: true,
          time: '07:00',
        }
      },
      preferences: {
        temperatureUnit: 'celsius',
        theme: 'light'
      },
      nickname: '测试用户',
      avatar: '/images/default-avatar.png',
      createdAt: DateUtils.formatISO(new Date()),
      updatedAt: DateUtils.formatISO(new Date())
    };

    await FertilityStorage.saveUserSettings(defaultSettings);
    console.log('测试环境设置完成');
  }

  /**
   * 清理测试数据
   */
  static async cleanupTestData() {
    await this.clearAllStorage();
  }

  /**
   * 生成随机ID
   */
  static generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 验证数据一致性
   */
  static async verifyDataConsistency(testName, expectedData, actualData) {
    const errors = [];
    
    // 深度比较数据
    const compareObjects = (expected, actual, path = '') => {
      if (typeof expected !== typeof actual) {
        errors.push(`${path}: 类型不匹配 - 期望 ${typeof expected}, 实际 ${typeof actual}`);
        return;
      }
      
      if (expected === null || actual === null) {
        if (expected !== actual) {
          errors.push(`${path}: 值不匹配 - 期望 ${expected}, 实际 ${actual}`);
        }
        return;
      }
      
      if (typeof expected === 'object') {
        for (const key in expected) {
          compareObjects(expected[key], actual[key], `${path}.${key}`);
        }
        for (const key in actual) {
          if (!(key in expected)) {
            errors.push(`${path}.${key}: 意外的属性`);
          }
        }
      } else if (expected !== actual) {
        errors.push(`${path}: 值不匹配 - 期望 ${expected}, 实际 ${actual}`);
      }
    };
    
    compareObjects(expectedData, actualData, testName);
    
    if (errors.length > 0) {
      throw new Error(`数据一致性验证失败:\n${errors.join('\n')}`);
    }
    
    return true;
  }

  /**
   * 等待指定时间
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取内存使用情况 (模拟)
   */
  static getMemoryUsage() {
    // 在实际测试环境中，这里可以使用真实的内存检测
    return {
      used: Math.floor(Math.random() * 1000),
      total: 2048
    };
  }
}

/**
 * 测试数据工厂
 */
class TestDataFactory {
  /**
   * 生成标准周期数据
   */
  static generateStandardCycle(startDate, cycleLength = 28) {
    return {
      id: TestUtils.generateId(),
      startDate,
      endDate: DateUtils.addDays(startDate, cycleLength - 1),
      length: cycleLength,
      isComplete: false,
      createdAt: DateUtils.formatISO(new Date()),
      updatedAt: DateUtils.formatISO(new Date())
    };
  }

  /**
   * 生成体温序列
   */
  static generateTemperatureSequence(dateRange, pattern = 'normal') {
    const temperatures = [];
    const { startDate, endDate } = dateRange;
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = DateUtils.formatDate(current);
      let temperature;

      switch (pattern) {
        case 'normal':
          // 正常双相体温：前半周期36.2-36.5，后半周期36.6-37.0
          const dayOfCycle = DateUtils.getDaysDifference(startDate, dateStr) + 1;
          if (dayOfCycle <= 14) {
            temperature = 36.2 + Math.random() * 0.3;
          } else {
            temperature = 36.6 + Math.random() * 0.4;
          }
          break;
        case 'anovulation':
          // 无排卵周期：体温波动小
          temperature = 36.3 + Math.random() * 0.2;
          break;
        case 'irregular':
          // 不规律体温
          temperature = 36.0 + Math.random() * 1.0;
          break;
        default:
          temperature = 36.5;
      }

      temperatures.push({
        date: dateStr,
        temperature: Math.round(temperature * 10) / 10,
        time: '07:30',
        note: `测试数据 - ${pattern}`,
        id: TestUtils.generateId()
      });

      current.setDate(current.getDate() + 1);
    }

    return temperatures;
  }

  /**
   * 生成月经记录
   */
  static generateMenstrualRecord(date, padCount, color = 'red') {
    return {
      id: TestUtils.generateId(),
      date,
      padCount,
      color,
      isStart: false,
      isEnd: false,
      note: '测试月经记录',
      createdAt: DateUtils.formatISO(new Date()),
      updatedAt: DateUtils.formatISO(new Date())
    };
  }

  /**
   * 生成同房记录
   */
  static generateIntercourseRecord(date, hasProtection = false) {
    return {
      id: TestUtils.generateId(),
      date,
      time: '22:00',
      hasProtection,
      note: '测试同房记录',
      createdAt: DateUtils.formatISO(new Date()),
      updatedAt: DateUtils.formatISO(new Date())
    };
  }

  /**
   * 生成完整的周期测试数据
   */
  static generateCompleteCycleData(startDate, cycleLength = 28) {
    const cycle = this.generateStandardCycle(startDate, cycleLength);
    const endDate = DateUtils.addDays(startDate, cycleLength - 1);
    
    // 生成体温数据
    const temperatures = this.generateTemperatureSequence({
      startDate,
      endDate
    }, 'normal');

    // 生成月经数据（前5天）
    const menstrualRecords = [];
    for (let i = 0; i < 5; i++) {
      const date = DateUtils.addDays(startDate, i);
      menstrualRecords.push(this.generateMenstrualRecord(date, 3 - i, 'red'));
    }

    // 生成同房数据（随机几天）
    const intercourseRecords = [];
    const intercourseDays = [7, 10, 13, 15, 20];
    intercourseDays.forEach(day => {
      const date = DateUtils.addDays(startDate, day);
      intercourseRecords.push(this.generateIntercourseRecord(date));
    });

    return {
      cycle,
      temperatures,
      menstrualRecords,
      intercourseRecords
    };
  }

  /**
   * 生成大量历史数据
   */
  static generateLargeDataset(days = 730) {
    const data = {
      cycles: [],
      temperatures: [],
      menstrualRecords: [],
      intercourseRecords: []
    };

    let currentDate = DateUtils.subtractDays(DateUtils.getToday(), days);
    let cycleCount = 0;

    while (DateUtils.getDaysDifference(currentDate, DateUtils.getToday()) > 0) {
      const cycleLength = 26 + Math.floor(Math.random() * 6); // 26-31天
      const cycleData = this.generateCompleteCycleData(currentDate, cycleLength);
      
      data.cycles.push(cycleData.cycle);
      data.temperatures.push(...cycleData.temperatures);
      data.menstrualRecords.push(...cycleData.menstrualRecords);
      data.intercourseRecords.push(...cycleData.intercourseRecords);

      currentDate = DateUtils.addDays(currentDate, cycleLength);
      cycleCount++;
    }

    console.log(`生成了 ${cycleCount} 个周期的测试数据，覆盖 ${days} 天`);
    return data;
  }

  /**
   * 设置测试环境数据
   */
  static async setupTestEnvironment() {
    await TestUtils.clearAllStorage();
    await TestUtils.setupTestEnvironment();
    
    // 设置一个标准的3周期测试数据
    const testData = this.generateLargeDataset(84); // 3个月
    
    // 保存测试数据
    for (const cycle of testData.cycles) {
      await FertilityStorage.saveCycle(cycle);
    }

    const dayRecords = {};
    
    // 组织每日记录
    testData.temperatures.forEach(temp => {
      if (!dayRecords[temp.date]) {
        dayRecords[temp.date] = { date: temp.date };
      }
      dayRecords[temp.date].temperature = temp;
    });

    testData.menstrualRecords.forEach(menstrual => {
      if (!dayRecords[menstrual.date]) {
        dayRecords[menstrual.date] = { date: menstrual.date };
      }
      dayRecords[menstrual.date].menstrual = menstrual;
    });

    testData.intercourseRecords.forEach(intercourse => {
      if (!dayRecords[intercourse.date]) {
        dayRecords[intercourse.date] = { date: intercourse.date };
      }
      if (!dayRecords[intercourse.date].intercourse) {
        dayRecords[intercourse.date].intercourse = [];
      }
      dayRecords[intercourse.date].intercourse.push(intercourse);
    });

    await FertilityStorage.saveDayRecords(dayRecords);
    
    console.log('测试环境数据设置完成');
    return testData;
  }
}

module.exports = {
  TestUtils,
  TestDataFactory
};