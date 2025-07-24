/**
 * 算法工具类
 * 提供排卵预测、周期分析等算法功能
 */

import { DateUtils } from './date';
import {
  TemperatureRecord,
  MenstrualRecord,
  DayRecord,
  MenstrualCycle,
  ChartDataPoint
} from '../types/index';

export interface OvulationPrediction {
  ovulationDate: string;
  confidence: number; // 0-1
  fertileWindow: {
    start: string;
    end: string;
  };
  method: 'temperature' | 'cycle' | 'combined';
  details: {
    temperatureShift?: {
      detected: boolean;
      shiftDate?: string;
      preOvulationAvg: number;
      postOvulationAvg: number;
    };
    cycleCalculation?: {
      averageCycleLength: number;
      lastPeriodStart: string;
      predictedOvulation: string;
    };
  };
}

export interface CycleAnalysis {
  averageLength: number;
  regularity: number; // 0-1
  lutealPhaseLength: number;
  follicularPhaseLength: number;
  trends: {
    lengthTrend: 'stable' | 'increasing' | 'decreasing' | 'irregular';
    temperatureTrend: 'normal' | 'low' | 'high' | 'irregular';
  };
  recommendations: string[];
}

export interface TemperatureAnalysis {
  averageTemperature: number;
  follicularPhaseAvg: number;
  lutealPhaseAvg: number;
  temperatureShift: number;
  biphasicPattern: boolean;
  coverLine: number;
  anomalies: {
    date: string;
    temperature: number;
    reason: string;
  }[];
}

export class AlgorithmUtils {
  /**
   * 基于基础体温预测排卵
   */
  static predictOvulationByTemperature(
    temperatureRecords: TemperatureRecord[],
    cycles: MenstrualCycle[]
  ): OvulationPrediction | null {
    if (temperatureRecords.length < 10) {
      return null; // 数据不足
    }

    // 按日期排序
    const sortedRecords = temperatureRecords.sort((a, b) => a.date.localeCompare(b.date));
    
    // 检测体温双相变化
    const temperatureShift = this.detectTemperatureShift(sortedRecords);
    
    if (!temperatureShift.detected || !temperatureShift.shiftDate) {
      return null;
    }

    // 排卵日通常在体温上升前1-2天
    const ovulationDate = DateUtils.subtractDays(temperatureShift.shiftDate, 1);
    
    // 计算易孕窗口（排卵前5天到排卵后1天）
    const fertileWindow = {
      start: DateUtils.subtractDays(ovulationDate, 5),
      end: DateUtils.addDays(ovulationDate, 1)
    };

    // 计算置信度
    const confidence = this.calculateTemperatureConfidence(temperatureShift, sortedRecords);

    return {
      ovulationDate,
      confidence,
      fertileWindow,
      method: 'temperature',
      details: {
        temperatureShift
      }
    };
  }

  /**
   * 基于月经周期预测排卵
   */
  static predictOvulationByCycle(cycles: MenstrualCycle[]): OvulationPrediction | null {
    if (cycles.length < 2) {
      return null; // 数据不足
    }

    // 获取最近的完整周期
    const completeCycles = cycles.filter(cycle => cycle.isComplete && cycle.length);
    if (completeCycles.length === 0) {
      return null;
    }

    // 计算平均周期长度
    const averageCycleLength = completeCycles.reduce((sum, cycle) => sum + (cycle.length || 0), 0) / completeCycles.length;
    
    // 获取最后一次月经开始日期
    const lastCycle = cycles[cycles.length - 1];
    if (!lastCycle.startDate) {
      return null;
    }

    // 排卵通常在下次月经前14天
    const nextPeriodDate = DateUtils.addDays(lastCycle.startDate, Math.round(averageCycleLength));
    const ovulationDate = DateUtils.subtractDays(nextPeriodDate, 14);

    // 计算易孕窗口
    const fertileWindow = {
      start: DateUtils.subtractDays(ovulationDate, 5),
      end: DateUtils.addDays(ovulationDate, 1)
    };

    // 计算置信度（基于周期规律性）
    const regularity = this.calculateCycleRegularity(completeCycles);
    const confidence = Math.max(0.3, regularity); // 最低30%置信度

    return {
      ovulationDate,
      confidence,
      fertileWindow,
      method: 'cycle',
      details: {
        cycleCalculation: {
          averageCycleLength: Math.round(averageCycleLength),
          lastPeriodStart: lastCycle.startDate,
          predictedOvulation: ovulationDate
        }
      }
    };
  }

  /**
   * 综合预测排卵（结合体温和周期）
   */
  static predictOvulationCombined(
    temperatureRecords: TemperatureRecord[],
    cycles: MenstrualCycle[]
  ): OvulationPrediction | null {
    const tempPrediction = this.predictOvulationByTemperature(temperatureRecords, cycles);
    const cyclePrediction = this.predictOvulationByCycle(cycles);

    if (!tempPrediction && !cyclePrediction) {
      return null;
    }

    if (!tempPrediction) {
      return cyclePrediction;
    }

    if (!cyclePrediction) {
      return tempPrediction;
    }

    // 综合两种方法的结果
    const tempDate = new Date(tempPrediction.ovulationDate);
    const cycleDate = new Date(cyclePrediction.ovulationDate);
    const daysDiff = Math.abs(DateUtils.getDaysDifference(tempPrediction.ovulationDate, cyclePrediction.ovulationDate));

    // 如果两种方法的结果相差不超过3天，取加权平均
    if (daysDiff <= 3) {
      const tempWeight = tempPrediction.confidence;
      const cycleWeight = cyclePrediction.confidence;
      const totalWeight = tempWeight + cycleWeight;

      const weightedDate = new Date(
        (tempDate.getTime() * tempWeight + cycleDate.getTime() * cycleWeight) / totalWeight
      );

      const combinedOvulationDate = DateUtils.formatDate(weightedDate);
      const combinedConfidence = Math.min(1, (tempPrediction.confidence + cyclePrediction.confidence) / 2 + 0.1);

      return {
        ovulationDate: combinedOvulationDate,
        confidence: combinedConfidence,
        fertileWindow: {
          start: DateUtils.subtractDays(combinedOvulationDate, 5),
          end: DateUtils.addDays(combinedOvulationDate, 1)
        },
        method: 'combined',
        details: {
          temperatureShift: tempPrediction.details.temperatureShift,
          cycleCalculation: cyclePrediction.details.cycleCalculation
        }
      };
    } else {
      // 如果差异较大，选择置信度更高的方法
      return tempPrediction.confidence > cyclePrediction.confidence ? tempPrediction : cyclePrediction;
    }
  }

  /**
   * 检测体温双相变化
   */
  static detectTemperatureShift(records: TemperatureRecord[]): {
    detected: boolean;
    shiftDate?: string;
    preOvulationAvg: number;
    postOvulationAvg: number;
  } {
    if (records.length < 10) {
      return { detected: false, preOvulationAvg: 0, postOvulationAvg: 0 };
    }

    const temperatures = records.map(r => r.temperature);
    let bestShiftIndex = -1;
    let maxTempDiff = 0;

    // 寻找最佳的体温上升点
    for (let i = 6; i < temperatures.length - 3; i++) {
      const preAvg = temperatures.slice(i - 6, i).reduce((sum, temp) => sum + temp, 0) / 6;
      const postAvg = temperatures.slice(i, i + 3).reduce((sum, temp) => sum + temp, 0) / 3;
      
      const tempDiff = postAvg - preAvg;
      
      // 体温上升至少0.2度才认为是有效的双相变化
      if (tempDiff >= 0.2 && tempDiff > maxTempDiff) {
        maxTempDiff = tempDiff;
        bestShiftIndex = i;
      }
    }

    if (bestShiftIndex === -1) {
      return { detected: false, preOvulationAvg: 0, postOvulationAvg: 0 };
    }

    const preOvulationAvg = temperatures.slice(bestShiftIndex - 6, bestShiftIndex).reduce((sum, temp) => sum + temp, 0) / 6;
    const postOvulationAvg = temperatures.slice(bestShiftIndex, bestShiftIndex + 3).reduce((sum, temp) => sum + temp, 0) / 3;

    return {
      detected: true,
      shiftDate: records[bestShiftIndex].date,
      preOvulationAvg: Math.round(preOvulationAvg * 100) / 100,
      postOvulationAvg: Math.round(postOvulationAvg * 100) / 100
    };
  }

  /**
   * 计算体温预测的置信度
   */
  static calculateTemperatureConfidence(
    temperatureShift: { detected: boolean; preOvulationAvg: number; postOvulationAvg: number },
    records: TemperatureRecord[]
  ): number {
    if (!temperatureShift.detected) {
      return 0;
    }

    let confidence = 0.5; // 基础置信度

    // 体温差异越大，置信度越高
    const tempDiff = temperatureShift.postOvulationAvg - temperatureShift.preOvulationAvg;
    if (tempDiff >= 0.3) confidence += 0.2;
    if (tempDiff >= 0.5) confidence += 0.1;

    // 数据点越多，置信度越高
    if (records.length >= 20) confidence += 0.1;
    if (records.length >= 30) confidence += 0.1;

    // 数据连续性检查
    const continuity = this.checkDataContinuity(records);
    confidence += continuity * 0.1;

    return Math.min(1, confidence);
  }

  /**
   * 计算周期规律性
   */
  static calculateCycleRegularity(cycles: MenstrualCycle[]): number {
    if (cycles.length < 3) {
      return 0;
    }

    const lengths = cycles.map(cycle => cycle.length || 0).filter(length => length > 0);
    if (lengths.length < 3) {
      return 0;
    }

    const average = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    const variance = lengths.reduce((sum, length) => sum + Math.pow(length - average, 2), 0) / lengths.length;
    const standardDeviation = Math.sqrt(variance);

    // 标准差越小，规律性越高
    const regularity = Math.max(0, 1 - (standardDeviation / 7)); // 7天作为基准
    
    return Math.round(regularity * 100) / 100;
  }

  /**
   * 检查数据连续性
   */
  static checkDataContinuity(records: TemperatureRecord[]): number {
    if (records.length < 2) {
      return 0;
    }

    const sortedRecords = records.sort((a, b) => a.date.localeCompare(b.date));
    let continuousDays = 0;
    let totalGaps = 0;

    for (let i = 1; i < sortedRecords.length; i++) {
      const daysDiff = DateUtils.getDaysDifference(sortedRecords[i - 1].date, sortedRecords[i].date);
      if (daysDiff === 1) {
        continuousDays++;
      } else {
        totalGaps += daysDiff - 1;
      }
    }

    const continuityRatio = continuousDays / (continuousDays + totalGaps);
    return Math.round(continuityRatio * 100) / 100;
  }

  /**
   * 分析月经周期
   */
  static analyzeCycle(
    cycles: MenstrualCycle[],
    temperatureRecords: TemperatureRecord[]
  ): CycleAnalysis {
    const completeCycles = cycles.filter(cycle => cycle.isComplete && cycle.length);
    
    // 计算平均长度
    const averageLength = completeCycles.length > 0
      ? completeCycles.reduce((sum, cycle) => sum + (cycle.length || 0), 0) / completeCycles.length
      : 28;

    // 计算规律性
    const regularity = this.calculateCycleRegularity(completeCycles);

    // 分析黄体期长度
    const lutealPhaseLength = this.calculateAverageLutealPhase(cycles, temperatureRecords);
    const follicularPhaseLength = averageLength - lutealPhaseLength;

    // 分析趋势
    const trends = this.analyzeCycleTrends(completeCycles, temperatureRecords);

    // 生成建议
    const recommendations = this.generateRecommendations(averageLength, regularity, lutealPhaseLength, trends);

    return {
      averageLength: Math.round(averageLength * 10) / 10,
      regularity,
      lutealPhaseLength,
      follicularPhaseLength,
      trends,
      recommendations
    };
  }

  /**
   * 计算平均黄体期长度
   */
  static calculateAverageLutealPhase(
    cycles: MenstrualCycle[],
    temperatureRecords: TemperatureRecord[]
  ): number {
    // 如果有体温数据，基于体温双相变化计算
    if (temperatureRecords.length > 0) {
      const temperatureShift = this.detectTemperatureShift(temperatureRecords);
      if (temperatureShift.detected && temperatureShift.shiftDate) {
        // 找到体温上升后的下一次月经
        const shiftDate = temperatureShift.shiftDate;
        const nextPeriod = cycles.find(cycle => 
          cycle.startDate > shiftDate && 
          DateUtils.getDaysDifference(shiftDate, cycle.startDate) <= 20
        );
        
        if (nextPeriod) {
          return DateUtils.getDaysDifference(shiftDate, nextPeriod.startDate);
        }
      }
    }

    // 默认黄体期长度
    return 14;
  }

  /**
   * 分析周期趋势
   */
  static analyzeCycleTrends(
    cycles: MenstrualCycle[],
    temperatureRecords: TemperatureRecord[]
  ): {
    lengthTrend: 'stable' | 'increasing' | 'decreasing' | 'irregular';
    temperatureTrend: 'normal' | 'low' | 'high' | 'irregular';
  } {
    let lengthTrend: 'stable' | 'increasing' | 'decreasing' | 'irregular' = 'stable';
    let temperatureTrend: 'normal' | 'low' | 'high' | 'irregular' = 'normal';

    // 分析周期长度趋势
    if (cycles.length >= 3) {
      const recentCycles = cycles.slice(-3);
      const lengths = recentCycles.map(cycle => cycle.length || 0);
      
      if (lengths[2] > lengths[1] && lengths[1] > lengths[0]) {
        lengthTrend = 'increasing';
      } else if (lengths[2] < lengths[1] && lengths[1] < lengths[0]) {
        lengthTrend = 'decreasing';
      } else {
        const variance = lengths.reduce((sum, length) => {
          const avg = lengths.reduce((s, l) => s + l, 0) / lengths.length;
          return sum + Math.pow(length - avg, 2);
        }, 0) / lengths.length;
        
        lengthTrend = variance > 9 ? 'irregular' : 'stable'; // 3天标准差
      }
    }

    // 分析体温趋势
    if (temperatureRecords.length >= 10) {
      const avgTemp = temperatureRecords.reduce((sum, record) => sum + record.temperature, 0) / temperatureRecords.length;
      
      if (avgTemp < 36.2) {
        temperatureTrend = 'low';
      } else if (avgTemp > 36.8) {
        temperatureTrend = 'high';
      } else {
        // 检查体温变异性
        const variance = temperatureRecords.reduce((sum, record) => 
          sum + Math.pow(record.temperature - avgTemp, 2), 0) / temperatureRecords.length;
        
        temperatureTrend = variance > 0.1 ? 'irregular' : 'normal';
      }
    }

    return { lengthTrend, temperatureTrend };
  }

  /**
   * 生成健康建议
   */
  static generateRecommendations(
    averageLength: number,
    regularity: number,
    lutealPhaseLength: number,
    trends: { lengthTrend: string; temperatureTrend: string }
  ): string[] {
    const recommendations: string[] = [];

    // 周期长度建议
    if (averageLength < 21) {
      recommendations.push('周期偏短，建议咨询医生排除多囊卵巢等问题');
    } else if (averageLength > 35) {
      recommendations.push('周期偏长，建议关注排卵情况，必要时咨询医生');
    }

    // 规律性建议
    if (regularity < 0.7) {
      recommendations.push('周期不够规律，建议保持规律作息，减少压力');
    }

    // 黄体期建议
    if (lutealPhaseLength < 10) {
      recommendations.push('黄体期偏短，建议补充维生素B6和维生素E');
    } else if (lutealPhaseLength > 16) {
      recommendations.push('黄体期偏长，建议观察是否有怀孕可能');
    }

    // 趋势建议
    if (trends.lengthTrend === 'irregular') {
      recommendations.push('周期变化较大，建议记录生活方式变化，寻找影响因素');
    }

    if (trends.temperatureTrend === 'low') {
      recommendations.push('基础体温偏低，建议注意保暖，适当运动');
    } else if (trends.temperatureTrend === 'high') {
      recommendations.push('基础体温偏高，注意是否有炎症或其他健康问题');
    }

    // 通用建议
    if (recommendations.length === 0) {
      recommendations.push('数据显示周期正常，继续保持良好的生活习惯');
    }

    return recommendations;
  }

  /**
   * 计算覆盖线（Cover Line）
   */
  static calculateCoverLine(temperatureRecords: TemperatureRecord[]): number {
    if (temperatureRecords.length < 6) {
      return 0;
    }

    const temperatureShift = this.detectTemperatureShift(temperatureRecords);
    if (!temperatureShift.detected) {
      return 0;
    }

    // 覆盖线通常是排卵前6天体温的最高值 + 0.1°C
    const preOvulationTemps = temperatureRecords
      .filter(record => record.date < (temperatureShift.shiftDate || ''))
      .slice(-6)
      .map(record => record.temperature);

    if (preOvulationTemps.length === 0) {
      return 0;
    }

    const maxPreOvulationTemp = Math.max(...preOvulationTemps);
    return Math.round((maxPreOvulationTemp + 0.1) * 100) / 100;
  }

  /**
   * 检测体温异常
   */
  static detectTemperatureAnomalies(temperatureRecords: TemperatureRecord[]): {
    date: string;
    temperature: number;
    reason: string;
  }[] {
    const anomalies: { date: string; temperature: number; reason: string }[] = [];
    
    if (temperatureRecords.length < 5) {
      return anomalies;
    }

    const sortedRecords = temperatureRecords.sort((a, b) => a.date.localeCompare(b.date));
    const avgTemp = sortedRecords.reduce((sum, record) => sum + record.temperature, 0) / sortedRecords.length;
    const stdDev = Math.sqrt(
      sortedRecords.reduce((sum, record) => sum + Math.pow(record.temperature - avgTemp, 2), 0) / sortedRecords.length
    );

    sortedRecords.forEach((record, index) => {
      const temp = record.temperature;
      
      // 检测异常高温
      if (temp > avgTemp + 2 * stdDev) {
        anomalies.push({
          date: record.date,
          temperature: temp,
          reason: '体温异常偏高，可能发热或测量错误'
        });
      }
      
      // 检测异常低温
      if (temp < avgTemp - 2 * stdDev) {
        anomalies.push({
          date: record.date,
          temperature: temp,
          reason: '体温异常偏低，可能测量错误或身体状况异常'
        });
      }
      
      // 检测突然变化
      if (index > 0) {
        const prevTemp = sortedRecords[index - 1].temperature;
        const tempChange = Math.abs(temp - prevTemp);
        
        if (tempChange > 0.5) {
          anomalies.push({
            date: record.date,
            temperature: temp,
            reason: `体温变化过大（${tempChange.toFixed(1)}°C），请检查测量条件`
          });
        }
      }
    });

    return anomalies;
  }
}