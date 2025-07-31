/**
 * 数据分析功能模块
 * 提供周期统计分析、趋势分析、异常数据检测等功能
 */

const { DateUtils } = require('./date');
const { OvulationAlgorithm } = require('./ovulationAlgorithm');

class DataAnalysis {
  /**
   * 周期统计分析
   * @param {Object} dayRecords 日记录数据
   * @param {Array} cycles 周期数据
   * @returns {Object} 统计分析结果
   */
  static analyzeCycleStatistics(dayRecords, cycles) {
    if (!dayRecords || !cycles || cycles.length === 0) {
      return {
        isValid: false,
        reason: '缺少必要的周期数据'
      };
    }

    const statistics = {
      totalCycles: cycles.length,
      completedCycles: cycles.filter(cycle => cycle.isComplete).length,
      averageCycleLength: 0,
      cycleLengthRange: { min: 0, max: 0 },
      temperatureStatistics: this.analyzeTemperatureStatistics(dayRecords),
      menstrualStatistics: this.analyzeMenstrualStatistics(dayRecords),
      intercourseStatistics: this.analyzeIntercourseStatistics(dayRecords),
      dataCompleteness: this.analyzeDataCompleteness(dayRecords, cycles)
    };

    // 计算周期长度统计
    const completedCycles = cycles.filter(cycle => cycle.isComplete);
    if (completedCycles.length > 0) {
      const cycleLengths = completedCycles.map(cycle => 
        DateUtils.getDaysDifference(cycle.startDate, cycle.endDate) + 1
      );
      
      statistics.averageCycleLength = Math.round(
        cycleLengths.reduce((sum, length) => sum + length, 0) / cycleLengths.length
      );
      statistics.cycleLengthRange = {
        min: Math.min(...cycleLengths),
        max: Math.max(...cycleLengths)
      };
    }

    return {
      isValid: true,
      statistics,
      insights: this.generateStatisticsInsights(statistics)
    };
  }

  /**
   * 分析体温统计数据
   * @param {Object} dayRecords 日记录数据
   * @returns {Object} 体温统计结果
   */
  static analyzeTemperatureStatistics(dayRecords) {
    const temperatureData = Object.values(dayRecords)
      .filter(record => record.temperature && record.temperature.temperature)
      .map(record => ({
        date: record.date,
        temperature: record.temperature.temperature
      }));

    if (temperatureData.length === 0) {
      return {
        totalRecords: 0,
        averageTemperature: 0,
        temperatureRange: { min: 0, max: 0 },
        consistency: 0
      };
    }

    const temperatures = temperatureData.map(item => item.temperature);
    const averageTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
    
    // 计算记录一致性（连续记录天数占比）
    const consistency = this.calculateRecordConsistency(temperatureData);

    return {
      totalRecords: temperatureData.length,
      averageTemperature: Math.round(averageTemperature * 100) / 100,
      temperatureRange: {
        min: Math.min(...temperatures),
        max: Math.max(...temperatures)
      },
      consistency: Math.round(consistency * 100) / 100
    };
  }

  /**
   * 分析月经统计数据
   * @param {Object} dayRecords 日记录数据
   * @returns {Object} 月经统计结果
   */
  static analyzeMenstrualStatistics(dayRecords) {
    const menstrualData = Object.values(dayRecords)
      .filter(record => record.menstrual && record.menstrual.flow && record.menstrual.flow !== 'none');

    if (menstrualData.length === 0) {
      return {
        totalDays: 0,
        averageDuration: 0,
        flowDistribution: { light: 0, medium: 0, heavy: 0 }
      };
    }

    // 统计流量分布
    const flowDistribution = { light: 0, medium: 0, heavy: 0 };
    menstrualData.forEach(record => {
      const flow = record.menstrual.flow;
      if (flowDistribution.hasOwnProperty(flow)) {
        flowDistribution[flow]++;
      }
    });

    // 计算平均经期长度
    const menstrualPeriods = this.groupMenstrualPeriods(menstrualData);
    const averageDuration = menstrualPeriods.length > 0 
      ? Math.round(menstrualPeriods.reduce((sum, period) => sum + period.duration, 0) / menstrualPeriods.length)
      : 0;

    return {
      totalDays: menstrualData.length,
      averageDuration,
      flowDistribution,
      periodsCount: menstrualPeriods.length
    };
  }

  /**
   * 分析同房统计数据
   * @param {Object} dayRecords 日记录数据
   * @returns {Object} 同房统计结果
   */
  static analyzeIntercourseStatistics(dayRecords) {
    const intercourseData = Object.values(dayRecords)
      .filter(record => record.intercourse && record.intercourse.length > 0);

    if (intercourseData.length === 0) {
      return {
        totalDays: 0,
        totalTimes: 0,
        averageFrequency: 0,
        protectionRate: 0
      };
    }

    const totalTimes = intercourseData.reduce((sum, record) => sum + record.intercourse.length, 0);
    const protectedTimes = intercourseData.reduce((sum, record) => {
      return sum + record.intercourse.filter(item => item.protection).length;
    }, 0);

    return {
      totalDays: intercourseData.length,
      totalTimes,
      averageFrequency: Math.round((totalTimes / intercourseData.length) * 100) / 100,
      protectionRate: totalTimes > 0 ? Math.round((protectedTimes / totalTimes) * 100) : 0
    };
  }

  /**
   * 分析数据完整性
   * @param {Object} dayRecords 日记录数据
   * @param {Array} cycles 周期数据
   * @returns {Object} 数据完整性分析
   */
  static analyzeDataCompleteness(dayRecords, cycles) {
    if (cycles.length === 0) {
      return { completeness: 0, missingDays: 0, totalDays: 0 };
    }

    const latestCycle = cycles[cycles.length - 1];
    const cycleStart = new Date(latestCycle.startDate);
    const cycleEnd = new Date(latestCycle.endDate || DateUtils.getToday());
    
    const totalDays = DateUtils.getDaysDifference(latestCycle.startDate, cycleEnd.toISOString().split('T')[0]) + 1;
    const recordedDays = Object.keys(dayRecords).filter(date => {
      const recordDate = new Date(date);
      return recordDate >= cycleStart && recordDate <= cycleEnd;
    }).length;

    const completeness = totalDays > 0 ? (recordedDays / totalDays) * 100 : 0;

    return {
      completeness: Math.round(completeness),
      missingDays: totalDays - recordedDays,
      totalDays,
      recordedDays
    };
  }

  /**
   * 计算记录一致性
   * @param {Array} data 数据数组
   * @returns {number} 一致性百分比
   */
  static calculateRecordConsistency(data) {
    if (data.length < 2) return 0;

    const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
    let consecutiveDays = 0;
    let totalGaps = 0;

    for (let i = 1; i < sortedData.length; i++) {
      const daysDiff = DateUtils.getDaysDifference(sortedData[i - 1].date, sortedData[i].date);
      if (daysDiff === 1) {
        consecutiveDays++;
      } else {
        totalGaps += daysDiff - 1;
      }
    }

    const totalPossibleDays = DateUtils.getDaysDifference(sortedData[0].date, sortedData[sortedData.length - 1].date) + 1;
    return totalPossibleDays > 0 ? (data.length / totalPossibleDays) * 100 : 0;
  }

  /**
   * 将月经数据分组为经期
   * @param {Array} menstrualData 月经数据
   * @returns {Array} 经期分组
   */
  static groupMenstrualPeriods(menstrualData) {
    const sortedData = menstrualData.sort((a, b) => new Date(a.date) - new Date(b.date));
    const periods = [];
    let currentPeriod = null;

    sortedData.forEach(record => {
      const recordDate = new Date(record.date);
      
      if (!currentPeriod) {
        currentPeriod = {
          startDate: record.date,
          endDate: record.date,
          duration: 1,
          flows: [record.menstrual.flow]
        };
      } else {
        const lastDate = new Date(currentPeriod.endDate);
        const daysDiff = DateUtils.getDaysDifference(currentPeriod.endDate, record.date);
        
        if (daysDiff <= 2) {
          // 连续或间隔1天的记录属于同一经期
          currentPeriod.endDate = record.date;
          currentPeriod.duration = DateUtils.getDaysDifference(currentPeriod.startDate, record.date) + 1;
          currentPeriod.flows.push(record.menstrual.flow);
        } else {
          // 开始新的经期
          periods.push(currentPeriod);
          currentPeriod = {
            startDate: record.date,
            endDate: record.date,
            duration: 1,
            flows: [record.menstrual.flow]
          };
        }
      }
    });

    if (currentPeriod) {
      periods.push(currentPeriod);
    }

    return periods;
  }

  /**
   * 生成统计洞察
   * @param {Object} statistics 统计数据
   * @returns {Array} 洞察列表
   */
  static generateStatisticsInsights(statistics) {
    const insights = [];

    // 周期长度洞察
    if (statistics.averageCycleLength > 0) {
      if (statistics.averageCycleLength >= 21 && statistics.averageCycleLength <= 35) {
        insights.push({
          type: 'positive',
          title: '周期长度正常',
          content: `您的平均周期长度为${statistics.averageCycleLength}天，属于正常范围`
        });
      } else {
        insights.push({
          type: 'attention',
          title: '周期长度需关注',
          content: `您的平均周期长度为${statistics.averageCycleLength}天，建议咨询医生`
        });
      }
    }

    // 数据完整性洞察
    if (statistics.dataCompleteness.completeness >= 80) {
      insights.push({
        type: 'positive',
        title: '记录完整度良好',
        content: `数据完整度达到${statistics.dataCompleteness.completeness}%，有助于准确分析`
      });
    } else if (statistics.dataCompleteness.completeness >= 50) {
      insights.push({
        type: 'suggestion',
        title: '建议提高记录频率',
        content: `当前数据完整度为${statistics.dataCompleteness.completeness}%，建议坚持每日记录`
      });
    } else {
      insights.push({
        type: 'attention',
        title: '记录数据不足',
        content: `数据完整度仅为${statistics.dataCompleteness.completeness}%，影响分析准确性`
      });
    }

    // 体温记录洞察
    if (statistics.temperatureStatistics.consistency >= 70) {
      insights.push({
        type: 'positive',
        title: '体温记录规律',
        content: `体温记录一致性达到${statistics.temperatureStatistics.consistency}%`
      });
    }

    return insights;
  }

  /**
   * 趋势分析
   * @param {Object} dayRecords 日记录数据
   * @param {number} days 分析天数
   * @returns {Object} 趋势分析结果
   */
  static analyzeTrends(dayRecords, days = 30) {
    const endDate = DateUtils.getToday();
    const startDate = DateUtils.subtractDays(endDate, days - 1);
    
    const periodData = this.getDataInPeriod(dayRecords, startDate, endDate);
    
    return {
      temperatureTrend: this.analyzeTemperatureTrend(periodData),
      recordingTrend: this.analyzeRecordingTrend(periodData),
      cycleTrend: this.analyzeCycleTrend(periodData),
      period: { startDate, endDate, days }
    };
  }

  /**
   * 获取指定时间段的数据
   * @param {Object} dayRecords 日记录数据
   * @param {string} startDate 开始日期
   * @param {string} endDate 结束日期
   * @returns {Array} 时间段内的数据
   */
  static getDataInPeriod(dayRecords, startDate, endDate) {
    const data = [];
    const dates = DateUtils.getDateRange(startDate, endDate);
    
    dates.forEach(date => {
      const record = dayRecords[date] || { date };
      data.push(record);
    });
    
    return data;
  }

  /**
   * 分析体温趋势
   * @param {Array} periodData 时间段数据
   * @returns {Object} 体温趋势分析
   */
  static analyzeTemperatureTrend(periodData) {
    const temperatureData = periodData
      .filter(record => record.temperature && record.temperature.temperature)
      .map(record => ({
        date: record.date,
        temperature: record.temperature.temperature
      }));

    if (temperatureData.length < 5) {
      return {
        trend: 'insufficient_data',
        description: '体温数据不足，无法分析趋势'
      };
    }

    // 计算线性回归趋势
    const trend = this.calculateLinearTrend(temperatureData.map(item => item.temperature));
    
    let trendDescription = '';
    if (trend.slope > 0.01) {
      trendDescription = '体温呈上升趋势';
    } else if (trend.slope < -0.01) {
      trendDescription = '体温呈下降趋势';
    } else {
      trendDescription = '体温相对稳定';
    }

    return {
      trend: trend.slope > 0.01 ? 'rising' : trend.slope < -0.01 ? 'falling' : 'stable',
      slope: Math.round(trend.slope * 1000) / 1000,
      description: trendDescription,
      dataPoints: temperatureData.length
    };
  }

  /**
   * 分析记录趋势
   * @param {Array} periodData 时间段数据
   * @returns {Object} 记录趋势分析
   */
  static analyzeRecordingTrend(periodData) {
    const totalDays = periodData.length;
    const recordedDays = periodData.filter(record => 
      (record.temperature && record.temperature.temperature) ||
      (record.menstrual && record.menstrual.flow) ||
      (record.intercourse && record.intercourse.length > 0)
    ).length;

    const recordingRate = totalDays > 0 ? (recordedDays / totalDays) * 100 : 0;

    let trendDescription = '';
    if (recordingRate >= 80) {
      trendDescription = '记录频率很高，保持良好习惯';
    } else if (recordingRate >= 60) {
      trendDescription = '记录频率较好，建议继续坚持';
    } else if (recordingRate >= 40) {
      trendDescription = '记录频率一般，建议提高记录频率';
    } else {
      trendDescription = '记录频率较低，建议养成每日记录的习惯';
    }

    return {
      recordingRate: Math.round(recordingRate),
      recordedDays,
      totalDays,
      description: trendDescription
    };
  }

  /**
   * 分析周期趋势
   * @param {Array} periodData 时间段数据
   * @returns {Object} 周期趋势分析
   */
  static analyzeCycleTrend(periodData) {
    const menstrualData = periodData.filter(record => 
      record.menstrual && record.menstrual.flow && record.menstrual.flow !== 'none'
    );

    if (menstrualData.length === 0) {
      return {
        trend: 'no_data',
        description: '暂无月经数据'
      };
    }

    const periods = this.groupMenstrualPeriods(menstrualData);
    
    if (periods.length < 2) {
      return {
        trend: 'insufficient_data',
        description: '月经周期数据不足'
      };
    }

    // 分析最近的周期变化
    const recentPeriods = periods.slice(-2);
    const cycleLengths = [];
    
    for (let i = 1; i < recentPeriods.length; i++) {
      const cycleLength = DateUtils.getDaysDifference(
        recentPeriods[i - 1].startDate,
        recentPeriods[i].startDate
      );
      cycleLengths.push(cycleLength);
    }

    return {
      trend: 'stable',
      recentCycleLengths: cycleLengths,
      periodsAnalyzed: periods.length,
      description: `分析了${periods.length}个月经周期`
    };
  }

  /**
   * 计算线性趋势
   * @param {Array} values 数值数组
   * @returns {Object} 线性回归结果
   */
  static calculateLinearTrend(values) {
    const n = values.length;
    if (n < 2) return { slope: 0, intercept: 0 };

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * values[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * 异常数据检测
   * @param {Object} dayRecords 日记录数据
   * @returns {Object} 异常检测结果
   */
  static detectAnomalies(dayRecords) {
    const anomalies = {
      temperatureAnomalies: this.detectTemperatureAnomalies(dayRecords),
      cycleAnomalies: this.detectCycleAnomalies(dayRecords),
      dataGaps: this.detectDataGaps(dayRecords)
    };

    return {
      anomalies,
      totalAnomalies: Object.values(anomalies).reduce((sum, arr) => sum + arr.length, 0),
      recommendations: this.generateAnomalyRecommendations(anomalies)
    };
  }

  /**
   * 检测体温异常
   * @param {Object} dayRecords 日记录数据
   * @returns {Array} 体温异常列表
   */
  static detectTemperatureAnomalies(dayRecords) {
    const temperatureData = Object.values(dayRecords)
      .filter(record => record.temperature && record.temperature.temperature)
      .map(record => ({
        date: record.date,
        temperature: record.temperature.temperature
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const anomalies = [];

    temperatureData.forEach(record => {
      // 检测异常高温（>38.5°C）
      if (record.temperature > 38.5) {
        anomalies.push({
          type: 'high_temperature',
          date: record.date,
          value: record.temperature,
          description: `体温异常偏高：${record.temperature}°C`
        });
      }
      
      // 检测异常低温（<35.5°C）
      if (record.temperature < 35.5) {
        anomalies.push({
          type: 'low_temperature',
          date: record.date,
          value: record.temperature,
          description: `体温异常偏低：${record.temperature}°C`
        });
      }
    });

    // 检测体温突变
    for (let i = 1; i < temperatureData.length; i++) {
      const current = temperatureData[i];
      const previous = temperatureData[i - 1];
      const tempDiff = Math.abs(current.temperature - previous.temperature);
      
      if (tempDiff > 0.8) {
        anomalies.push({
          type: 'temperature_spike',
          date: current.date,
          value: tempDiff,
          description: `体温突变：相比前一天变化${tempDiff.toFixed(1)}°C`
        });
      }
    }

    return anomalies;
  }

  /**
   * 检测周期异常
   * @param {Object} dayRecords 日记录数据
   * @returns {Array} 周期异常列表
   */
  static detectCycleAnomalies(dayRecords) {
    const menstrualData = Object.values(dayRecords)
      .filter(record => record.menstrual && record.menstrual.flow && record.menstrual.flow !== 'none');

    const periods = this.groupMenstrualPeriods(menstrualData);
    const anomalies = [];

    periods.forEach(period => {
      // 检测经期过长（>8天）
      if (period.duration > 8) {
        anomalies.push({
          type: 'long_period',
          date: period.startDate,
          value: period.duration,
          description: `经期过长：持续${period.duration}天`
        });
      }
      
      // 检测经期过短（<2天）
      if (period.duration < 2) {
        anomalies.push({
          type: 'short_period',
          date: period.startDate,
          value: period.duration,
          description: `经期过短：仅${period.duration}天`
        });
      }
    });

    // 检测周期长度异常
    for (let i = 1; i < periods.length; i++) {
      const cycleLength = DateUtils.getDaysDifference(periods[i - 1].startDate, periods[i].startDate);
      
      if (cycleLength > 40) {
        anomalies.push({
          type: 'long_cycle',
          date: periods[i].startDate,
          value: cycleLength,
          description: `周期过长：${cycleLength}天`
        });
      } else if (cycleLength < 20) {
        anomalies.push({
          type: 'short_cycle',
          date: periods[i].startDate,
          value: cycleLength,
          description: `周期过短：${cycleLength}天`
        });
      }
    }

    return anomalies;
  }

  /**
   * 检测数据缺口
   * @param {Object} dayRecords 日记录数据
   * @returns {Array} 数据缺口列表
   */
  static detectDataGaps(dayRecords) {
    const recordDates = Object.keys(dayRecords).sort();
    const gaps = [];

    for (let i = 1; i < recordDates.length; i++) {
      const daysDiff = DateUtils.getDaysDifference(recordDates[i - 1], recordDates[i]);
      
      if (daysDiff > 3) {
        gaps.push({
          type: 'data_gap',
          startDate: recordDates[i - 1],
          endDate: recordDates[i],
          duration: daysDiff - 1,
          description: `数据缺口：${daysDiff - 1}天未记录`
        });
      }
    }

    return gaps;
  }

  /**
   * 生成异常处理建议
   * @param {Object} anomalies 异常数据
   * @returns {Array} 建议列表
   */
  static generateAnomalyRecommendations(anomalies) {
    const recommendations = [];

    if (anomalies.temperatureAnomalies.length > 0) {
      recommendations.push({
        type: 'temperature',
        title: '体温异常提醒',
        content: '检测到体温异常，建议检查测量方法或咨询医生'
      });
    }

    if (anomalies.cycleAnomalies.length > 0) {
      recommendations.push({
        type: 'cycle',
        title: '周期异常提醒',
        content: '检测到月经周期异常，建议持续观察并咨询妇科医生'
      });
    }

    if (anomalies.dataGaps.length > 0) {
      recommendations.push({
        type: 'data_quality',
        title: '数据完整性提醒',
        content: '存在数据记录缺口，建议养成每日记录的习惯'
      });
    }

    return recommendations;
  }

  /**
   * 生成健康建议
   * @param {Object} analysisResults 分析结果
   * @returns {Array} 健康建议列表
   */
  static generateHealthAdvice(analysisResults) {
    const advice = [];

    // 基于统计数据的建议
    if (analysisResults.statistics) {
      const stats = analysisResults.statistics;
      
      if (stats.dataCompleteness.completeness < 70) {
        advice.push({
          category: 'data_quality',
          priority: 'high',
          title: '提高记录完整性',
          content: '建议每天坚持记录体温、月经等数据，提高分析准确性',
          actionable: true
        });
      }

      if (stats.temperatureStatistics.consistency < 60) {
        advice.push({
          category: 'measurement',
          priority: 'medium',
          title: '规律测温',
          content: '建议每天在同一时间、同一状态下测量体温',
          actionable: true
        });
      }
    }

    // 基于趋势分析的建议
    if (analysisResults.trends) {
      const trends = analysisResults.trends;
      
      if (trends.recordingTrend.recordingRate < 50) {
        advice.push({
          category: 'habit',
          priority: 'high',
          title: '养成记录习惯',
          content: '当前记录频率较低，建议设置提醒，养成每日记录的习惯',
          actionable: true
        });
      }
    }

    // 基于异常检测的建议
    if (analysisResults.anomalies && analysisResults.anomalies.totalAnomalies > 0) {
      advice.push({
        category: 'health',
        priority: 'high',
        title: '关注异常数据',
        content: '检测到一些异常数据，建议咨询医生获得专业建议',
        actionable: true
      });
    }

    // 通用健康建议
    advice.push({
      category: 'lifestyle',
      priority: 'low',
      title: '保持健康生活方式',
      content: '规律作息、均衡饮食、适量运动有助于维持正常的生理周期',
      actionable: false
    });

    return advice.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = {
  DataAnalysis
};