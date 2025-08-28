/**
 * 边界条件和数据完整性测试扩展
 * 扩展现有boundary.test.js，专注于数据一致性相关的边界场景
 */
const { TestUtils, TestDataFactory } = require('./TestUtils.js');
const { DataManager } = require('../../utils/dataManager.js');
const { FertilityStorage } = require('../../utils/storage.js');
const { DateUtils } = require('../../utils/date.js');

describe('数据一致性边界条件测试', () => {
  let dataManager;

  beforeEach(async () => {
    await TestUtils.clearAllStorage();
    dataManager = DataManager.getInstance();
    await TestDataFactory.setupTestEnvironment();
  });

  afterEach(async () => {
    await TestUtils.cleanupTestData();
  });

  describe('数据量边界测试', () => {
    test('大量历史数据下的页面数据一致性', async () => {
      // 生成2年历史数据
      const historicalData = TestDataFactory.generateLargeDataset(730);
      
      // 保存大量数据
      const dayRecords = {};
      historicalData.temperatures.forEach(temp => {
        if (!dayRecords[temp.date]) {
          dayRecords[temp.date] = { date: temp.date };
        }
        dayRecords[temp.date].temperature = temp;
      });
      
      await FertilityStorage.saveDayRecords(dayRecords);
      
      // 测试不同页面加载大量数据的一致性
      const testDate = DateUtils.subtractDays(DateUtils.getToday(), 365);
      const endDate = DateUtils.getToday();
      
      // 模拟首页加载最近数据
      const indexData = await dataManager.getDayRecord(testDate);
      
      // 模拟图表页加载范围数据
      const chartData = await dataManager.getDayRecordsInRange(
        DateUtils.subtractDays(testDate, 30),
        DateUtils.addDays(testDate, 30)
      );
      
      // 验证数据一致性
      expect(indexData.success).toBe(true);
      expect(chartData.success).toBe(true);
      
      if (indexData.data && chartData.data) {
        const chartRecord = chartData.data.find(record => record.date === testDate);
        if (chartRecord) {
          await TestUtils.verifyDataConsistency(
            '大量数据一致性',
            indexData.data,
            chartRecord
          );
        }
      }
    });

    test('存储空间临界状态数据一致性', async () => {
      // 模拟存储空间接近上限
      const largeDataCount = 1000;
      const testDate = DateUtils.getToday();
      
      // 创建大量记录
      for (let i = 0; i < largeDataCount; i++) {
        const date = DateUtils.subtractDays(testDate, i);
        await dataManager.saveTemperatureRecord({
          date,
          temperature: 36.5 + Math.random() * 0.5,
          time: '07:30',
          note: `大量数据测试-${i}`
        });
      }
      
      // 验证最新数据的一致性
      const recentData = await dataManager.getDayRecord(testDate);
      expect(recentData.success).toBe(true);
      expect(recentData.data.temperature).toBeDefined();
      
      // 验证历史数据的一致性
      const oldDate = DateUtils.subtractDays(testDate, 999);
      const oldData = await dataManager.getDayRecord(oldDate);
      expect(oldData.success).toBe(true);
      
      console.log(`存储了 ${largeDataCount} 条记录，数据一致性验证通过`);
    });

    test('内存使用边界下的缓存一致性', async () => {
      const initialMemory = TestUtils.getMemoryUsage();
      
      // 创建大量缓存项
      const cacheTestCount = 200;
      for (let i = 0; i < cacheTestCount; i++) {
        const date = DateUtils.subtractDays(DateUtils.getToday(), i);
        await dataManager.getDayRecord(date); // 触发缓存
      }
      
      const midMemory = TestUtils.getMemoryUsage();
      const memoryGrowth = midMemory.used - initialMemory.used;
      
      // 验证内存增长在合理范围内
      expect(memoryGrowth).toBeLessThan(2000); // 小于2MB
      
      // 验证缓存数据一致性
      const testDate = DateUtils.subtractDays(DateUtils.getToday(), 50);
      const cachedData1 = await dataManager.getDayRecord(testDate);
      const cachedData2 = await dataManager.getDayRecord(testDate);
      
      await TestUtils.verifyDataConsistency(
        '内存边界缓存一致性',
        cachedData1.data,
        cachedData2.data
      );
      
      console.log(`内存增长: ${memoryGrowth}KB`);
    });
  });

  describe('时间边界测试', () => {
    test('跨年数据一致性', async () => {
      const yearEndDate = '2024-12-31';
      const yearStartDate = '2025-01-01';
      
      // 在年末和年初分别创建数据
      await dataManager.saveTemperatureRecord({
        date: yearEndDate,
        temperature: 36.8,
        time: '07:30',
        note: '年末记录'
      });
      
      await dataManager.saveTemperatureRecord({
        date: yearStartDate,
        temperature: 36.9,
        time: '07:30',
        note: '年初记录'
      });
      
      // 验证跨年数据获取一致性
      const yearEndData = await dataManager.getDayRecord(yearEndDate);
      const yearStartData = await dataManager.getDayRecord(yearStartDate);
      
      expect(yearEndData.success).toBe(true);
      expect(yearStartData.success).toBe(true);
      expect(yearEndData.data.temperature.note).toBe('年末记录');
      expect(yearStartData.data.temperature.note).toBe('年初记录');
      
      // 验证跨年范围查询
      const crossYearData = await dataManager.getDayRecordsInRange(yearEndDate, yearStartDate);
      expect(crossYearData.success).toBe(true);
      expect(crossYearData.data.length).toBe(2);
    });

    test('闰年二月数据一致性', async () => {
      const leapYearFeb28 = '2024-02-28';
      const leapYearFeb29 = '2024-02-29';
      const leapYearMar01 = '2024-03-01';
      
      // 在闰年二月关键日期创建数据
      const testDates = [leapYearFeb28, leapYearFeb29, leapYearMar01];
      
      for (let i = 0; i < testDates.length; i++) {
        await dataManager.saveTemperatureRecord({
          date: testDates[i],
          temperature: 36.5 + i * 0.1,
          time: '07:30',
          note: `闰年测试-${testDates[i]}`
        });
      }
      
      // 验证闰年数据处理一致性
      const rangeData = await dataManager.getDayRecordsInRange(leapYearFeb28, leapYearMar01);
      expect(rangeData.success).toBe(true);
      expect(rangeData.data.length).toBe(3);
      
      // 验证2月29日数据正确处理
      const feb29Data = rangeData.data.find(record => record.date === leapYearFeb29);
      expect(feb29Data).toBeDefined();
      expect(feb29Data.temperature.temperature).toBe(36.6);
    });

    test('夏令时调整数据一致性', async () => {
      // 模拟夏令时调整前后的数据
      const dstBefore = '2024-03-10'; // 假设的夏令时开始前
      const dstAfter = '2024-03-11';  // 假设的夏令时开始后
      
      // 在时间调整前后创建数据
      await dataManager.saveTemperatureRecord({
        date: dstBefore,
        temperature: 36.8,
        time: '07:30',
        note: '夏令时前'
      });
      
      await dataManager.saveTemperatureRecord({
        date: dstAfter,
        temperature: 36.9,
        time: '07:30',
        note: '夏令时后'
      });
      
      // 验证时间调整不影响数据一致性
      const beforeData = await dataManager.getDayRecord(dstBefore);
      const afterData = await dataManager.getDayRecord(dstAfter);
      
      expect(beforeData.success).toBe(true);
      expect(afterData.success).toBe(true);
      expect(beforeData.data.temperature.note).toBe('夏令时前');
      expect(afterData.data.temperature.note).toBe('夏令时后');
    });
  });

  describe('数据完整性约束测试', () => {
    test('数据删除后关联数据一致性', async () => {
      const testDate = '2025-01-15';
      
      // 创建完整的一天数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        temperature: 36.8,
        time: '07:30'
      });
      
      await dataManager.saveMenstrualRecord({
        date: testDate,
        padCount: 3,
        color: 'red',
        isStart: true
      });
      
      await dataManager.saveIntercourseRecord({
        date: testDate,
        time: '22:00',
        hasProtection: false
      });
      
      // 验证数据完整
      let dayRecord = await dataManager.getDayRecord(testDate);
      expect(dayRecord.data.temperature).toBeDefined();
      expect(dayRecord.data.menstrual).toBeDefined();
      expect(dayRecord.data.intercourse).toBeDefined();
      
      // 删除体温记录
      await dataManager.deleteRecord(testDate, 'temperature');
      
      // 验证删除后数据一致性
      dayRecord = await dataManager.getDayRecord(testDate);
      expect(dayRecord.data.temperature).toBeUndefined();
      expect(dayRecord.data.menstrual).toBeDefined(); // 其他数据应保留
      expect(dayRecord.data.intercourse).toBeDefined();
      
      // 验证缓存同步
      const cachedRecord = await dataManager.getDayRecord(testDate);
      expect(cachedRecord.data.temperature).toBeUndefined();
    });

    test('周期边界数据完整性', async () => {
      const cycle1Start = '2025-01-01';
      const cycle1End = '2025-01-28';
      const cycle2Start = '2025-01-29';
      
      // 创建跨周期的数据
      await dataManager.saveMenstrualRecord({
        date: cycle1Start,
        padCount: 3,
        color: 'red',
        isStart: true
      });
      
      await dataManager.saveMenstrualRecord({
        date: cycle2Start,
        padCount: 2,
        color: 'red',
        isStart: true
      });
      
      // 触发周期计算
      await dataManager.ensureCyclesUpToCurrentDate();
      
      // 验证周期数据完整性
      const cycles = await FertilityStorage.getCycles();
      expect(cycles).toBeDefined();
      expect(cycles.length).toBeGreaterThan(0);
      
      // 验证周期边界数据归属正确
      const cycle1Data = await dataManager.getDayRecord(cycle1Start);
      const cycle2Data = await dataManager.getDayRecord(cycle2Start);
      
      expect(cycle1Data.success).toBe(true);
      expect(cycle2Data.success).toBe(true);
      expect(cycle1Data.data.menstrual.isStart).toBe(true);
      expect(cycle2Data.data.menstrual.isStart).toBe(true);
    });

    test('数据类型转换完整性', async () => {
      const testDate = '2025-01-15';
      
      // 测试各种数据类型的完整性
      const testCases = [
        {
          type: 'temperature',
          data: {
            date: testDate,
            temperature: 36.85, // 浮点数
            time: '07:30',
            note: '包含特殊字符: 测试"引号"和换行\n内容'
          }
        },
        {
          type: 'menstrual',
          data: {
            date: testDate,
            padCount: 3,
            color: 'red',
            isStart: true,
            note: 'Unicode测试: 🌡️💊🩸'
          }
        }
      ];
      
      for (const testCase of testCases) {
        // 保存数据
        let result;
        if (testCase.type === 'temperature') {
          result = await dataManager.saveTemperatureRecord(testCase.data);
        } else if (testCase.type === 'menstrual') {
          result = await dataManager.saveMenstrualRecord(testCase.data);
        }
        
        expect(result.success).toBe(true);
        
        // 验证数据完整性
        const retrieved = await dataManager.getDayRecord(testDate);
        expect(retrieved.success).toBe(true);
        
        const retrievedData = retrieved.data[testCase.type];
        expect(retrievedData).toBeDefined();
        
        // 验证特殊字符和数据类型保持完整
        if (testCase.type === 'temperature') {
          expect(typeof retrievedData.temperature).toBe('number');
          expect(retrievedData.temperature).toBe(36.85);
          expect(retrievedData.note).toContain('测试"引号"');
          expect(retrievedData.note).toContain('换行\n内容');
        } else if (testCase.type === 'menstrual') {
          expect(retrievedData.note).toContain('🌡️💊🩸');
        }
      }
    });
  });

  describe('异常恢复测试', () => {
    test('存储失败后数据一致性恢复', async () => {
      const testDate = '2025-01-15';
      
      // 正常保存数据
      await dataManager.saveTemperatureRecord({
        date: testDate,
        temperature: 36.8,
        time: '07:30',
        note: '正常记录'
      });
      
      // 验证数据存在
      let result = await dataManager.getDayRecord(testDate);
      expect(result.success).toBe(true);
      expect(result.data.temperature.note).toBe('正常记录');
      
      // 模拟存储API失败（通过直接修改存储）
      try {
        const dayRecords = await FertilityStorage.getDayRecords();
        if (dayRecords[testDate]) {
          delete dayRecords[testDate];
          await FertilityStorage.saveDayRecords(dayRecords);
        }
      } catch (error) {
        // 忽略错误，继续测试
      }
      
      // 清除缓存，强制从存储重新加载
      if (dataManager.clearCache) {
        dataManager.clearCache(`dayRecord_${testDate}`);
      }
      
      // 验证数据恢复一致性
      result = await dataManager.getDayRecord(testDate);
      // 由于数据被删除，应该返回空数据
      expect(result.success).toBe(true);
      expect(result.data.temperature).toBeUndefined();
    });

    test('网络异常恢复后数据同步', async () => {
      const testDate = '2025-01-15';
      
      // 创建离线数据（模拟）
      const offlineData = {
        date: testDate,
        temperature: 36.8,
        time: '07:30',
        note: '离线创建',
        offline: true
      };
      
      // 模拟网络恢复后的数据同步
      const result = await dataManager.saveTemperatureRecord(offlineData);
      expect(result.success).toBe(true);
      
      // 验证数据同步一致性
      const syncedData = await dataManager.getDayRecord(testDate);
      expect(syncedData.success).toBe(true);
      expect(syncedData.data.temperature.note).toBe('离线创建');
    });
  });

  describe('性能边界测试', () => {
    test('极限数据量下的响应时间', async () => {
      const extremeDataCount = 5000;
      const testDate = DateUtils.getToday();
      
      console.log(`开始极限数据量测试: ${extremeDataCount} 条记录`);
      
      // 创建极大量数据
      const startTime = Date.now();
      for (let i = 0; i < extremeDataCount; i++) {
        const date = DateUtils.subtractDays(testDate, i);
        await dataManager.saveTemperatureRecord({
          date,
          temperature: 36.5 + Math.random() * 0.5,
          time: '07:30',
          note: `极限测试-${i}`
        });
        
        // 每1000条记录输出进度
        if (i % 1000 === 0) {
          console.log(`已创建 ${i} 条记录...`);
        }
      }
      
      const creationTime = Date.now() - startTime;
      console.log(`创建 ${extremeDataCount} 条记录耗时: ${creationTime}ms`);
      
      // 测试读取性能
      const readStartTime = Date.now();
      const result = await dataManager.getDayRecord(testDate);
      const readTime = Date.now() - readStartTime;
      
      expect(result.success).toBe(true);
      expect(readTime).toBeLessThan(1000); // 读取时间小于1秒
      
      console.log(`极限数据量下单条记录读取时间: ${readTime}ms`);
    });
  });
});

module.exports = {};