/**
 * 并发操作测试套件
 * 测试多页面同时操作时的数据一致性和竞态条件处理
 */
const { TestUtils, TestDataFactory } = require('./TestUtils.js');
const { DataManager } = require('../../utils/dataManager.js');
const { FertilityStorage } = require('../../utils/storage.js');
const { DateUtils } = require('../../utils/date.js');

describe('并发操作测试', () => {
  let dataManager;

  beforeEach(async () => {
    await TestUtils.clearAllStorage();
    dataManager = DataManager.getInstance();
    await TestDataFactory.setupTestEnvironment();
  });

  afterEach(async () => {
    await TestUtils.cleanupTestData();
  });

  describe('多页面并发读写测试', () => {
    test('多页面同时保存记录', async () => {
      const testDate = '2025-01-15';
      
      // 模拟多个页面同时保存不同类型的记录
      const promises = [
        dataManager.saveTemperatureRecord({
          date: testDate,
          time: '07:30',
          temperature: 36.8,
          note: '并发测试-体温'
        }),
        dataManager.saveMenstrualRecord({
          date: testDate,
          padCount: 3,
          color: 'red',
          note: '并发测试-月经'
        }),
        dataManager.saveIntercourseRecord({
          date: testDate,
          time: '22:00',
          hasProtection: false,
          note: '并发测试-同房'
        })
      ];

      const results = await Promise.all(promises);
      
      // 验证所有操作成功
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
      });

      // 验证数据完整性
      const dayRecord = await dataManager.getDayRecord(testDate);
      expect(dayRecord.success).toBe(true);
      expect(dayRecord.data.temperature).toBeDefined();
      expect(dayRecord.data.menstrual).toBeDefined();
      expect(dayRecord.data.intercourse).toBeDefined();
      expect(dayRecord.data.intercourse.length).toBe(1);
    });

    test('并发读取操作一致性', async () => {
      const testDate = '2025-01-15';
      
      // 预先创建数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        temperature: 36.8,
        time: '07:30'
      });

      // 模拟多个页面同时读取数据
      const readPromises = [];
      for (let i = 0; i < 10; i++) {
        readPromises.push(dataManager.getDayRecord(testDate));
      }

      const results = await Promise.all(readPromises);
      
      // 验证所有读取结果一致
      for (let i = 1; i < results.length; i++) {
        await TestUtils.verifyDataConsistency(
          '并发读取一致性',
          results[0].data,
          results[i].data
        );
      }
    });

    test('读写并发冲突处理', async () => {
      const testDate = '2025-01-15';
      
      // 同时执行读写操作
      const operations = [
        dataManager.getDayRecord(testDate), // 读操作
        dataManager.saveTemperatureRecord({
          date: testDate,
          temperature: 36.8,
          time: '07:30'
        }), // 写操作
        dataManager.getDayRecord(testDate), // 读操作
      ];

      const results = await Promise.all(operations);
      
      // 验证读写操作都成功
      expect(results[1].success).toBe(true); // 写操作成功
      
      // 最终读取应该能获取到写入的数据
      const finalResult = await dataManager.getDayRecord(testDate);
      expect(finalResult.success).toBe(true);
      expect(finalResult.data.temperature).toBeDefined();
    });
  });

  describe('缓存并发访问测试', () => {
    test('高并发缓存访问', async () => {
      const testDate = '2025-01-15';
      
      // 预先设置数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        temperature: 36.8,
        time: '07:30'
      });

      // 高并发访问缓存
      const concurrentLevel = 50;
      const promises = [];
      
      for (let i = 0; i < concurrentLevel; i++) {
        promises.push(dataManager.getDayRecord(testDate));
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // 验证所有结果成功且一致
      for (const result of results) {
        expect(result.success).toBe(true);
        expect(result.data.temperature.temperature).toBe(36.8);
      }

      // 验证性能（缓存应该提高并发性能）
      const avgTime = (endTime - startTime) / concurrentLevel;
      expect(avgTime).toBeLessThan(50); // 平均响应时间小于50ms
    });

    test('缓存失效期间并发访问', async () => {
      const testDate = '2025-01-15';
      
      // 创建并缓存数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        temperature: 36.8,
        time: '07:30'
      });
      await dataManager.getDayRecord(testDate); // 建立缓存

      // 清除缓存，模拟缓存失效
      if (dataManager.clearCache) {
        dataManager.clearCache(`dayRecord_${testDate}`);
      }

      // 并发访问已失效的缓存
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(dataManager.getDayRecord(testDate));
      }

      const results = await Promise.all(promises);
      
      // 验证所有结果一致
      for (let i = 1; i < results.length; i++) {
        await TestUtils.verifyDataConsistency(
          '缓存失效并发访问',
          results[0].data,
          results[i].data
        );
      }
    });
  });

  describe('数据竞态条件测试', () => {
    test('同一记录并发更新', async () => {
      const testDate = '2025-01-15';
      
      // 并发更新同一天的体温记录
      const updates = [
        { temperature: 36.8, note: '更新1' },
        { temperature: 36.9, note: '更新2' },
        { temperature: 37.0, note: '更新3' }
      ];

      const promises = updates.map(update => 
        dataManager.saveTemperatureRecord({
          date: testDate,
          time: '07:30',
          ...update
        })
      );

      const results = await Promise.all(promises);
      
      // 验证所有更新操作都成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证最终数据状态一致
      const finalRecord = await dataManager.getDayRecord(testDate);
      expect(finalRecord.success).toBe(true);
      expect(finalRecord.data.temperature).toBeDefined();
      
      // 最终温度应该是其中一个更新的值
      const finalTemp = finalRecord.data.temperature.temperature;
      const validTemps = updates.map(u => u.temperature);
      expect(validTemps).toContain(finalTemp);
    });

    test('跨日期范围并发操作', async () => {
      const dates = ['2025-01-15', '2025-01-16', '2025-01-17'];
      
      // 并发操作多个日期
      const promises = dates.map((date, index) => 
        dataManager.saveTemperatureRecord({
          date,
          temperature: 36.5 + index * 0.1,
          time: '07:30',
          note: `并发测试-${date}`
        })
      );

      const results = await Promise.all(promises);
      
      // 验证所有操作成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证数据完整性
      for (let i = 0; i < dates.length; i++) {
        const record = await dataManager.getDayRecord(dates[i]);
        expect(record.success).toBe(true);
        expect(record.data.temperature.temperature).toBe(36.5 + i * 0.1);
      }
    });
  });

  describe('存储层并发测试', () => {
    test('存储API并发调用', async () => {
      const testData = {
        'key1': { value: 'data1' },
        'key2': { value: 'data2' },
        'key3': { value: 'data3' }
      };

      // 并发调用存储API
      const savePromises = Object.entries(testData).map(([key, data]) =>
        FertilityStorage.setItem(key, data)
      );

      await Promise.all(savePromises);

      // 并发读取数据
      const loadPromises = Object.keys(testData).map(key =>
        FertilityStorage.getItem(key)
      );

      const loadResults = await Promise.all(loadPromises);
      
      // 验证数据完整性
      loadResults.forEach((result, index) => {
        const key = Object.keys(testData)[index];
        expect(result).toEqual(testData[key]);
      });
    });
  });

  describe('性能压力测试', () => {
    test('高频操作性能测试', async () => {
      const operationCount = 100;
      const testDate = '2025-01-15';
      
      const operations = [];
      const startTime = Date.now();
      
      // 混合读写操作
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          // 写操作
          operations.push(
            dataManager.saveTemperatureRecord({
              date: testDate,
              temperature: 36.5 + (i % 10) * 0.1,
              time: '07:30',
              note: `压力测试-${i}`
            })
          );
        } else {
          // 读操作
          operations.push(dataManager.getDayRecord(testDate));
        }
      }
      
      const results = await Promise.all(operations);
      const endTime = Date.now();
      
      // 验证所有操作成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // 验证性能指标
      const totalTime = endTime - startTime;
      const avgTime = totalTime / operationCount;
      expect(avgTime).toBeLessThan(100); // 平均操作时间小于100ms
      
      console.log(`高频操作测试: ${operationCount}个操作耗时${totalTime}ms, 平均${avgTime.toFixed(2)}ms/操作`);
    });
  });
});

module.exports = {};