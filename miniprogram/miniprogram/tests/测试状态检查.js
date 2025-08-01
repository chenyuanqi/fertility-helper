// 测试状态检查脚本
console.log('=== 测试环境检查 ===');

// 检查核心模块是否可以加载
try {
  const { DateUtils } = require('../utils/date');
  console.log('✅ DateUtils 模块加载成功');
  
  // 测试基本功能
  const today = DateUtils.getToday();
  console.log('✅ 获取今日日期:', today);
  
  const addResult = DateUtils.addDays('2025-01-15', 5);
  console.log('✅ 日期加法测试:', addResult);
  
} catch (error) {
  console.log('❌ DateUtils 模块加载失败:', error.message);
}

try {
  const { FertilityStorage } = require('../utils/storage');
  console.log('✅ FertilityStorage 模块加载成功');
} catch (error) {
  console.log('❌ FertilityStorage 模块加载失败:', error.message);
}

try {
  const { OvulationAlgorithm } = require('../utils/ovulationAlgorithm');
  console.log('✅ OvulationAlgorithm 模块加载成功');
  
  // 测试基本分析功能
  const testData = [
    { date: '2025-01-01', temperature: 36.3 },
    { date: '2025-01-02', temperature: 36.4 },
    { date: '2025-01-03', temperature: 36.7 }
  ];
  
  const analysis = OvulationAlgorithm.analyzeTemperatureData(testData);
  console.log('✅ 体温分析测试完成, 有效性:', analysis.isValid);
  
} catch (error) {
  console.log('❌ OvulationAlgorithm 模块加载失败:', error.message);
}

console.log('=== 检查完成 ===');