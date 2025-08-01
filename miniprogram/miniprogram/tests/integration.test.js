// 集成测试
describe('数据流集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // 模拟成功的存储操作
    global.wx.setStorage.mockImplementation(({ success }) => {
      if (success) success();
    });
    
    global.wx.getStorage.mockImplementation(({ success }) => {
      if (success) success({ data: {} });
    });
  });

  test('数据记录完整流程', async () => {
    const { FertilityStorage } = require('../utils/storage');
    
    // 模拟记录体温数据
    const temperatureData = {
      '2025-01-15': {
        temperature: { temperature: 36.5, time: '07:00' }
      }
    };
    
    // 测试保存操作
    await expect(FertilityStorage.saveDayRecords(temperatureData)).resolves.not.toThrow();
    expect(global.wx.setStorage).toHaveBeenCalled();
  });

  test('智能分析算法集成', () => {
    const { OvulationAlgorithm } = require('../utils/ovulationAlgorithm');
    
    // 准备测试数据
    const temperatureData = [
      { date: '2025-01-01', temperature: 36.3 },
      { date: '2025-01-02', temperature: 36.4 },
      { date: '2025-01-03', temperature: 36.5 },
      { date: '2025-01-04', temperature: 36.6 },
      { date: '2025-01-05', temperature: 36.8 }
    ];
    
    const menstrualData = [
      { date: '2025-01-01', flow: 'medium', isStart: true }
    ];
    
    const intercourseData = [
      { date: '2025-01-10', times: 1 }
    ];
    
    // 执行综合分析
    const result = OvulationAlgorithm.comprehensiveAnalysis(
      temperatureData,
      menstrualData,
      intercourseData
    );
    
    expect(result).toBeDefined();
    expect(result.temperatureAnalysis).toBeDefined();
    expect(result.cycleAnalysis).toBeDefined();
    expect(result.ovulationWindow).toBeDefined();
    expect(result.fertileWindow).toBeDefined();
  });
});