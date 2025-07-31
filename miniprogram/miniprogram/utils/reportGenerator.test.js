/**
 * 周期报告生成器测试文件
 * 用于验证报告生成功能的正确性
 */

const reportGenerator = require('./reportGenerator');

// 模拟测试数据
const mockDayRecords = {
  '2024-01-01': {
    date: '2024-01-01',
    temperature: {
      temperature: 36.5,
      time: '07:00',
      note: '正常'
    },
    menstrual: {
      flow: 'heavy',
      isStart: true
    }
  },
  '2024-01-02': {
    date: '2024-01-02',
    temperature: {
      temperature: 36.4,
      time: '07:00'
    },
    menstrual: {
      flow: 'medium'
    }
  },
  '2024-01-15': {
    date: '2024-01-15',
    temperature: {
      temperature: 36.8,
      time: '07:00'
    },
    intercourse: [{
      time: '22:00',
      protection: false
    }]
  }
};

const mockCycles = [
  {
    id: 'cycle_1',
    startDate: '2024-01-01',
    endDate: '2024-01-28',
    length: 28,
    isComplete: true
  }
];

/**
 * 测试报告生成功能
 */
async function testReportGeneration() {
  console.log('开始测试周期报告生成功能...');
  
  try {
    // 模拟存储数据
    const originalGetDayRecords = require('./storage').FertilityStorage.getDayRecords;
    const originalGetCycles = require('./storage').FertilityStorage.getCycles;
    
    // 临时替换存储方法
    require('./storage').FertilityStorage.getDayRecords = async () => mockDayRecords;
    require('./storage').FertilityStorage.getCycles = async () => mockCycles;
    
    // 测试文本报告生成
    console.log('测试文本报告生成...');
    const textReport = reportGenerator.generateCycleReport({
      cycleCount: 1,
      format: 'text'
    });
    
    console.log('文本报告生成成功，长度:', textReport.length);
    console.log('报告预览:', textReport.substring(0, 200) + '...');
    
    // 测试JSON报告生成
    console.log('测试JSON报告生成...');
    const jsonReport = reportGenerator.generateCycleReport({
      cycleCount: 1,
      format: 'json'
    });
    
    console.log('JSON报告生成成功');
    console.log('报告结构:', Object.keys(jsonReport));
    console.log('数据质量评分:', jsonReport.dataQuality.score);
    
    // 恢复原始存储方法
    require('./storage').FertilityStorage.getDayRecords = originalGetDayRecords;
    require('./storage').FertilityStorage.getCycles = originalGetCycles;
    
    console.log('✅ 周期报告生成功能测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return false;
  }
}

/**
 * 测试数据质量评估
 */
function testDataQualityAssessment() {
  console.log('测试数据质量评估...');
  
  try {
    const quality = reportGenerator.assessDataQuality(mockDayRecords);
    
    console.log('数据质量评估结果:');
    console.log('- 总分:', quality.score);
    console.log('- 评级:', quality.assessment);
    console.log('- 详情:', quality.details);
    
    console.log('✅ 数据质量评估测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 数据质量评估测试失败:', error);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (typeof module !== 'undefined' && require.main === module) {
  (async () => {
    console.log('='.repeat(50));
    console.log('周期报告生成器测试');
    console.log('='.repeat(50));
    
    const test1 = await testReportGeneration();
    const test2 = testDataQualityAssessment();
    
    console.log('='.repeat(50));
    console.log('测试结果:');
    console.log('- 报告生成测试:', test1 ? '通过' : '失败');
    console.log('- 数据质量评估测试:', test2 ? '通过' : '失败');
    console.log('='.repeat(50));
  })();
}

module.exports = {
  testReportGeneration,
  testDataQualityAssessment
};