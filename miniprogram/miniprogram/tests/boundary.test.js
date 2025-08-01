// 边界条件测试
const { DateUtils } = require('../utils/date');

describe('边界条件测试', () => {
  test('日期边界测试', () => {
    // 测试闰年
    expect(DateUtils.addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(DateUtils.addDays('2023-02-28', 1)).toBe('2023-03-01');
    
    // 测试月末
    expect(DateUtils.addDays('2025-01-31', 1)).toBe('2025-02-01');
    expect(DateUtils.addDays('2025-04-30', 1)).toBe('2025-05-01');
    
    // 测试年末
    expect(DateUtils.addDays('2024-12-31', 1)).toBe('2025-01-01');
  });

  test('体温边界测试', () => {
    const { OvulationAlgorithm } = require('../utils/ovulationAlgorithm');
    
    // 测试极端体温值
    const extremeTemperatures = [
      { date: '2025-01-01', temperature: 35.0 }, // 过低
      { date: '2025-01-02', temperature: 39.0 }, // 过高
      { date: '2025-01-03', temperature: 36.5 }  // 正常
    ];
    
    const analysis = OvulationAlgorithm.analyzeTemperatureData(extremeTemperatures);
    expect(analysis).toBeDefined();
    expect(analysis.isValid).toBeDefined();
  });

  test('空数据处理', () => {
    const { OvulationAlgorithm } = require('../utils/ovulationAlgorithm');
    
    // 测试空数组
    const emptyAnalysis = OvulationAlgorithm.analyzeTemperatureData([]);
    expect(emptyAnalysis.isValid).toBe(false);
    
    // 测试综合分析空数据
    const comprehensiveEmpty = OvulationAlgorithm.comprehensiveAnalysis([], [], []);
    expect(comprehensiveEmpty).toBeDefined();
    expect(comprehensiveEmpty.temperatureAnalysis.isValid).toBe(false);
  });

  test('数据完整性测试', () => {
    const { FertilityStorage } = require('../utils/storage');
    
    // 测试存储模块是否正确导出
    expect(FertilityStorage).toBeDefined();
    expect(typeof FertilityStorage.saveDayRecords).toBe('function');
    expect(typeof FertilityStorage.getDayRecords).toBe('function');
    expect(typeof FertilityStorage.saveCycles).toBe('function');
    expect(typeof FertilityStorage.getCycles).toBe('function');
  });

  test('算法稳定性测试', () => {
    const { OvulationAlgorithm } = require('../utils/ovulationAlgorithm');
    
    // 测试重复数据
    const duplicateData = [
      { date: '2025-01-01', temperature: 36.5 },
      { date: '2025-01-01', temperature: 36.5 }, // 重复
      { date: '2025-01-02', temperature: 36.6 }
    ];
    
    const analysis = OvulationAlgorithm.analyzeTemperatureData(duplicateData);
    expect(analysis).toBeDefined();
    
    // 测试乱序数据
    const unorderedData = [
      { date: '2025-01-03', temperature: 36.7 },
      { date: '2025-01-01', temperature: 36.5 },
      { date: '2025-01-02', temperature: 36.6 }
    ];
    
    const unorderedAnalysis = OvulationAlgorithm.analyzeTemperatureData(unorderedData);
    expect(unorderedAnalysis).toBeDefined();
  });
});