/**
 * 自动化测试脚本
 * 模拟用户操作流程，验证核心功能
 */

// 模拟微信小程序环境
const mockWxAPI = {
  // 存储相关
  storage: {},
  setStorage: function({ key, data, success, fail }) {
    try {
      this.storage[key] = JSON.parse(JSON.stringify(data));
      if (success) success();
    } catch (error) {
      if (fail) fail(error);
    }
  },
  getStorage: function({ key, success, fail }) {
    if (this.storage[key]) {
      if (success) success({ data: this.storage[key] });
    } else {
      if (fail) fail({ errMsg: 'data not found' });
    }
  },
  
  // UI 相关
  showToast: function({ title, icon }) {
    console.log(`Toast: ${title} (${icon})`);
  },
  showModal: function({ title, content, success }) {
    console.log(`Modal: ${title} - ${content}`);
    if (success) success({ confirm: true });
  },
  
  // 导航相关
  navigateTo: function({ url, success }) {
    console.log(`Navigate to: ${url}`);
    if (success) success();
  },
  switchTab: function({ url, success }) {
    console.log(`Switch tab to: ${url}`);
    if (success) success();
  }
};

// 设置全局 wx 对象
global.wx = mockWxAPI;

/**
 * 自动化测试套件
 */
class AutomatedTestSuite {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
  }

  /**
   * 开始测试
   */
  async runAllTests() {
    console.log('🚀 开始自动化测试...\n');
    
    try {
      await this.testDataRecordingFlow();
      await this.testDataVisualizationFlow();
      await this.testSmartAnalysisFlow();
      await this.testDataManagementFlow();
      
      this.printTestResults();
    } catch (error) {
      console.error('❌ 测试执行失败:', error);
    }
  }

  /**
   * 测试数据记录流程
   */
  async testDataRecordingFlow() {
    this.currentTest = '数据记录流程测试';
    console.log(`📊 ${this.currentTest}`);
    
    try {
      const { FertilityStorage } = require('../utils/storage');
      const { DateUtils } = require('../utils/date');
      
      // 1. 测试体温记录
      console.log('  - 测试体温记录...');
      const temperatureData = {
        '2025-01-15': {
          date: '2025-01-15',
          temperature: {
            id: 'temp_001',
            temperature: 36.8,
            time: '07:30',
            notes: '自动化测试记录',
            createdAt: DateUtils.formatISO(new Date())
          }
        }
      };
      
      await FertilityStorage.saveDayRecords(temperatureData);
      const savedData = await FertilityStorage.getDayRecords();
      
      this.assert(
        savedData['2025-01-15']?.temperature?.temperature === 36.8,
        '体温记录保存成功'
      );
      
      // 2. 测试月经记录
      console.log('  - 测试月经记录...');
      const menstrualData = {
        '2025-01-16': {
          date: '2025-01-16',
          menstrual: {
            id: 'mens_001',
            flow: 'medium',
            isStart: true,
            notes: '周期开始',
            createdAt: DateUtils.formatISO(new Date())
          }
        }
      };
      
      const combinedData = { ...temperatureData, ...menstrualData };
      await FertilityStorage.saveDayRecords(combinedData);
      const updatedData = await FertilityStorage.getDayRecords();
      
      this.assert(
        updatedData['2025-01-16']?.menstrual?.flow === 'medium',
        '月经记录保存成功'
      );
      
      // 3. 测试同房记录
      console.log('  - 测试同房记录...');
      const intercourseData = {
        '2025-01-17': {
          date: '2025-01-17',
          intercourse: [{
            id: 'inter_001',
            time: '22:00',
            protection: false,
            notes: '测试记录',
            createdAt: DateUtils.formatISO(new Date())
          }]
        }
      };
      
      const allData = { ...combinedData, ...intercourseData };
      await FertilityStorage.saveDayRecords(allData);
      const finalData = await FertilityStorage.getDayRecords();
      
      this.assert(
        finalData['2025-01-17']?.intercourse?.length === 1,
        '同房记录保存成功'
      );
      
      this.recordTestResult(this.currentTest, true, '所有记录功能正常');
      
    } catch (error) {
      this.recordTestResult(this.currentTest, false, error.message);
    }
  }

  /**
   * 测试数据可视化流程
   */
  async testDataVisualizationFlow() {
    this.currentTest = '数据可视化流程测试';
    console.log(`📈 ${this.currentTest}`);
    
    try {
      const { FertilityStorage } = require('../utils/storage');
      const { DateUtils } = require('../utils/date');
      
      // 准备测试数据
      const testData = {};
      for (let i = 0; i < 30; i++) {
        const date = DateUtils.addDays('2025-01-01', i);
        testData[date] = {
          date: date,
          temperature: {
            temperature: 36.3 + Math.random() * 0.8,
            time: '07:30'
          }
        };
        
        // 添加一些月经数据
        if (i < 5) {
          testData[date].menstrual = {
            flow: i === 0 ? 'heavy' : 'medium',
            isStart: i === 0
          };
        }
        
        // 添加一些同房数据
        if (i % 7 === 0) {
          testData[date].intercourse = [{
            time: '22:00',
            protection: false
          }];
        }
      }
      
      await FertilityStorage.saveDayRecords(testData);
      
      console.log('  - 测试数据准备完成...');
      
      // 测试数据获取
      const retrievedData = await FertilityStorage.getDayRecords();
      this.assert(
        Object.keys(retrievedData).length === 30,
        '数据可视化数据准备成功'
      );
      
      // 测试图表数据处理
      const temperatureData = Object.entries(retrievedData)
        .filter(([date, record]) => record.temperature)
        .map(([date, record]) => ({
          date,
          temperature: record.temperature.temperature
        }));
      
      this.assert(
        temperatureData.length === 30,
        '体温数据处理正确'
      );
      
      this.recordTestResult(this.currentTest, true, '数据可视化功能正常');
      
    } catch (error) {
      this.recordTestResult(this.currentTest, false, error.message);
    }
  }

  /**
   * 测试智能分析流程
   */
  async testSmartAnalysisFlow() {
    this.currentTest = '智能分析流程测试';
    console.log(`🤖 ${this.currentTest}`);
    
    try {
      const { OvulationAlgorithm } = require('../utils/ovulationAlgorithm');
      
      // 准备模拟体温数据（模拟排卵模式）
      const temperatureData = [
        { date: '2025-01-01', temperature: 36.3 },
        { date: '2025-01-02', temperature: 36.2 },
        { date: '2025-01-03', temperature: 36.4 },
        { date: '2025-01-04', temperature: 36.3 },
        { date: '2025-01-05', temperature: 36.2 },
        { date: '2025-01-06', temperature: 36.7 }, // 体温升高开始
        { date: '2025-01-07', temperature: 36.8 },
        { date: '2025-01-08', temperature: 36.9 },
        { date: '2025-01-09', temperature: 36.8 },
        { date: '2025-01-10', temperature: 36.7 }
      ];
      
      console.log('  - 测试体温模式分析...');
      console.log('  - 测试体温模式分析...');
      const temperatureAnalysis = OvulationAlgorithm.analyzeBasalTemperature(temperatureData);
      
      this.assert(
        temperatureAnalysis !== null,
        '体温模式分析成功'
      );
      
      console.log('  - 测试月经周期分析...');
      const menstrualData = [
        { date: '2025-01-01', flow: 'medium', isStart: true },
        { date: '2025-01-02', flow: 'heavy', isStart: false },
        { date: '2025-01-03', flow: 'light', isStart: false }
      ];
      
      const cycleAnalysis = OvulationAlgorithm.analyzeMenstrualCycle(menstrualData);
      
      this.assert(
        cycleAnalysis !== null,
        '月经周期分析功能正常'
      );
      
      console.log('  - 测试综合分析...');
      const comprehensiveAnalysis = OvulationAlgorithm.comprehensiveAnalysis(
        temperatureData, [], []
      );
      
      this.assert(
        comprehensiveAnalysis.ovulationWindow !== undefined,
        '综合分析功能正常'
      );
      
      this.recordTestResult(this.currentTest, true, '智能分析功能正常');
      
    } catch (error) {
      this.recordTestResult(this.currentTest, false, error.message);
    }
  }

  /**
   * 测试数据管理流程
   */
  async testDataManagementFlow() {
    this.currentTest = '数据管理流程测试';
    console.log(`💾 ${this.currentTest}`);
    
    try {
      const { FertilityStorage } = require('../utils/storage');
      
      // 测试用户设置
      console.log('  - 测试用户设置管理...');
      const userSettings = {
        personalInfo: {
          age: 28,
          averageCycleLength: 28,
          averagePeriodLength: 5
        },
        preferences: {
          temperatureUnit: 'celsius',
          reminderEnabled: true
        }
      };
      
      await FertilityStorage.saveUserSettings(userSettings);
      const savedSettings = await FertilityStorage.getUserSettings();
      
      this.assert(
        savedSettings?.personalInfo?.age === 28,
        '用户设置保存成功'
      );
      
      // 测试周期数据
      console.log('  - 测试周期数据管理...');
      const cycleData = [{
        id: 'cycle_001',
        startDate: '2025-01-01',
        endDate: null,
        length: null,
        createdAt: new Date().toISOString()
      }];
      
      await FertilityStorage.saveCycles(cycleData);
      const savedCycles = await FertilityStorage.getCycles();
      
      this.assert(
        savedCycles.length === 1 && savedCycles[0].startDate === '2025-01-01',
        '周期数据保存成功'
      );
      
      this.recordTestResult(this.currentTest, true, '数据管理功能正常');
      
    } catch (error) {
      this.recordTestResult(this.currentTest, false, error.message);
    }
  }

  /**
   * 断言方法
   */
  assert(condition, message) {
    if (condition) {
      console.log(`    ✅ ${message}`);
    } else {
      console.log(`    ❌ ${message}`);
      throw new Error(`断言失败: ${message}`);
    }
  }

  /**
   * 记录测试结果
   */
  recordTestResult(testName, passed, message) {
    this.testResults.push({
      testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 打印测试结果
   */
  printTestResults() {
    console.log('\n📋 测试结果汇总:');
    console.log('='.repeat(50));
    
    let passedCount = 0;
    let totalCount = this.testResults.length;
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ 通过' : '❌ 失败';
      console.log(`${status} ${result.testName}: ${result.message}`);
      if (result.passed) passedCount++;
    });
    
    console.log('='.repeat(50));
    console.log(`总计: ${totalCount} 项测试, ${passedCount} 项通过, ${totalCount - passedCount} 项失败`);
    console.log(`成功率: ${((passedCount / totalCount) * 100).toFixed(1)}%`);
    
    if (passedCount === totalCount) {
      console.log('🎉 所有测试通过！');
    } else {
      console.log('⚠️  存在测试失败，请检查相关功能');
    }
  }
}

// 运行测试
if (require.main === module) {
  const testSuite = new AutomatedTestSuite();
  testSuite.runAllTests();
}

module.exports = AutomatedTestSuite;