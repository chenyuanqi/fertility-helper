/**
 * 周期报告生成器演示文件
 * 用于展示和测试报告生成功能
 */

const reportGenerator = require('./reportGenerator');

// 创建模拟数据用于演示
const createMockData = () => {
  const mockDayRecords = {};
  const mockCycles = [];
  
  // 生成3个月的模拟数据
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-03-31');
  
  let currentDate = new Date(startDate);
  let cycleStartDate = null;
  let cycleCount = 0;
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const dayOfCycle = cycleStartDate ? 
      Math.floor((currentDate - cycleStartDate) / (1000 * 60 * 60 * 24)) + 1 : 1;
    
    // 创建日记录
    const dayRecord = {
      date: dateStr
    };
    
    // 添加体温记录（85%的概率）
    if (Math.random() < 0.85) {
      let baseTemp = 36.3;
      
      // 模拟双相体温模式
      if (dayOfCycle > 14) {
        baseTemp += 0.3; // 排卵后体温升高
      }
      
      // 添加随机波动
      const temperature = baseTemp + (Math.random() - 0.5) * 0.4;
      
      dayRecord.temperature = {
        temperature: Math.round(temperature * 100) / 100,
        time: '07:00',
        note: Math.random() < 0.3 ? '正常' : ''
      };
    }
    
    // 添加月经记录
    if (dayOfCycle === 1) {
      // 月经开始
      cycleStartDate = new Date(currentDate);
      dayRecord.menstrual = {
        flow: 'heavy',
        isStart: true
      };
      cycleCount++;
    } else if (dayOfCycle <= 5) {
      // 月经期
      const flows = ['heavy', 'medium', 'light', 'light', 'light'];
      dayRecord.menstrual = {
        flow: flows[dayOfCycle - 1] || 'light',
        isEnd: dayOfCycle === 5
      };
    }
    
    // 添加同房记录（随机）
    if (Math.random() < 0.15) {
      dayRecord.intercourse = [{
        time: '22:00',
        protection: Math.random() < 0.7,
        note: ''
      }];
    }
    
    mockDayRecords[dateStr] = dayRecord;
    
    // 如果是周期的最后一天，创建周期记录
    if (dayOfCycle === 28) {
      const cycleEndDate = new Date(currentDate);
      mockCycles.push({
        id: `cycle_${cycleCount}`,
        startDate: cycleStartDate.toISOString().split('T')[0],
        endDate: cycleEndDate.toISOString().split('T')[0],
        length: 28,
        isComplete: true
      });
      cycleStartDate = null;
    }
    
    // 移动到下一天
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return { mockDayRecords, mockCycles };
};

/**
 * 演示文本报告生成
 */
const demoTextReport = async () => {
  console.log('='.repeat(60));
  console.log('周期报告生成器 - 文本报告演示');
  console.log('='.repeat(60));
  
  try {
    // 创建模拟数据
    const { mockDayRecords, mockCycles } = createMockData();
    
    // 临时替换存储方法
    const { FertilityStorage } = require('./storage');
    const originalGetDayRecords = FertilityStorage.getDayRecords;
    const originalGetCycles = FertilityStorage.getCycles;
    
    FertilityStorage.getDayRecords = async () => mockDayRecords;
    FertilityStorage.getCycles = async () => mockCycles;
    
    // 生成文本报告
    const textReport = await reportGenerator.generateCycleReport({
      cycleCount: 3,
      format: 'text'
    });
    
    console.log('文本报告生成成功！');
    console.log('报告长度:', textReport.length, '字符');
    console.log('\n报告内容预览:');
    console.log('-'.repeat(60));
    console.log(textReport.substring(0, 500) + '...');
    console.log('-'.repeat(60));
    
    // 恢复原始方法
    FertilityStorage.getDayRecords = originalGetDayRecords;
    FertilityStorage.getCycles = originalGetCycles;
    
    return textReport;
    
  } catch (error) {
    console.error('文本报告生成失败:', error);
    throw error;
  }
};

/**
 * 演示JSON报告生成
 */
const demoJsonReport = async () => {
  console.log('='.repeat(60));
  console.log('周期报告生成器 - JSON报告演示');
  console.log('='.repeat(60));
  
  try {
    // 创建模拟数据
    const { mockDayRecords, mockCycles } = createMockData();
    
    // 临时替换存储方法
    const { FertilityStorage } = require('./storage');
    const originalGetDayRecords = FertilityStorage.getDayRecords;
    const originalGetCycles = FertilityStorage.getCycles;
    
    FertilityStorage.getDayRecords = async () => mockDayRecords;
    FertilityStorage.getCycles = async () => mockCycles;
    
    // 生成JSON报告
    const jsonReport = await reportGenerator.generateCycleReport({
      cycleCount: 3,
      format: 'json'
    });
    
    console.log('JSON报告生成成功！');
    console.log('报告结构:');
    console.log('- 生成时间:', jsonReport.generateTime);
    console.log('- 分析周期:', jsonReport.reportPeriod);
    console.log('- 数据摘要:', JSON.stringify(jsonReport.summary, null, 2));
    console.log('- 数据质量评分:', jsonReport.dataQuality.score, '分');
    console.log('- 个性化建议数量:', jsonReport.recommendations.length, '条');
    
    // 显示建议内容
    if (jsonReport.recommendations.length > 0) {
      console.log('\n个性化建议:');
      jsonReport.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.title} (${rec.priority})`);
        console.log(`   ${rec.content}`);
      });
    }
    
    // 恢复原始方法
    FertilityStorage.getDayRecords = originalGetDayRecords;
    FertilityStorage.getCycles = originalGetCycles;
    
    return jsonReport;
    
  } catch (error) {
    console.error('JSON报告生成失败:', error);
    throw error;
  }
};

/**
 * 演示数据质量评估
 */
const demoDataQualityAssessment = () => {
  console.log('='.repeat(60));
  console.log('数据质量评估演示');
  console.log('='.repeat(60));
  
  try {
    const { mockDayRecords } = createMockData();
    
    const quality = reportGenerator.assessDataQuality(mockDayRecords);
    
    console.log('数据质量评估结果:');
    console.log('- 总体评分:', quality.score, '分');
    console.log('- 质量等级:', quality.assessment);
    console.log('- 详细评分:');
    console.log('  * 体温记录率:', quality.details.temperatureRate + '%');
    console.log('  * 月经记录率:', quality.details.menstrualRate + '%');
    console.log('  * 同房记录率:', quality.details.intercourseRate + '%');
    console.log('  * 备注记录率:', quality.details.notesRate + '%');
    
    return quality;
    
  } catch (error) {
    console.error('数据质量评估失败:', error);
    throw error;
  }
};

/**
 * 运行完整演示
 */
const runFullDemo = async () => {
  console.log('🚀 开始周期报告生成器完整演示...\n');
  
  try {
    // 1. 演示文本报告
    await demoTextReport();
    console.log('\n✅ 文本报告演示完成\n');
    
    // 2. 演示JSON报告
    await demoJsonReport();
    console.log('\n✅ JSON报告演示完成\n');
    
    // 3. 演示数据质量评估
    demoDataQualityAssessment();
    console.log('\n✅ 数据质量评估演示完成\n');
    
    console.log('🎉 所有演示完成！周期报告生成功能运行正常。');
    
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error);
  }
};

// 导出演示函数
module.exports = {
  createMockData,
  demoTextReport,
  demoJsonReport,
  demoDataQualityAssessment,
  runFullDemo
};

// 如果直接运行此文件，执行完整演示
if (typeof module !== 'undefined' && require.main === module) {
  runFullDemo();
}