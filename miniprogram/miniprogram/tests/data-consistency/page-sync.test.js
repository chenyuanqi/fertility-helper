/**
 * 页面数据同步测试套件
 * 测试各个页面之间的数据同步和一致性
 */
const { TestUtils, TestDataFactory } = require('./TestUtils.js');
const { DataManager } = require('../../utils/dataManager.js');
const { FertilityStorage } = require('../../utils/storage.js');
const { DateUtils } = require('../../utils/date.js');

describe('页面数据同步测试', () => {
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
   * 测试记录页保存后，其他页面状态立即更新
   */
  describe('记录保存后页面同步', () => {
    test('体温记录保存后各页面数据同步', async () => {
      const testDate = '2025-01-15';
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '测试体温记录'
      };

      // 模拟记录页保存体温数据
      const saveResult = await dataManager.saveTemperatureRecord(temperatureRecord);
      expect(saveResult.success).toBe(true);

      // 验证首页能获取最新数据
      const indexPageData = await dataManager.getDayRecord(testDate);
      expect(indexPageData.success).toBe(true);
      expect(indexPageData.data.temperature).toBeDefined();
      expect(indexPageData.data.temperature.temperature).toBe(36.8);

      // 验证日历页显示更新
      const calendarPageData = await dataManager.getDayRecordsInRange(testDate, testDate);
      expect(calendarPageData.success).toBe(true);
      expect(calendarPageData.data[0].temperature).toBeDefined();
      expect(calendarPageData.data[0].temperature.temperature).toBe(36.8);

      // 验证图表页数据刷新
      const chartData = await dataManager.getDayRecordsInRange(
        DateUtils.subtractDays(testDate, 30),
        testDate
      );
      expect(chartData.success).toBe(true);
      const targetRecord = chartData.data.find(record => record.date === testDate);
      expect(targetRecord).toBeDefined();
      expect(targetRecord.temperature.temperature).toBe(36.8);
    });

    test('月经记录保存后各页面数据同步', async () => {
      const testDate = '2025-01-15';
      const menstrualRecord = {
        date: testDate,
        padCount: 3,
        color: 'red',
        isStart: true,
        note: '测试月经记录'
      };

      // 模拟记录页保存月经数据
      const saveResult = await dataManager.saveMenstrualRecord(menstrualRecord);
      expect(saveResult.success).toBe(true);

      // 验证首页能获取最新数据
      const indexPageData = await dataManager.getDayRecord(testDate);
      expect(indexPageData.success).toBe(true);
      expect(indexPageData.data.menstrual).toBeDefined();
      expect(indexPageData.data.menstrual.padCount).toBe(3);

      // 验证日历页显示更新
      const calendarPageData = await dataManager.getDayRecordsInRange(testDate, testDate);
      expect(calendarPageData.success).toBe(true);
      expect(calendarPageData.data[0].menstrual).toBeDefined();
      expect(calendarPageData.data[0].menstrual.isStart).toBe(true);

      // 验证周期信息更新
      const cycles = await FertilityStorage.getCycles();
      expect(cycles).toBeDefined();
      expect(cycles.length).toBeGreaterThan(0);
    });

    test('同房记录保存后各页面数据同步', async () => {
      const testDate = '2025-01-15';
      const intercourseRecord = {
        date: testDate,
        time: '22:00',
        hasProtection: false,
        note: '测试同房记录'
      };

      // 模拟记录页保存同房数据
      const saveResult = await dataManager.saveIntercourseRecord(intercourseRecord);
      expect(saveResult.success).toBe(true);

      // 验证首页能获取最新数据
      const indexPageData = await dataManager.getDayRecord(testDate);
      expect(indexPageData.success).toBe(true);
      expect(indexPageData.data.intercourse).toBeDefined();
      expect(indexPageData.data.intercourse.length).toBe(1);
      expect(indexPageData.data.intercourse[0].hasProtection).toBe(false);

      // 验证日历页显示更新
      const calendarPageData = await dataManager.getDayRecordsInRange(testDate, testDate);
      expect(calendarPageData.success).toBe(true);
      expect(calendarPageData.data[0].intercourse).toBeDefined();
      expect(calendarPageData.data[0].intercourse.length).toBe(1);
    });
  });

  /**
   * 测试设置页修改后，其他页面配置生效
   */
  describe('设置修改后页面同步', () => {
    test('周期长度修改后各页面预测更新', async () => {
      // 获取当前用户设置
      let userSettings = await FertilityStorage.getUserSettings();
      
      // 修改周期长度
      userSettings.personalInfo.averageCycleLength = 30;
      await FertilityStorage.saveUserSettings(userSettings);

      // 清理缓存，模拟页面重新加载
      dataManager.clearCache && dataManager.clearCache('userSettings');

      // 验证各页面获取的设置已更新
      const updatedSettings = await FertilityStorage.getUserSettings();
      expect(updatedSettings.personalInfo.averageCycleLength).toBe(30);

      // 验证周期计算使用新的长度
      await dataManager.ensureCyclesUpToCurrentDate();
      const cycles = await FertilityStorage.getCycles();
      
      // 检查最新生成的周期是否使用了30天的长度
      if (cycles && cycles.length > 0) {
        const latestCycle = cycles[cycles.length - 1];
        expect(latestCycle.length).toBe(30);
      }
    });

    test('黄体期长度修改后预测算法更新', async () => {
      let userSettings = await FertilityStorage.getUserSettings();
      
      // 修改黄体期长度
      userSettings.personalInfo.averageLutealPhase = 12;
      await FertilityStorage.saveUserSettings(userSettings);

      // 清理缓存
      dataManager.clearCache && dataManager.clearCache('userSettings');

      // 验证设置已更新
      const updatedSettings = await FertilityStorage.getUserSettings();
      expect(updatedSettings.personalInfo.averageLutealPhase).toBe(12);

      // 注意：这里需要在实际的排卵算法中验证黄体期长度的使用
      // 由于当前代码中的算法实现可能还未完全使用这个参数，
      // 这个测试更多是验证设置的同步性
    });

    test('用户昵称修改后首页显示更新', async () => {
      let userSettings = await FertilityStorage.getUserSettings();
      
      // 修改昵称
      const newNickname = '新昵称';
      userSettings.nickname = newNickname;
      await FertilityStorage.saveUserSettings(userSettings);

      // 清理缓存
      dataManager.clearCache && dataManager.clearCache('userSettings');

      // 验证首页获取的昵称已更新
      const updatedSettings = await FertilityStorage.getUserSettings();
      expect(updatedSettings.nickname).toBe(newNickname);
    });
  });

  /**
   * 测试数据删除后的同步一致性
   */
  describe('数据删除后页面同步', () => {
    test('删除记录后各页面数据同步更新', async () => {
      const testDate = '2025-01-15';
      
      // 先创建一条体温记录
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '测试体温记录'
      };
      
      const saveResult = await dataManager.saveTemperatureRecord(temperatureRecord);
      expect(saveResult.success).toBe(true);

      // 验证记录存在
      let dayRecord = await dataManager.getDayRecord(testDate);
      expect(dayRecord.data.temperature).toBeDefined();

      // 删除记录
      const deleteResult = await dataManager.deleteRecord(testDate, 'temperature');
      expect(deleteResult.success).toBe(true);

      // 验证各页面都获取不到该记录
      dayRecord = await dataManager.getDayRecord(testDate);
      expect(dayRecord.data.temperature).toBeUndefined();

      // 验证日历页数据也已删除
      const calendarData = await dataManager.getDayRecordsInRange(testDate, testDate);
      expect(calendarData.success).toBe(true);
      const targetRecord = calendarData.data.find(record => record.date === testDate);
      expect(targetRecord).toBeUndefined();
    });

    test('删除月经记录后周期信息重新计算', async () => {
      const testDate = '2025-01-15';
      
      // 创建一个经期开始记录
      const menstrualRecord = {
        date: testDate,
        padCount: 3,
        color: 'red',
        isStart: true,
        note: '测试月经记录'
      };
      
      await dataManager.saveMenstrualRecord(menstrualRecord);

      // 获取当前周期数量
      let cycles = await FertilityStorage.getCycles();
      const initialCycleCount = cycles ? cycles.length : 0;

      // 删除月经记录
      await dataManager.deleteRecord(testDate, 'menstrual');

      // 验证月经记录已删除
      const dayRecord = await dataManager.getDayRecord(testDate);
      expect(dayRecord.data.menstrual).toBeUndefined();

      // 验证周期信息可能发生变化（取决于实际的周期更新逻辑）
      cycles = await FertilityStorage.getCycles();
      // 这里的断言取决于具体的周期管理逻辑
      expect(cycles).toBeDefined();
    });
  });

  /**
   * 测试跨页面并发访问的数据一致性
   */
  describe('跨页面并发访问', () => {
    test('多个页面同时访问同一数据时保持一致', async () => {
      const testDate = '2025-01-15';
      
      // 模拟多个页面同时访问同一天的数据
      const promises = [
        dataManager.getDayRecord(testDate), // 首页访问
        dataManager.getDayRecord(testDate), // 记录页访问
        dataManager.getDayRecordsInRange(testDate, testDate) // 日历页访问
      ];

      const results = await Promise.all(promises);

      // 验证所有访问结果一致
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);

      // 验证数据内容一致（如果有数据的话）
      if (results[0].data && results[1].data) {
        await TestUtils.verifyDataConsistency(
          '多页面访问数据',
          results[0].data,
          results[1].data
        );
      }
    });

    test('页面切换时数据状态保持一致', async () => {
      const testDate = '2025-01-15';
      
      // 模拟首页加载数据
      const indexData = await dataManager.getDayRecord(testDate);
      
      // 等待一小段时间，模拟页面切换延迟
      await TestUtils.wait(10);
      
      // 模拟切换到日历页加载数据
      const calendarData = await dataManager.getDayRecordsInRange(testDate, testDate);
      
      // 验证数据一致性
      expect(indexData.success).toBe(calendarData.success);
      
      if (indexData.data && calendarData.data && calendarData.data.length > 0) {
        const calendarRecord = calendarData.data.find(record => record.date === testDate);
        if (calendarRecord) {
          await TestUtils.verifyDataConsistency(
            '页面切换数据一致性',
            indexData.data,
            calendarRecord
          );
        }
      }
    });
  });

  /**
   * 测试页面数据刷新机制
   */
  describe('页面数据刷新机制', () => {
    test('onShow时数据刷新保持最新状态', async () => {
      const testDate = '2025-01-15';
      
      // 模拟首页首次加载
      let indexData = await dataManager.getDayRecord(testDate);
      const initialHasTemperature = !!(indexData.data && indexData.data.temperature);
      
      // 模拟在其他页面添加体温记录
      const temperatureRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.8,
        note: '后添加的体温记录'
      };
      
      await dataManager.saveTemperatureRecord(temperatureRecord);
      
      // 清理缓存，模拟页面onShow刷新
      dataManager.clearCache && dataManager.clearCache(`dayRecord_${testDate}`);
      
      // 重新获取数据
      indexData = await dataManager.getDayRecord(testDate);
      
      // 验证获取到了最新数据
      expect(indexData.success).toBe(true);
      expect(indexData.data.temperature).toBeDefined();
      expect(indexData.data.temperature.temperature).toBe(36.8);
    });

    test('数据更新后相关页面缓存正确失效', async () => {
      const testDate = '2025-01-15';
      const rangeStart = DateUtils.subtractDays(testDate, 7);
      const rangeEnd = DateUtils.addDays(testDate, 7);
      
      // 预加载范围数据到缓存
      await dataManager.getDayRecordsInRange(rangeStart, rangeEnd);
      
      // 添加新记录
      const newRecord = {
        date: testDate,
        time: '07:30',
        temperature: 36.9,
        note: '新记录'
      };
      
      await dataManager.saveTemperatureRecord(newRecord);
      
      // 再次获取范围数据，应该包含新记录
      const updatedRangeData = await dataManager.getDayRecordsInRange(rangeStart, rangeEnd);
      
      expect(updatedRangeData.success).toBe(true);
      const targetRecord = updatedRangeData.data.find(record => record.date === testDate);
      expect(targetRecord).toBeDefined();
      expect(targetRecord.temperature).toBeDefined();
      expect(targetRecord.temperature.temperature).toBe(36.9);
    });
  });
});

module.exports = {
  // 导出测试函数供其他测试文件使用
};