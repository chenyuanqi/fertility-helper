/**
 * 简单的报告生成器测试
 * 用于验证修复后的功能是否正常工作
 */

const reportGenerator = require('./reportGenerator');

// 创建模拟的存储方法
const mockStorage = {
  dayRecords: {
    '2024-01-01': {
      temperature: { temperature: 36.3, time: '07:00' },
      menstrual: { flow: 'heavy', isStart: true }
    },
    '2024-01-02': {
      temperature: { temperature: 36.2, time: '07:00' },
      menstrual: { flow: 'medium' }
    },
    '2024-01-03': {
      temperature: { temperature: 36.4, time: '07:00' },
      menstrual: { flow: 'light' }
    },
    '2024-01-15': {
      temperature: { temperature: 36.6, time: '07:00' },
      intercourse: [{ time: '22:00', protection: false }]
    },
    '2024-01-16': {
      temperature: { temperature: 36.7, time: '07:00' }
    }
  },
  cycles: [
    {
      id: 'cycle_1',
      startDate: '2024-01-01',
      endDate: '2024-01-28',
      length: 28,
      isComplete: true
    }
  ],
  userSettings: {
    averageCycleLength: 28,
    lutealPhaseLength: 14
  }
};

// 模拟存储方法
const { FertilityStorage } = require('./storage');
const originalGetDayRecords = FertilityStorage.getDayRecords;
const originalGetCycles = FertilityStorage.getCycles;
const originalGetUserSettings = FertilityStorage.getUserSettings;

FertilityStorage.getDayRecords = async () => mockStorage.dayRecords;
FertilityStorage.getCycles = async () => mockStorage.cycles;
FertilityStorage.getUserSettings = async () => mockStorage.userSettings;

/**
 * 测试文本报告生成
 */
async function testTextReport() {
  console.log('=== 测试文本报告生成 ===');
  
  try {
    const report = await reportGenerator.generateCycleReport({
      cycleCount: 1,
      format: 'text'
    });
    
    console.log('✅ 文本报告生成成功');
    console.log('报告长度:', report.length, '字符');
    console.log('\n报告预览:');
    console.log(report.substring(0, 300) + '...');
    
    return true;
  } catch (error) {
    console.error('❌ 文本报告生成失败:', error.message);
    return false;
  }
}

/**
 * 测试JSON报告生成
 */
async function testJsonReport() {
  console.log('\n=== 测试JSON报告生成 ===');
  
  try {
    const report = await reportGenerator.generateCycleReport({
      cycleCount: 1,
      format: 'json'
    });
    
    console.log('✅ JSON报告生成成功');
    console.log('报告结构:');
    console.log('- 生成时间:', report.generateTime);
    console.log('- 分析周期:', report.reportPeriod);
    console.log('- 数据质量评分:', report.dataQuality.score);
    console.log('- 建议数量:', report.recommendations.length);
    
    return true;
  } catch (error) {
    console.error('❌ JSON报告生成失败:', error.message);
    return false;
  }
}

/**
 * 测试空数据处理
 */
async function testEmptyData() {
  console.log('\n=== 测试空数据处理 ===');
  
  // 临时替换为空数据
  FertilityStorage.getDayRecords = async () => ({});
  FertilityStorage.getCycles = async () => ([]);
  
  try {
    const report = await reportGenerator.generateCycleReport({
      cycleCount: 1,
      format: 'text'
    });
    
    console.log('❌ 空数据应该抛出错误，但没有');
    return false;
  } catch (error) {
    console.log('✅ 空数据正确抛出错误:', error.message);
    return true;
  } finally {
    // 恢复模拟数据
    FertilityStorage.getDayRecords = async () => mockStorage.dayRecords;
    FertilityStorage.getCycles = async () => mockStorage.cycles;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始报告生成器测试...\n');
  
  const results = [];
  
  results.push(await testTextReport());
  results.push(await testJsonReport());
  results.push(await testEmptyData());
  
  const passedTests = results.filter(result => result).length;
  const totalTests = results.length;
  
  console.log('\n=== 测试结果 ===');
  console.log(`通过测试: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！报告生成功能正常工作。');
  } else {
    console.log('⚠️ 部分测试失败，需要进一步检查。');
  }
  
  // 恢复原始方法
  FertilityStorage.getDayRecords = originalGetDayRecords;
  FertilityStorage.getCycles = originalGetCycles;
  FertilityStorage.getUserSettings = originalGetUserSettings;
}

// 如果直接运行此文件，执行测试
if (typeof module !== 'undefined' && require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testTextReport,
  testJsonReport,
  testEmptyData,
  runAllTests
};