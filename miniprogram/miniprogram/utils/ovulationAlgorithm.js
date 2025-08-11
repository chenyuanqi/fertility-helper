/**
 * 排卵预测算法模块
 * 基于基础体温、月经周期等数据进行排卵预测
 */

const { DateUtils } = require('./date');

class OvulationAlgorithm {
  /**
   * 兼容方法：分析体温数据（测试使用的API名）
   * @param {Array} temperatureData [{date, temperature}]
   * @returns {Object} 分析结果，至少包含 isValid 字段
   */
  static analyzeTemperatureData(temperatureData) {
    try {
      if (!Array.isArray(temperatureData)) {
        return { isValid: false, reason: '无效的体温数据' };
      }
      // 过滤非法值，保证输入稳定
      const normalized = (temperatureData || [])
        .filter(item => item && item.date && typeof item.temperature === 'number')
        .map(item => ({ date: item.date, temperature: item.temperature }));
      // 复用基础体温分析
      const result = this.analyzeBasalTemperature(normalized);
      // 确保返回对象至少包含 isValid
      return result || { isValid: false };
    } catch (e) {
      return { isValid: false, reason: '分析异常' };
    }
  }
  /**
   * 分析基础体温数据，识别排卵模式
   * @param {Array} temperatureData 体温数据数组 [{date, temperature}, ...]
   * @returns {Object} 分析结果
   */
  static analyzeBasalTemperature(temperatureData) {
    if (!temperatureData || temperatureData.length < 10) {
      return {
        isValid: false,
        reason: '体温数据不足，至少需要10天的连续数据'
      };
    }

    // 按日期排序
    const sortedData = temperatureData
      .filter(item => item.temperature && item.temperature > 35 && item.temperature < 40)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sortedData.length < 10) {
      return {
        isValid: false,
        reason: '有效体温数据不足'
      };
    }

    // 计算移动平均线（3天）
    const movingAverages = this.calculateMovingAverage(sortedData, 3);
    
    // 识别体温升高模式
    const temperatureShift = this.detectTemperatureShift(movingAverages);
    
    // 计算覆盖线
    const coverLine = this.calculateCoverLine(sortedData, temperatureShift);

    return {
      isValid: true,
      temperatureShift,
      coverLine,
      movingAverages,
      analysis: this.generateTemperatureAnalysis(temperatureShift, coverLine)
    };
  }

  /**
   * 计算移动平均线
   * @param {Array} data 体温数据
   * @param {number} window 窗口大小
   * @returns {Array} 移动平均数据
   */
  static calculateMovingAverage(data, window = 3) {
    const result = [];
    
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const average = slice.reduce((sum, item) => sum + item.temperature, 0) / window;
      
      result.push({
        date: data[i].date,
        temperature: data[i].temperature,
        movingAverage: Math.round(average * 100) / 100
      });
    }
    
    return result;
  }

  /**
   * 检测体温升高模式（排卵信号）
   * @param {Array} movingAverages 移动平均数据
   * @returns {Object} 体温升高分析结果
   */
  static detectTemperatureShift(movingAverages) {
    const shifts = [];
    
    // 寻找连续3天体温升高的模式
    for (let i = 3; i < movingAverages.length; i++) {
      const current = movingAverages[i];
      const previous3Days = movingAverages.slice(i - 3, i);
      
      // 计算前3天的平均温度
      const previousAvg = previous3Days.reduce((sum, item) => sum + item.movingAverage, 0) / 3;
      
      // 检查当前温度是否比前3天平均温度高0.2度以上
      if (current.movingAverage - previousAvg >= 0.2) {
        // 检查后续2天是否保持高温
        const next2Days = movingAverages.slice(i + 1, i + 3);
        if (next2Days.length >= 2) {
          const sustainedHigh = next2Days.every(item => 
            item.movingAverage >= current.movingAverage - 0.1
          );
          
          if (sustainedHigh) {
            shifts.push({
              date: current.date,
              shiftTemperature: current.movingAverage,
              previousAverage: Math.round(previousAvg * 100) / 100,
              temperatureRise: Math.round((current.movingAverage - previousAvg) * 100) / 100,
              confidence: this.calculateShiftConfidence(current, previous3Days, next2Days)
            });
          }
        }
      }
    }

    return {
      shifts,
      mostLikelyShift: shifts.length > 0 ? shifts[shifts.length - 1] : null
    };
  }

  /**
   * 计算体温升高的置信度
   * @param {Object} current 当前数据点
   * @param {Array} previous3Days 前3天数据
   * @param {Array} next2Days 后2天数据
   * @returns {string} 置信度等级
   */
  static calculateShiftConfidence(current, previous3Days, next2Days) {
    const previousAvg = previous3Days.reduce((sum, item) => sum + item.movingAverage, 0) / 3;
    const temperatureRise = current.movingAverage - previousAvg;
    const sustainedDays = next2Days.filter(item => 
      item.movingAverage >= current.movingAverage - 0.1
    ).length;

    if (temperatureRise >= 0.4 && sustainedDays >= 2) {
      return 'high'; // 高置信度
    } else if (temperatureRise >= 0.3 && sustainedDays >= 1) {
      return 'medium'; // 中等置信度
    } else {
      return 'low'; // 低置信度
    }
  }

  /**
   * 计算覆盖线
   * @param {Array} temperatureData 体温数据
   * @param {Object} temperatureShift 体温升高分析
   * @returns {Object} 覆盖线信息
   */
  static calculateCoverLine(temperatureData, temperatureShift) {
    if (!temperatureShift.mostLikelyShift) {
      return null;
    }

    const shiftDate = temperatureShift.mostLikelyShift.date;
    const shiftIndex = temperatureData.findIndex(item => item.date === shiftDate);
    
    if (shiftIndex < 6) {
      return null; // 数据不足
    }

    // 取排卵前6天的最高体温
    const preOvulationData = temperatureData.slice(Math.max(0, shiftIndex - 6), shiftIndex);
    const highestPreTemp = Math.max(...preOvulationData.map(item => item.temperature));
    
    // 覆盖线 = 排卵前最高体温 + 0.1度
    const coverLineTemp = Math.round((highestPreTemp + 0.1) * 100) / 100;

    return {
      temperature: coverLineTemp,
      baseTemperature: highestPreTemp,
      shiftDate: shiftDate,
      description: `覆盖线温度：${coverLineTemp}°C`
    };
  }

  /**
   * 生成体温分析报告
   * @param {Object} temperatureShift 体温升高分析
   * @param {Object} coverLine 覆盖线信息
   * @returns {Object} 分析报告
   */
  static generateTemperatureAnalysis(temperatureShift, coverLine) {
    const analysis = {
      ovulationDetected: false,
      ovulationDate: null,
      confidence: 'low',
      description: '',
      recommendations: []
    };

    if (temperatureShift.mostLikelyShift) {
      const shift = temperatureShift.mostLikelyShift;
      analysis.ovulationDetected = true;
      
      // 排卵日通常在体温升高前1-2天
      const ovulationDate = DateUtils.subtractDays(shift.date, 1);
      analysis.ovulationDate = ovulationDate;
      analysis.confidence = shift.confidence;
      
      switch (shift.confidence) {
        case 'high':
          analysis.description = `检测到明显的体温升高模式，排卵日很可能是${DateUtils.formatDisplayDate(ovulationDate)}`;
          analysis.recommendations.push('体温模式清晰，可以较为准确地判断排卵时间');
          break;
        case 'medium':
          analysis.description = `检测到体温升高模式，排卵日可能是${DateUtils.formatDisplayDate(ovulationDate)}`;
          analysis.recommendations.push('建议继续记录体温以提高预测准确性');
          break;
        case 'low':
          analysis.description = `体温有升高趋势，但模式不够明显`;
          analysis.recommendations.push('建议保持规律的测温时间，提高数据质量');
          break;
      }
    } else {
      analysis.description = '暂未检测到明显的排卵体温模式';
      analysis.recommendations.push('建议继续坚持每日测温，至少记录一个完整周期');
      analysis.recommendations.push('确保每天在同一时间、同一状态下测量体温');
    }

    return analysis;
  }

  /**
   * 分析月经周期规律
   * @param {Array} menstrualData 月经数据 [{date, flow, isStart, isEnd}, ...]
   * @returns {Object} 周期分析结果
   */
  static analyzeMenstrualCycle(menstrualData) {
    if (!menstrualData || menstrualData.length === 0) {
      return {
        isValid: false,
        reason: '缺少月经记录数据'
      };
    }

    // 提取月经开始日期
    const menstrualStarts = menstrualData
      .filter(item => item.isStart || (item.flow && item.flow !== 'none'))
      .map(item => item.date)
      .sort();

    if (menstrualStarts.length < 2) {
      return {
        isValid: false,
        reason: '至少需要2个月经周期的数据'
      };
    }

    // 计算周期长度
    const cycleLengths = [];
    for (let i = 1; i < menstrualStarts.length; i++) {
      const cycleLength = DateUtils.getDaysDifference(menstrualStarts[i - 1], menstrualStarts[i]);
      cycleLengths.push(cycleLength);
    }

    // 计算平均周期长度
    const averageCycleLength = Math.round(
      cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
    );

    // 计算周期变异性
    const cycleVariability = this.calculateCycleVariability(cycleLengths);

    // 预测下次月经
    const lastMenstrualStart = menstrualStarts[menstrualStarts.length - 1];
    const nextMenstrualDate = DateUtils.addDays(lastMenstrualStart, averageCycleLength);

    return {
      isValid: true,
      averageCycleLength,
      cycleLengths,
      cycleVariability,
      lastMenstrualStart,
      nextMenstrualDate,
      regularity: this.assessCycleRegularity(cycleVariability),
      analysis: this.generateCycleAnalysis(averageCycleLength, cycleVariability)
    };
  }

  /**
   * 计算周期变异性
   * @param {Array} cycleLengths 周期长度数组
   * @returns {Object} 变异性分析
   */
  static calculateCycleVariability(cycleLengths) {
    if (cycleLengths.length < 2) {
      return { standardDeviation: 0, variance: 0 };
    }

    const mean = cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length;
    const variance = cycleLengths.reduce((sum, length) => sum + Math.pow(length - mean, 2), 0) / cycleLengths.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100
    };
  }

  /**
   * 评估周期规律性
   * @param {Object} cycleVariability 周期变异性
   * @returns {string} 规律性等级
   */
  static assessCycleRegularity(cycleVariability) {
    const stdDev = cycleVariability.standardDeviation;
    
    if (stdDev <= 2) {
      return 'very_regular'; // 非常规律
    } else if (stdDev <= 4) {
      return 'regular'; // 规律
    } else if (stdDev <= 7) {
      return 'somewhat_irregular'; // 略不规律
    } else {
      return 'irregular'; // 不规律
    }
  }

  /**
   * 生成周期分析报告
   * @param {number} averageCycleLength 平均周期长度
   * @param {Object} cycleVariability 周期变异性
   * @returns {Object} 分析报告
   */
  static generateCycleAnalysis(averageCycleLength, cycleVariability) {
    const analysis = {
      description: '',
      recommendations: [],
      healthStatus: 'normal'
    };

    // 评估周期长度
    if (averageCycleLength >= 21 && averageCycleLength <= 35) {
      analysis.description = `您的平均月经周期为${averageCycleLength}天，属于正常范围`;
      analysis.healthStatus = 'normal';
    } else if (averageCycleLength < 21) {
      analysis.description = `您的平均月经周期为${averageCycleLength}天，偏短`;
      analysis.healthStatus = 'attention';
      analysis.recommendations.push('周期偏短，建议咨询妇科医生');
    } else {
      analysis.description = `您的平均月经周期为${averageCycleLength}天，偏长`;
      analysis.healthStatus = 'attention';
      analysis.recommendations.push('周期偏长，建议咨询妇科医生');
    }

    // 评估规律性
    const regularity = this.assessCycleRegularity(cycleVariability);
    switch (regularity) {
      case 'very_regular':
        analysis.recommendations.push('月经周期非常规律，有利于排卵预测');
        break;
      case 'regular':
        analysis.recommendations.push('月经周期较为规律，可以进行排卵预测');
        break;
      case 'somewhat_irregular':
        analysis.recommendations.push('月经周期略有波动，建议继续观察记录');
        break;
      case 'irregular':
        analysis.recommendations.push('月经周期不规律，建议咨询医生并继续记录');
        analysis.healthStatus = 'attention';
        break;
    }

    return analysis;
  }

  /**
   * 计算排卵窗口
   * @param {Object} cycleAnalysis 周期分析结果
   * @param {Object} temperatureAnalysis 体温分析结果
   * @returns {Object} 排卵窗口预测
   */
  static calculateOvulationWindow(cycleAnalysis, temperatureAnalysis = null) {
    if (!cycleAnalysis.isValid) {
      return {
        isValid: false,
        reason: '缺少有效的周期数据'
      };
    }

    const { averageCycleLength, lastMenstrualStart } = cycleAnalysis;
    
    // 基于周期的排卵预测（排卵通常在下次月经前14天）
    const predictedOvulationDate = DateUtils.addDays(lastMenstrualStart, averageCycleLength - 14);
    
    // 排卵窗口：排卵日前5天到排卵日后1天
    const windowStart = DateUtils.subtractDays(predictedOvulationDate, 5);
    const windowEnd = DateUtils.addDays(predictedOvulationDate, 1);

    let confidence = 'medium';
    let actualOvulationDate = predictedOvulationDate;

    // 如果有体温分析结果，优先使用体温预测
    if (temperatureAnalysis && temperatureAnalysis.ovulationDetected) {
      actualOvulationDate = temperatureAnalysis.ovulationDate;
      confidence = temperatureAnalysis.confidence;
      
      // 基于实际排卵日调整窗口
      const windowStartAdjusted = DateUtils.subtractDays(actualOvulationDate, 5);
      const windowEndAdjusted = DateUtils.addDays(actualOvulationDate, 1);
      
      return {
        isValid: true,
        ovulationDate: actualOvulationDate,
        windowStart: windowStartAdjusted,
        windowEnd: windowEndAdjusted,
        confidence,
        method: 'temperature_based',
        description: `基于体温分析，排卵日为${DateUtils.formatDisplayDate(actualOvulationDate)}`
      };
    }

    return {
      isValid: true,
      ovulationDate: predictedOvulationDate,
      windowStart,
      windowEnd,
      confidence,
      method: 'cycle_based',
      description: `基于月经周期，预测排卵日为${DateUtils.formatDisplayDate(predictedOvulationDate)}`
    };
  }

  /**
   * 预测易孕期
   * @param {Object} ovulationWindow 排卵窗口
   * @returns {Object} 易孕期预测
   */
  static predictFertileWindow(ovulationWindow) {
    if (!ovulationWindow.isValid) {
      return {
        isValid: false,
        reason: '无法确定排卵窗口'
      };
    }

    const { ovulationDate, confidence } = ovulationWindow;
    
    // 易孕期：排卵日前5天到排卵日当天
    const fertileStart = DateUtils.subtractDays(ovulationDate, 5);
    const fertileEnd = ovulationDate;
    
    // 最佳受孕期：排卵日前2天到排卵日当天
    const optimalStart = DateUtils.subtractDays(ovulationDate, 2);
    const optimalEnd = ovulationDate;

    // 计算当前日期在易孕期中的位置
    const today = DateUtils.getToday();
    const fertileStatus = this.getFertileStatus(today, fertileStart, fertileEnd, optimalStart, optimalEnd);

    return {
      isValid: true,
      fertileStart,
      fertileEnd,
      optimalStart,
      optimalEnd,
      ovulationDate,
      confidence,
      currentStatus: fertileStatus,
      recommendations: this.generateFertileRecommendations(fertileStatus, confidence)
    };
  }

  /**
   * 获取当前的易孕期状态
   * @param {string} today 今天日期
   * @param {string} fertileStart 易孕期开始
   * @param {string} fertileEnd 易孕期结束
   * @param {string} optimalStart 最佳受孕期开始
   * @param {string} optimalEnd 最佳受孕期结束
   * @returns {Object} 易孕期状态
   */
  static getFertileStatus(today, fertileStart, fertileEnd, optimalStart, optimalEnd) {
    const todayDate = new Date(today);
    const fertileStartDate = new Date(fertileStart);
    const fertileEndDate = new Date(fertileEnd);
    const optimalStartDate = new Date(optimalStart);
    const optimalEndDate = new Date(optimalEnd);

    if (todayDate >= optimalStartDate && todayDate <= optimalEndDate) {
      return {
        phase: 'optimal',
        description: '最佳受孕期',
        daysToOvulation: DateUtils.getDaysDifference(today, fertileEnd),
        fertility: 'high'
      };
    } else if (todayDate >= fertileStartDate && todayDate <= fertileEndDate) {
      return {
        phase: 'fertile',
        description: '易孕期',
        daysToOvulation: DateUtils.getDaysDifference(today, fertileEnd),
        fertility: 'medium'
      };
    } else if (todayDate < fertileStartDate) {
      const daysToFertile = DateUtils.getDaysDifference(today, fertileStart);
      return {
        phase: 'pre_fertile',
        description: '易孕期前',
        daysToFertile,
        fertility: 'low'
      };
    } else {
      return {
        phase: 'post_fertile',
        description: '易孕期后',
        daysSinceOvulation: DateUtils.getDaysDifference(fertileEnd, today),
        fertility: 'low'
      };
    }
  }

  /**
   * 生成易孕期建议
   * @param {Object} fertileStatus 易孕期状态
   * @param {string} confidence 预测置信度
   * @returns {Array} 建议列表
   */
  static generateFertileRecommendations(fertileStatus, confidence) {
    const recommendations = [];

    switch (fertileStatus.phase) {
      case 'optimal':
        recommendations.push('现在是最佳受孕期，如果计划怀孕，建议增加同房频率');
        recommendations.push('保持放松心情，避免过度紧张');
        break;
      case 'fertile':
        recommendations.push('现在是易孕期，如果计划怀孕，可以安排同房');
        recommendations.push('注意观察身体变化，如宫颈粘液等排卵征象');
        break;
      case 'pre_fertile':
        recommendations.push(`距离易孕期还有${fertileStatus.daysToFertile}天，可以开始准备`);
        recommendations.push('继续记录体温和其他生理指标');
        break;
      case 'post_fertile':
        recommendations.push('已过易孕期，本周期受孕概率较低');
        recommendations.push('继续记录数据，为下个周期做准备');
        break;
    }

    // 根据置信度添加额外建议
    if (confidence === 'low') {
      recommendations.push('预测置信度较低，建议继续记录更多数据以提高准确性');
    }

    return recommendations;
  }

  /**
   * 综合分析 - 整合所有算法结果
   * @param {Array} temperatureData 体温数据
   * @param {Array} menstrualData 月经数据
   * @param {Array} intercourseData 同房数据
   * @returns {Object} 综合分析结果
   */
  static comprehensiveAnalysis(temperatureData, menstrualData, intercourseData = []) {
    // 分析基础体温
    const temperatureAnalysis = this.analyzeBasalTemperature(temperatureData);
    
    // 分析月经周期
    const cycleAnalysis = this.analyzeMenstrualCycle(menstrualData);
    
    // 计算排卵窗口
    const ovulationWindow = this.calculateOvulationWindow(cycleAnalysis, temperatureAnalysis.isValid ? temperatureAnalysis : null);
    
    // 预测易孕期
    const fertileWindow = this.predictFertileWindow(ovulationWindow);

    // 生成综合建议
    const recommendations = this.generateComprehensiveRecommendations(
      temperatureAnalysis,
      cycleAnalysis,
      ovulationWindow,
      fertileWindow,
      intercourseData
    );

    return {
      temperatureAnalysis,
      cycleAnalysis,
      ovulationWindow,
      fertileWindow,
      recommendations,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 生成综合建议
   * @param {Object} temperatureAnalysis 体温分析
   * @param {Object} cycleAnalysis 周期分析
   * @param {Object} ovulationWindow 排卵窗口
   * @param {Object} fertileWindow 易孕期
   * @param {Array} intercourseData 同房数据
   * @returns {Array} 综合建议
   */
  static generateComprehensiveRecommendations(temperatureAnalysis, cycleAnalysis, ovulationWindow, fertileWindow, intercourseData) {
    const recommendations = [];

    // 数据质量建议
    if (!temperatureAnalysis.isValid) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        title: '建议坚持记录体温',
        content: '体温数据是排卵预测的重要指标，建议每天在同一时间测量并记录'
      });
    }

    if (!cycleAnalysis.isValid) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        title: '建议记录月经信息',
        content: '月经周期数据有助于更准确地预测排卵期和易孕期'
      });
    }

    // 健康状态建议
    if (cycleAnalysis.isValid && cycleAnalysis.analysis.healthStatus === 'attention') {
      recommendations.push({
        type: 'health',
        priority: 'medium',
        title: '关注月经周期健康',
        content: cycleAnalysis.analysis.description
      });
    }

    // 备孕建议
    if (fertileWindow.isValid) {
      recommendations.push({
        type: 'fertility',
        priority: 'high',
        title: '易孕期指导',
        content: fertileWindow.currentStatus.description,
        details: fertileWindow.recommendations
      });
    }

    // 同房频率建议
    if (intercourseData.length > 0) {
      const recentIntercourse = intercourseData.filter(item => {
        const daysDiff = DateUtils.getDaysDifference(item.date, DateUtils.getToday());
        return daysDiff <= 7;
      });

      if (fertileWindow.isValid && fertileWindow.currentStatus.fertility === 'high' && recentIntercourse.length === 0) {
        recommendations.push({
          type: 'timing',
          priority: 'high',
          title: '最佳受孕时机',
          content: '现在是高受孕概率期，如果计划怀孕，建议安排同房'
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = {
  OvulationAlgorithm
};