/**
 * 周期报告生成器
 * 生成用户的周期分析报告
 */

const { DataAnalysis } = require('./dataAnalysis');
const { FertilityStorage } = require('./storage');
const { DateUtils } = require('./date');

// 尝试加载排卵算法模块，如果失败则使用null
let OvulationAlgorithm = null;
try {
  const ovulationModule = require('./ovulationAlgorithm');
  OvulationAlgorithm = ovulationModule.OvulationAlgorithm || ovulationModule;
} catch (error) {
  console.warn('排卵算法模块加载失败，将使用简化分析:', error);
}

class ReportGenerator {
  constructor() {
    this.dataAnalysis = DataAnalysis;
    this.ovulationAlgorithm = OvulationAlgorithm;
  }

  /**
   * 生成完整的周期报告
   * @param {Object} options 报告选项
   * @param {number} options.cycleCount 分析的周期数量，默认3个周期
   * @param {string} options.format 报告格式：'text' | 'json'
   * @returns {Object} 报告数据
   */
  async generateCycleReport(options = {}) {
    const { cycleCount = 3, format = 'text' } = options;
    
    try {
      // 获取基础数据
      const dayRecords = await FertilityStorage.getDayRecords();
      const cycles = await FertilityStorage.getCycles();
      const userSettings = await FertilityStorage.getUserSettings();
      
      if (!dayRecords || Object.keys(dayRecords).length === 0) {
        throw new Error('暂无记录数据，请先添加一些记录后再生成报告');
      }

      // 生成报告数据
      const reportData = {
        generateTime: new Date().toISOString(),
        reportPeriod: this.getReportPeriod(dayRecords, cycleCount),
        summary: await this.generateSummary(dayRecords, cycles),
        cycleAnalysis: await this.generateCycleAnalysis(dayRecords, cycles, cycleCount),
        temperatureAnalysis: await this.generateTemperatureAnalysis(dayRecords),
        fertilityAnalysis: await this.generateFertilityAnalysis(dayRecords),
        recommendations: await this.generateRecommendations(dayRecords, cycles),
        dataQuality: this.assessDataQuality(dayRecords),
        charts: this.generateChartData(dayRecords, cycleCount)
      };

      if (format === 'text') {
        return this.formatReportAsText(reportData);
      }
      
      return reportData;
    } catch (error) {
      console.error('生成报告失败:', error);
      throw new Error(error.message || '报告生成失败，请稍后重试');
    }
  }

  /**
   * 获取报告时间范围
   */
  getReportPeriod(dayRecords, cycleCount) {
    const dates = Object.keys(dayRecords).sort();
    if (dates.length === 0) {
      return '暂无数据';
    }
    
    const endDate = dates[dates.length - 1];
    const startDate = dates[Math.max(0, dates.length - (cycleCount * 30))];
    
    return `${this.formatDate(startDate)} 至 ${this.formatDate(endDate)}`;
  }

  /**
   * 生成报告摘要
   */
  async generateSummary(dayRecords, cycles) {
    const dates = Object.keys(dayRecords);
    const totalRecordDays = dates.length;
    
    // 计算体温记录统计
    const temperatureRecords = dates.filter(date => 
      dayRecords[date].temperature && dayRecords[date].temperature.temperature
    );
    const temperatureRecordRate = totalRecordDays > 0 ? 
      Math.round((temperatureRecords.length / totalRecordDays) * 100) : 0;
    
    // 计算平均体温
    const temperatures = temperatureRecords.map(date => 
      dayRecords[date].temperature.temperature
    );
    const averageTemperature = temperatures.length > 0 ? 
      (temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length).toFixed(2) : '0.00';
    
    // 计算月经天数
    const menstrualDays = dates.filter(date => 
      dayRecords[date].menstrual && dayRecords[date].menstrual.flow && dayRecords[date].menstrual.flow !== 'none'
    ).length;
    
    // 计算同房频率
    const intercourseRecords = dates.filter(date => 
      dayRecords[date].intercourse && dayRecords[date].intercourse.length > 0
    );
    const intercourseFrequency = totalRecordDays > 0 ? 
      Math.round((intercourseRecords.length / totalRecordDays) * 30) : 0;
    
    // 计算平均周期长度
    let averageCycleLength = 28; // 默认值
    if (cycles && cycles.length > 1) {
      const completedCycles = cycles.filter(cycle => cycle.isComplete);
      if (completedCycles.length > 0) {
        const cycleLengths = completedCycles.map(cycle => {
          const start = new Date(cycle.startDate);
          const end = new Date(cycle.endDate);
          return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        });
        averageCycleLength = Math.round(
          cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
        );
      }
    }

    return {
      totalRecordDays,
      averageCycleLength,
      cycleRegularity: this.getCycleRegularityText(cycles),
      temperatureRecordRate,
      averageTemperature,
      menstrualDays,
      intercourseFrequency
    };
  }

  /**
   * 生成周期分析
   */
  async generateCycleAnalysis(dayRecords, cycles, cycleCount) {
    if (!cycles || cycles.length === 0) {
      return { message: '暂无完整周期数据进行分析' };
    }

    const recentCycles = cycles.slice(-cycleCount);
    const lengths = recentCycles.map(cycle => {
      if (cycle.isComplete) {
        const start = new Date(cycle.startDate);
        const end = new Date(cycle.endDate);
        return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }
      return null;
    }).filter(length => length !== null);

    if (lengths.length === 0) {
      return { message: '暂无完整周期数据进行分析' };
    }

    const avgLength = Math.round(lengths.reduce((sum, len) => sum + len, 0) / lengths.length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    const variability = maxLength - minLength;

    return {
      cycleCount: lengths.length,
      averageLength: avgLength,
      lengthRange: `${minLength}-${maxLength}天`,
      variability: variability,
      regularityAssessment: this.assessCycleRegularity(variability),
      cycleDetails: recentCycles.map((cycle, index) => ({
        cycleNumber: index + 1,
        length: lengths[index] || '未完成',
        startDate: this.formatDate(cycle.startDate),
        endDate: cycle.endDate ? this.formatDate(cycle.endDate) : '进行中',
        ovulationPredicted: this.predictOvulationForCycle(cycle, dayRecords),
        temperaturePattern: this.analyzeTemperaturePattern(cycle, dayRecords)
      }))
    };
  }

  /**
   * 生成体温分析
   */
  async generateTemperatureAnalysis(dayRecords) {
    const dates = Object.keys(dayRecords);
    const temperatureRecords = dates.filter(date => 
      dayRecords[date].temperature && dayRecords[date].temperature.temperature
    );
    
    if (temperatureRecords.length === 0) {
      return {
        recordRate: 0,
        averageTemperature: '0.00',
        temperatureRange: '无数据',
        biphasicPattern: '数据不足',
        temperatureTrend: '无法分析',
        qualityAssessment: '需要更多数据'
      };
    }

    const temperatures = temperatureRecords.map(date => 
      dayRecords[date].temperature.temperature
    );
    
    const recordRate = Math.round((temperatureRecords.length / dates.length) * 100);
    const averageTemperature = (temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length).toFixed(2);
    const minTemp = Math.min(...temperatures).toFixed(2);
    const maxTemp = Math.max(...temperatures).toFixed(2);

    return {
      recordRate,
      averageTemperature,
      temperatureRange: `${minTemp}-${maxTemp}°C`,
      biphasicPattern: this.analyzeBiphasicPattern(dayRecords),
      temperatureTrend: this.analyzeTemperatureTrend(dayRecords),
      qualityAssessment: this.assessTemperatureQuality(recordRate)
    };
  }

  /**
   * 生成生育力分析
   */
  async generateFertilityAnalysis(dayRecords) {
    // 如果排卵算法模块不可用，直接使用简化分析
    if (!this.ovulationAlgorithm) {
      return this.generateSimpleFertilityAnalysis(dayRecords);
    }
    
    try {
      // 准备数据用于排卵算法分析
      const temperatureData = this.prepareTemperatureData(dayRecords);
      const menstrualData = this.prepareMenstrualData(dayRecords);
      
      // 使用排卵算法进行综合分析
      const analysis = this.ovulationAlgorithm.comprehensiveAnalysis(
        temperatureData,
        menstrualData,
        []
      );
      
      let currentStatus = '未知';
      let confidence = '低';
      let nextOvulation = '无法预测';
      let fertilityWindow = '无法确定';
      
      if (analysis.fertileWindow && analysis.fertileWindow.isValid) {
        const status = analysis.fertileWindow.currentStatus;
        currentStatus = status.description || '未知';
        confidence = analysis.fertileWindow.confidence || '低';
        
        if (analysis.ovulationWindow && analysis.ovulationWindow.isValid) {
          nextOvulation = this.formatDate(analysis.ovulationWindow.ovulationDate);
          fertilityWindow = `${this.formatDate(analysis.fertileWindow.fertileStart)} - ${this.formatDate(analysis.fertileWindow.fertileEnd)}`;
        }
      }
      
      return {
        currentStatus,
        confidence,
        nextOvulation,
        fertilityWindow,
        recommendations: this.generateFertilityRecommendations({ status: currentStatus, confidence }, { nextOvulationDate: nextOvulation })
      };
    } catch (error) {
      console.error('生育力分析失败:', error);
      // 提供简化的生育力分析
      return this.generateSimpleFertilityAnalysis(dayRecords);
    }
  }

  /**
   * 准备体温数据用于排卵算法
   */
  prepareTemperatureData(dayRecords) {
    return Object.keys(dayRecords)
      .filter(date => dayRecords[date].temperature && dayRecords[date].temperature.temperature)
      .map(date => ({
        date,
        temperature: dayRecords[date].temperature.temperature
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * 准备月经数据用于排卵算法
   */
  prepareMenstrualData(dayRecords) {
    return Object.keys(dayRecords)
      .filter(date => dayRecords[date].menstrual && dayRecords[date].menstrual.flow && dayRecords[date].menstrual.flow !== 'none')
      .map(date => ({
        date,
        flow: dayRecords[date].menstrual.flow,
        isStart: dayRecords[date].menstrual.isStart || false,
        isEnd: dayRecords[date].menstrual.isEnd || false
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * 生成简化的生育力分析（当排卵算法不可用时）
   */
  generateSimpleFertilityAnalysis(dayRecords) {
    const dates = Object.keys(dayRecords).sort();
    const today = new Date().toISOString().split('T')[0];
    
    // 查找最近的月经开始日期
    let lastMenstrualStart = null;
    for (let i = dates.length - 1; i >= 0; i--) {
      const date = dates[i];
      const record = dayRecords[date];
      if (record.menstrual && record.menstrual.flow && record.menstrual.flow !== 'none') {
        if (record.menstrual.isStart || !lastMenstrualStart) {
          lastMenstrualStart = date;
          break;
        }
      }
    }
    
    let currentStatus = '未知';
    let nextOvulation = '无法预测';
    let fertilityWindow = '无法确定';
    
    if (lastMenstrualStart) {
      const daysSinceLastPeriod = Math.floor(
        (new Date(today) - new Date(lastMenstrualStart)) / (1000 * 60 * 60 * 24)
      );
      
      // 简单的周期估算
      if (daysSinceLastPeriod >= 10 && daysSinceLastPeriod <= 18) {
        currentStatus = '可能易孕期';
        fertilityWindow = '排卵期前后';
      } else if (daysSinceLastPeriod >= 12 && daysSinceLastPeriod <= 16) {
        currentStatus = '排卵期';
        fertilityWindow = '最佳受孕时机';
      } else if (daysSinceLastPeriod < 10) {
        currentStatus = '月经后期';
        fertilityWindow = '非易孕期';
      } else {
        currentStatus = '黄体期';
        fertilityWindow = '非易孕期';
      }
      
      // 估算下次排卵日
      const estimatedNextOvulation = new Date(lastMenstrualStart);
      estimatedNextOvulation.setDate(estimatedNextOvulation.getDate() + 28 + 14); // 假设28天周期
      nextOvulation = this.formatDate(estimatedNextOvulation.toISOString().split('T')[0]);
    }
    
    return {
      currentStatus,
      confidence: '低',
      nextOvulation,
      fertilityWindow,
      recommendations: [
        '建议完善体温记录以提高预测准确性',
        '坚持记录月经周期有助于更准确的分析',
        '如需专业指导，请咨询妇科医生'
      ]
    };
  }

  /**
   * 生成建议
   */
  async generateRecommendations(dayRecords, cycles) {
    const recommendations = [];
    const dates = Object.keys(dayRecords);
    
    // 记录频率建议
    const temperatureRecords = dates.filter(date => 
      dayRecords[date].temperature && dayRecords[date].temperature.temperature
    );
    const recordRate = dates.length > 0 ? temperatureRecords.length / dates.length : 0;
    
    if (recordRate < 0.8) {
      recommendations.push({
        type: 'recording',
        priority: 'high',
        title: '提高记录频率',
        content: '建议每天坚持记录体温，记录率达到80%以上可以提高预测准确性'
      });
    }

    // 周期规律性建议
    if (cycles && cycles.length > 1) {
      const completedCycles = cycles.filter(cycle => cycle.isComplete);
      if (completedCycles.length >= 2) {
        const lengths = completedCycles.map(cycle => {
          const start = new Date(cycle.startDate);
          const end = new Date(cycle.endDate);
          return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        });
        const variability = Math.max(...lengths) - Math.min(...lengths);
        
        if (variability > 7) {
          recommendations.push({
            type: 'cycle',
            priority: 'medium',
            title: '关注周期规律性',
            content: '您的周期变化较大，建议保持规律作息，如有持续异常请咨询医生'
          });
        }
      }
    }

    // 数据质量建议
    const dataQuality = this.assessDataQuality(dayRecords);
    if (dataQuality.score < 70) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        title: '改善数据质量',
        content: '建议完善记录信息，包括症状备注等，有助于更准确的分析'
      });
    }

    return recommendations;
  }

  /**
   * 评估数据质量
   */
  assessDataQuality(dayRecords) {
    const dates = Object.keys(dayRecords);
    if (dates.length === 0) {
      return { score: 0, assessment: '无数据', details: {} };
    }

    let score = 0;
    let totalDays = dates.length;
    let temperatureDays = 0;
    let menstrualDays = 0;
    let intercourseDays = 0;
    let notesDays = 0;

    dates.forEach(date => {
      const dayData = dayRecords[date];
      if (dayData.temperature && dayData.temperature.temperature) temperatureDays++;
      if (dayData.menstrual && dayData.menstrual.flow) menstrualDays++;
      if (dayData.intercourse && dayData.intercourse.length > 0) intercourseDays++;
      if (dayData.notes && dayData.notes.trim()) notesDays++;
    });

    // 计算各项得分
    const temperatureScore = (temperatureDays / totalDays) * 40; // 体温记录占40%
    const menstrualScore = Math.min((menstrualDays / totalDays) * 20, 20); // 月经记录占20%
    const intercourseScore = Math.min((intercourseDays / totalDays) * 20, 20); // 同房记录占20%
    const notesScore = (notesDays / totalDays) * 20; // 备注记录占20%

    score = temperatureScore + menstrualScore + intercourseScore + notesScore;

    let assessment;
    if (score >= 80) assessment = '优秀';
    else if (score >= 60) assessment = '良好';
    else if (score >= 40) assessment = '一般';
    else assessment = '需改善';

    return {
      score: Math.round(score),
      assessment,
      details: {
        temperatureRate: Math.round((temperatureDays / totalDays) * 100),
        menstrualRate: Math.round((menstrualDays / totalDays) * 100),
        intercourseRate: Math.round((intercourseDays / totalDays) * 100),
        notesRate: Math.round((notesDays / totalDays) * 100)
      }
    };
  }

  /**
   * 生成图表数据
   */
  generateChartData(dayRecords, cycleCount) {
    const dates = Object.keys(dayRecords).sort().slice(-(cycleCount * 30));
    
    return {
      temperatureData: dates.filter(date => 
        dayRecords[date].temperature && dayRecords[date].temperature.temperature
      ).map(date => ({
        date,
        temperature: dayRecords[date].temperature.temperature
      })),
      menstrualData: dates.filter(date => 
        dayRecords[date].menstrual && dayRecords[date].menstrual.flow
      ).map(date => ({
        date,
        flow: dayRecords[date].menstrual.flow
      })),
      intercourseData: dates.filter(date => 
        dayRecords[date].intercourse && dayRecords[date].intercourse.length > 0
      ).map(date => ({
        date,
        times: dayRecords[date].intercourse.length
      }))
    };
  }

  /**
   * 将报告格式化为文本
   */
  formatReportAsText(reportData) {
    const lines = [];
    
    lines.push('='.repeat(50));
    lines.push('备小孕 - 个人周期分析报告');
    lines.push('='.repeat(50));
    lines.push('');
    
    lines.push(`报告生成时间: ${this.formatDateTime(reportData.generateTime)}`);
    lines.push(`分析周期: ${reportData.reportPeriod}`);
    lines.push('');
    
    // 报告摘要
    lines.push('【报告摘要】');
    lines.push(`总记录天数: ${reportData.summary.totalRecordDays}天`);
    lines.push(`平均周期长度: ${reportData.summary.averageCycleLength}天`);
    lines.push(`周期规律性: ${reportData.summary.cycleRegularity}`);
    lines.push(`体温记录率: ${reportData.summary.temperatureRecordRate}%`);
    lines.push(`平均体温: ${reportData.summary.averageTemperature}°C`);
    lines.push(`月经天数: ${reportData.summary.menstrualDays}天`);
    lines.push(`同房频率: ${reportData.summary.intercourseFrequency}次/月`);
    lines.push('');
    
    // 周期分析
    if (reportData.cycleAnalysis.cycleCount) {
      lines.push('【周期分析】');
      lines.push(`分析周期数: ${reportData.cycleAnalysis.cycleCount}个`);
      lines.push(`平均周期长度: ${reportData.cycleAnalysis.averageLength}天`);
      lines.push(`周期长度范围: ${reportData.cycleAnalysis.lengthRange}`);
      lines.push(`规律性评估: ${reportData.cycleAnalysis.regularityAssessment}`);
      lines.push('');
    } else {
      lines.push('【周期分析】');
      lines.push(reportData.cycleAnalysis.message);
      lines.push('');
    }
    
    // 体温分析
    lines.push('【体温分析】');
    lines.push(`记录率: ${reportData.temperatureAnalysis.recordRate}%`);
    lines.push(`平均体温: ${reportData.temperatureAnalysis.averageTemperature}°C`);
    lines.push(`体温范围: ${reportData.temperatureAnalysis.temperatureRange}`);
    lines.push(`双相模式: ${reportData.temperatureAnalysis.biphasicPattern}`);
    lines.push(`体温趋势: ${reportData.temperatureAnalysis.temperatureTrend}`);
    lines.push(`质量评估: ${reportData.temperatureAnalysis.qualityAssessment}`);
    lines.push('');
    
    // 生育力分析
    lines.push('【生育力分析】');
    lines.push(`当前状态: ${reportData.fertilityAnalysis.currentStatus}`);
    lines.push(`预测置信度: ${reportData.fertilityAnalysis.confidence}`);
    if (reportData.fertilityAnalysis.nextOvulation !== '无法预测') {
      lines.push(`下次排卵预测: ${reportData.fertilityAnalysis.nextOvulation}`);
    }
    if (reportData.fertilityAnalysis.fertilityWindow !== '无法确定') {
      lines.push(`易孕窗口: ${reportData.fertilityAnalysis.fertilityWindow}`);
    }
    lines.push('');
    
    // 数据质量
    lines.push('【数据质量评估】');
    lines.push(`总体评分: ${reportData.dataQuality.score}分 (${reportData.dataQuality.assessment})`);
    lines.push(`体温记录率: ${reportData.dataQuality.details.temperatureRate}%`);
    lines.push(`月经记录率: ${reportData.dataQuality.details.menstrualRate}%`);
    lines.push(`同房记录率: ${reportData.dataQuality.details.intercourseRate}%`);
    lines.push(`备注记录率: ${reportData.dataQuality.details.notesRate}%`);
    lines.push('');
    
    // 建议
    if (reportData.recommendations.length > 0) {
      lines.push('【个性化建议】');
      reportData.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec.title} (${rec.priority === 'high' ? '重要' : '一般'})`);
        lines.push(`   ${rec.content}`);
        lines.push('');
      });
    }
    
    lines.push('='.repeat(50));
    lines.push('报告结束');
    lines.push('');
    lines.push('注意: 本报告仅供参考，如有健康问题请咨询专业医生');
    lines.push('='.repeat(50));
    
    return lines.join('\n');
  }

  // 辅助方法
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  formatDateTime(isoString) {
    const date = new Date(isoString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  getCycleRegularityText(cycles) {
    if (!cycles || cycles.length < 2) return '数据不足';
    
    const completedCycles = cycles.filter(cycle => cycle.isComplete);
    if (completedCycles.length < 2) return '数据不足';
    
    const lengths = completedCycles.map(cycle => {
      const start = new Date(cycle.startDate);
      const end = new Date(cycle.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    });
    
    const variability = Math.max(...lengths) - Math.min(...lengths);
    
    if (variability <= 3) return '非常规律';
    if (variability <= 7) return '较规律';
    if (variability <= 14) return '一般';
    return '不规律';
  }

  assessCycleRegularity(variability) {
    if (variability <= 3) return '周期非常规律，变化很小';
    if (variability <= 7) return '周期较规律，变化在正常范围内';
    if (variability <= 14) return '周期规律性一般，建议关注';
    return '周期不规律，建议咨询医生';
  }

  predictOvulationForCycle(cycle, dayRecords) {
    // 简化的排卵预测逻辑
    if (!cycle.isComplete) return '周期未完成';
    
    const cycleStart = new Date(cycle.startDate);
    const cycleEnd = new Date(cycle.endDate);
    const cycleDays = Math.ceil((cycleEnd - cycleStart) / (1000 * 60 * 60 * 24)) + 1;
    
    // 估算排卵日（周期长度-14天）
    const estimatedOvulationDay = Math.max(1, cycleDays - 14);
    const ovulationDate = new Date(cycleStart);
    ovulationDate.setDate(ovulationDate.getDate() + estimatedOvulationDay - 1);
    
    return this.formatDate(ovulationDate.toISOString().split('T')[0]);
  }

  analyzeTemperaturePattern(cycle, dayRecords) {
    if (!cycle.isComplete) return '周期未完成';
    
    const cycleStart = new Date(cycle.startDate);
    const cycleEnd = new Date(cycle.endDate);
    const temperatures = [];
    
    // 收集周期内的体温数据
    for (let d = new Date(cycleStart); d <= cycleEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (dayRecords[dateStr] && dayRecords[dateStr].temperature && dayRecords[dateStr].temperature.temperature) {
        temperatures.push(dayRecords[dateStr].temperature.temperature);
      }
    }
    
    if (temperatures.length < 10) return '数据不足';
    
    const firstHalf = temperatures.slice(0, Math.floor(temperatures.length / 2));
    const secondHalf = temperatures.slice(Math.floor(temperatures.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff >= 0.3) return '明显双相';
    if (diff >= 0.1) return '轻微双相';
    return '单相或不明显';
  }

  analyzeBiphasicPattern(dayRecords) {
    const dates = Object.keys(dayRecords).sort();
    const temperatures = dates.filter(date => 
      dayRecords[date].temperature && dayRecords[date].temperature.temperature
    ).map(date => dayRecords[date].temperature.temperature);
    
    if (temperatures.length < 20) return '数据不足以分析';
    
    // 简化的双相分析：比较前后两半的平均温度
    const firstHalf = temperatures.slice(0, Math.floor(temperatures.length / 2));
    const secondHalf = temperatures.slice(Math.floor(temperatures.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff >= 0.3) return '双相模式明显';
    if (diff >= 0.1) return '双相模式一般';
    return '双相模式不明显';
  }

  analyzeTemperatureTrend(dayRecords) {
    const dates = Object.keys(dayRecords).sort().slice(-30); // 最近30天
    const temperatures = dates.filter(date => 
      dayRecords[date].temperature && dayRecords[date].temperature.temperature
    ).map(date => dayRecords[date].temperature.temperature);
    
    if (temperatures.length < 10) return '趋势不明确';
    
    // 简单的趋势分析：比较前后两半的平均值
    const firstHalf = temperatures.slice(0, Math.floor(temperatures.length / 2));
    const secondHalf = temperatures.slice(Math.floor(temperatures.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.1) return '体温呈上升趋势';
    if (diff < -0.1) return '体温呈下降趋势';
    return '体温相对稳定';
  }

  assessTemperatureQuality(recordRate) {
    if (recordRate >= 90) return '记录质量优秀';
    if (recordRate >= 80) return '记录质量良好';
    if (recordRate >= 60) return '记录质量一般';
    return '记录质量需改善';
  }

  generateFertilityRecommendations(currentStatus, prediction) {
    const recommendations = [];
    
    if (currentStatus.status === '易孕期') {
      recommendations.push('当前处于易孕期，如有备孕计划，建议增加同房频率');
    } else if (currentStatus.status === '排卵期') {
      recommendations.push('当前处于排卵期，是最佳受孕时机');
    } else {
      recommendations.push('当前不在易孕期，可以正常生活');
    }
    
    if (currentStatus.confidence === '低') {
      recommendations.push('预测置信度较低，建议完善体温记录以提高准确性');
    }
    
    return recommendations;
  }
}

module.exports = new ReportGenerator();