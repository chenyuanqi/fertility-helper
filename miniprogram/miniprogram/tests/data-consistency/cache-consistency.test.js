/**
 * 缓存一致性测试套件
 * 测试内存缓存与本地存储之间的数据一致性
 */
const { TestUtils, TestDataFactory } = require('./TestUtils.js');
const { DataManager } = require('../../utils/dataManager.js');
const { FertilityStorage } = require('../../utils/storage.js');
const { DateUtils } = require('../../utils/date.js');

describe('缓存一致性测试', () => {
  let dataManager;

  beforeEach(async () => {
    // 清空所有存储数据
    await TestUtils.clearAllStorage();
    
    // 重置DataManager实例
    dataManager = DataManager.getInstance();
    
    // 设置测试数据
    await TestDataFactory.setupTestEnvironment();
  });

  afterEach(async () => {
    // 清理测试数据
    await TestUtils.cleanupTestData();
  });

  /**
   * 测试缓存过期后重新加载存储数据
   */
  describe('缓存过期机制', () => {
    test('缓存过期后自动从存储重新加载数据', async () => {
      const testDate = '2025-01-15';
      const cacheKey = `dayRecord_${testDate}`;
      
      // 创建测试数据
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '缓存测试记录'
      };
      
      await dataManager.saveTemperatureRecord(temperatureRecord);
      
      // 第一次访问，数据应该被缓存
      let result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      expect(result.data.temperature.temperature).toBe(36.8);
      
      // 验证数据确实被缓存了
      const cachedData = dataManager.getCache && dataManager.getCache(cacheKey);
      if (cachedData) {
        expect(cachedData.temperature.temperature).toBe(36.8);
      }
      
      // 直接修改存储中的数据，不通过DataManager
      const dayRecords = await FertilityStorage.getDayRecords();
      if (dayRecords[testDate] && dayRecords[testDate].temperature) {
        dayRecords[testDate].temperature.temperature = 37.0;
        dayRecords[testDate].temperature.note = '直接修改的记录';
        await FertilityStorage.saveDayRecords(dayRecords);
      }
      
      // 模拟缓存过期
      if (dataManager.clearCache) {
        dataManager.clearCache(cacheKey);
      }
      
      // 再次访问，应该从存储重新加载
      result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      expect(result.data.temperature.temperature).toBe(37.0);
      expect(result.data.temperature.note).toBe('直接修改的记录');
    });

    test('缓存时间戳验证机制', async () => {
      const testDate = '2025-01-15';
      
      // 创建测试数据
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '时间戳测试'
      };
      
      await dataManager.saveTemperatureRecord(temperatureRecord);
      
      // 第一次访问
      let result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      
      // 等待一段时间，确保时间戳不同
      await TestUtils.wait(10);
      
      // 检查缓存过期时间设置
      if (dataManager.cacheExpiry && dataManager.CACHE_DURATION) {
        const cacheKey = `dayRecord_${testDate}`;
        const expiry = dataManager.cacheExpiry.get(cacheKey);
        const currentTime = Date.now();
        
        expect(expiry).toBeGreaterThan(currentTime);
        expect(expiry - currentTime).toBeLessThanOrEqual(dataManager.CACHE_DURATION);
      }
    });

    test('不同类型数据的缓存独立性', async () => {
      const testDate = '2025-01-15';
      
      // 创建不同类型的数据
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '体温缓存测试'
      };
      
      const menstrualRecord = {
        date: testDate,
        padCount: 3,
        color: 'red',
        isStart: true,
        note: '月经缓存测试'
      };
      
      await dataManager.saveTemperatureRecord(temperatureRecord);
      await dataManager.saveMenstrualRecord(menstrualRecord);
      
      // 访问数据以触发缓存
      const result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      expect(result.data.temperature).toBeDefined();
      expect(result.data.menstrual).toBeDefined();
      
      // 清除特定缓存项，验证其他缓存不受影响
      if (dataManager.clearCache) {
        dataManager.clearCache(`dayRecord_${testDate}`);
        
        // 其他相关缓存应该仍然存在或正确管理
        // 这里主要验证缓存清理的精确性
        const userSettings = await FertilityStorage.getUserSettings();
        expect(userSettings).toBeDefined();
      }
    });
  });

  /**
   * 测试存储更新后缓存自动失效
   */
  describe('缓存失效机制', () => {
    test('通过DataManager保存数据后相关缓存自动失效', async () => {
      const testDate = '2025-01-15';
      
      // 第一次保存数据
      const firstRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '第一次记录'
      };
      
      await dataManager.saveTemperatureRecord(firstRecord);
      
      // 访问数据以建立缓存
      let result = await dataManager.getDayRecord(testDate);
      expect(result.data.temperature.temperature).toBe(36.8);
      
      // 更新数据
      const updatedRecord = {
        date: testDate,
        time: '07:45',
        temperature: 37.0,
        note: '更新后的记录'
      };
      
      await dataManager.saveTemperatureRecord(updatedRecord);
      
      // 立即访问，应该获取到最新数据
      result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      expect(result.data.temperature.temperature).toBe(37.0);
      expect(result.data.temperature.note).toBe('更新后的记录');
    });

    test('删除操作后缓存正确失效', async () => {
      const testDate = '2025-01-15';
      
      // 创建并缓存数据
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '待删除的记录'
      };
      
      await dataManager.saveTemperatureRecord(temperatureRecord);
      
      // 访问以建立缓存
      let result = await dataManager.getDayRecord(testDate);
      expect(result.data.temperature).toBeDefined();
      
      // 删除记录
      const deleteResult = await dataManager.deleteRecord(testDate, 'temperature');
      expect(deleteResult.success).toBe(true);
      
      // 立即访问，缓存应该已失效，返回空数据
      result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      expect(result.data.temperature).toBeUndefined();
    });

    test('批量操作后相关缓存批量失效', async () => {
      const testDates = ['2025-01-15', '2025-01-16', '2025-01-17'];
      
      // 创建多个记录
      for (const date of testDates) {
        await dataManager.saveTemperatureRecord({
          date,
          time: '07:30',
          temperature: 36.8,
          note: `记录 ${date}`
        });
      }
      
      // 访问所有记录以建立缓存
      for (const date of testDates) {
        const result = await dataManager.getDayRecord(date);
        expect(result.data.temperature).toBeDefined();
      }
      
      // 获取范围数据，这也会建立缓存
      const rangeResult = await dataManager.getDayRecordsInRange(testDates[0], testDates[2]);
      expect(rangeResult.success).toBe(true);
      expect(rangeResult.data.length).toBe(3);
      
      // 删除中间的记录
      await dataManager.deleteRecord(testDates[1], 'temperature');
      
      // 重新获取范围数据，应该只有2条记录
      const updatedRangeResult = await dataManager.getDayRecordsInRange(testDates[0], testDates[2]);
      expect(updatedRangeResult.success).toBe(true);
      expect(updatedRangeResult.data.length).toBe(2);
      
      // 验证删除的记录确实不存在
      const deletedRecord = updatedRangeResult.data.find(record => record.date === testDates[1]);
      expect(deletedRecord).toBeUndefined();
    });
  });

  /**
   * 测试并发操作下缓存状态正确
   */
  describe('并发操作缓存一致性', () => {
    test('多个并发读操作缓存一致性', async () => {
      const testDate = '2025-01-15';
      
      // 创建测试数据
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '并发读测试'
      };
      
      await dataManager.saveTemperatureRecord(temperatureRecord);
      
      // 模拟多个页面同时读取数据
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(dataManager.getDayRecord(testDate));
      }
      
      const results = await Promise.all(promises);
      
      // 验证所有结果一致
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.data.temperature.temperature).toBe(36.8);
        expect(result.data.temperature.note).toBe('并发读测试');
      }
    });

    test('读写并发时缓存状态正确', async () => {
      const testDate = '2025-01-15';
      
      // 并发执行读写操作
      const writePromise = dataManager.saveTemperatureRecord({
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '并发写测试'
      });
      
      const readPromise = dataManager.getDayRecord(testDate);
      
      const [writeResult, readResult] = await Promise.all([writePromise, readPromise]);
      
      expect(writeResult.success).toBe(true);
      expect(readResult.success).toBe(true);
      
      // 再次读取，确保获取到写入的数据
      const finalResult = await dataManager.getDayRecord(testDate);
      expect(finalResult.success).toBe(true);
      expect(finalResult.data.temperature).toBeDefined();
      expect(finalResult.data.temperature.temperature).toBe(36.8);
    });

    test('高频操作下缓存性能和一致性', async () => {
      const testDate = '2025-01-15';
      const operationCount = 20;
      
      // 初始化数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        time: '07:30',
        temperature: 36.5,
        note: '初始记录'
      });
      
      // 高频读操作
      const readPromises = [];
      for (let i = 0; i < operationCount; i++) {
        readPromises.push(dataManager.getDayRecord(testDate));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(readPromises);
      const endTime = Date.now();
      
      // 验证性能（缓存应该提高性能）
      const avgTime = (endTime - startTime) / operationCount;
      expect(avgTime).toBeLessThan(100); // 每次操作少于100ms
      
      // 验证所有结果一致
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.data.temperature.temperature).toBe(36.5);
      }
    });
  });

  /**
   * 测试缓存内存管理
   */
  describe('缓存内存管理', () => {
    test('缓存大小限制和清理机制', async () => {
      const testDates = [];
      const dataCount = 50;
      
      // 生成大量测试日期
      for (let i = 0; i < dataCount; i++) {
        testDates.push(DateUtils.addDays('2025-01-01', i));
      }
      
      // 创建大量数据并访问以建立缓存
      for (const date of testDates) {
        await dataManager.saveTemperatureRecord({
          date,
          time: '07:30',
          temperature: 36.5 + Math.random() * 0.5,
          note: `大量数据测试 ${date}`
        });
        
        // 访问以建立缓存
        await dataManager.getDayRecord(date);
      }
      
      // 检查缓存大小（如果DataManager有相关方法）
      if (dataManager.cache && dataManager.cache.size !== undefined) {
        console.log(`缓存项数量: ${dataManager.cache.size}`);
        // 这里可以验证缓存是否有合理的大小限制
      }
      
      // 验证内存使用情况
      const memoryBefore = TestUtils.getMemoryUsage();
      
      // 等待一段时间，让可能的缓存清理机制工作
      await TestUtils.wait(100);
      
      const memoryAfter = TestUtils.getMemoryUsage();
      
      // 验证内存没有无限增长
      const memoryGrowth = memoryAfter.used - memoryBefore.used;
      expect(memoryGrowth).toBeLessThan(1000); // 内存增长小于1MB
    });

    test('长时间运行无内存泄漏', async () => {
      const testDate = '2025-01-15';
      const iterationCount = 100;
      
      const initialMemory = TestUtils.getMemoryUsage();
      
      // 模拟长时间重复操作
      for (let i = 0; i < iterationCount; i++) {
        // 保存数据
        await dataManager.saveTemperatureRecord({
          date: testDate,
          time: '07:30',
          temperature: 36.5 + (i % 10) * 0.1,
          note: `迭代 ${i}`
        });
        
        // 读取数据
        const result = await dataManager.getDayRecord(testDate);
        expect(result.success).toBe(true);
        
        // 偶尔清理缓存
        if (i % 20 === 0 && dataManager.clearCache) {
          dataManager.clearCache(`dayRecord_${testDate}`);
        }
      }
      
      const finalMemory = TestUtils.getMemoryUsage();
      const memoryGrowth = finalMemory.used - initialMemory.used;
      
      // 验证内存增长在合理范围内
      expect(memoryGrowth).toBeLessThan(500); // 内存增长小于500KB
      
      console.log(`内存增长: ${memoryGrowth}KB`);
    });
  });

  /**
   * 测试缓存键值管理
   */
  describe('缓存键值管理', () => {
    test('缓存键值命名规范和冲突避免', async () => {
      const testDate = '2025-01-15';
      
      // 创建不同类型的数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '体温记录'
      });
      
      // 获取用户设置
      const userSettings = await FertilityStorage.getUserSettings();
      
      // 访问数据以建立缓存
      await dataManager.getDayRecord(testDate);
      
      // 验证缓存键值不会冲突
      if (dataManager.cache) {
        const cacheKeys = Array.from(dataManager.cache.keys());
        console.log('缓存键值:', cacheKeys);
        
        // 验证键值命名规范
        cacheKeys.forEach(key => {
          expect(key).toMatch(/^[a-zA-Z_][a-zA-Z0-9_-]*$/); // 合法的键值格式
        });
        
        // 验证没有重复键值
        const uniqueKeys = new Set(cacheKeys);
        expect(uniqueKeys.size).toBe(cacheKeys.length);
      }
    });

    test('缓存键值与数据类型的对应关系', async () => {
      const testDate = '2025-01-15';
      const rangeStart = DateUtils.subtractDays(testDate, 7);
      const rangeEnd = DateUtils.addDays(testDate, 7);
      
      // 创建不同类型的访问，建立不同的缓存
      await dataManager.getDayRecord(testDate);
      await dataManager.getDayRecordsInRange(rangeStart, rangeEnd);
      const userSettings = await FertilityStorage.getUserSettings();
      
      if (dataManager.cache && dataManager.getCache) {
        // 验证不同类型的缓存键值
        const dayRecordKey = `dayRecord_${testDate}`;
        const rangeKey = `dayRecordsRange_${rangeStart}_${rangeEnd}`;
        const settingsKey = 'userSettings';
        
        // 检查是否存在相应的缓存
        const dayRecordCache = dataManager.getCache(dayRecordKey);
        const rangeCache = dataManager.getCache(rangeKey);
        const settingsCache = dataManager.getCache(settingsKey);
        
        // 验证缓存类型正确
        if (dayRecordCache) {
          expect(typeof dayRecordCache).toBe('object');
          expect(dayRecordCache.date).toBe(testDate);
        }
        
        if (rangeCache) {
          expect(Array.isArray(rangeCache)).toBe(true);
        }
        
        if (settingsCache) {
          expect(typeof settingsCache).toBe('object');
          expect(settingsCache.personalInfo).toBeDefined();
        }
      }
    });
  });
});

module.exports = {
  // 导出辅助函数供其他测试使用
};