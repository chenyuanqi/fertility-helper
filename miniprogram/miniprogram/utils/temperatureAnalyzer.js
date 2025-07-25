/**
 * 基础体温分析算法
 * 用于计算cover-line、排卵日预测等
 */

class TemperatureAnalyzer {
  /**
   * 计算Cover-line（覆盖线）
   * 基于体温数据计算覆盖线，用于区分低温期和高温期
   * @param {Array} temperatureData 体温数据数组
   * @returns {Object} 包含覆盖线温度和相关信息
   */
  static calculateCoverLine(temperatureData) {
    if (!temperatureData || temperatureData.length < 6) {
      return {
        temperature: null,
        isValid: false,
        message: '数据不足，需要至少6天的体温记录'
      };
    }

    // 过滤有效的体温数据
    const validTemps = temperatureData
      .filter(item => item.temperature && item.temperature.temperature)
      .map(item => ({
        date: item.date,
        temperature: item.temperature.temperature,
        time: item.temperature.time
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (validTemps.length < 6) {
      return {
        temperature: null,
        isValid: false,
        message: '有效体温数据不足'
      };
    }

    // 寻找体温上升模式
    const temperatureShift = this.findTemperatureShift(validTemps);
    
    if (!temperatureShift.found) {
      return {
        temperature: null,
        isValid: false,
        message: '未找到明显的体温上升模式'
      };
    }

    // 计算覆盖线温度
    const coverLineTemp = this.calculateCoverLineTemperature(validTemps, temperatureShift.shiftIndex);

    return {
      temperature: coverLineTemp,
      isValid: true,
      shiftDate: temperatureShift.shiftDate,
      shiftIndex: temperatureShift.shiftIndex,
      message: '覆盖线计算成功'
    };
  }

  /**
   * 寻找体温上升模式
   * 体温上升规律：连续3天体温比前6天低温期平均值高0.2°C以上
   */
  static findTemperatureShift(validTemps) {
    if (validTemps.length < 9) { // 至少需要6天低温期 + 3天高温期
      return { found: false };
    }

    for (let i = 6; i <= validTemps.length - 3; i++) {
      // 取前6天作为低温期参考
      const lowTempPeriod = validTemps.slice(i - 6, i);
      const avgLowTemp = lowTempPeriod.reduce((sum, item) => sum + item.temperature, 0) / 6;

      // 检查后续3天是否都比低温期平均值高0.2°C以上
      const highTempPeriod = validTemps.slice(i, i + 3);
      const isTemperatureShift = highTempPeriod.every(item => 
        item.temperature >= avgLowTemp + 0.2
      );

      if (isTemperatureShift) {
        return {
          found: true,
          shiftIndex: i,
          shiftDate: validTemps[i].date,
          avgLowTemp,
          highTempStart: highTempPeriod[0].temperature
        };
      }
    }

    return { found: false };
  }

  /**
   * 计算覆盖线温度
   * 覆盖线 = 体温上升前6天中最高温度 + 0.1°C
   */
  static calculateCoverLineTemperature(validTemps, shiftIndex) {
    const lowTempPeriod = validTemps.slice(shiftIndex - 6, shiftIndex);
    const maxLowTemp = Math.max(...lowTempPeriod.map(item => item.temperature));
    
    return Math.round((maxLowTemp + 0.1) * 10) / 10; // 保留一位小数
  }

  /**
   * 预测排卵日
   * 基于体温上升模式预测排卵日
   */
  static predictOvulationDay(temperatureData, menstrualData) {
    const coverLineResult = this.calculateCoverLine(temperatureData);
    
    if (!coverLineResult.isValid) {
      return {
        date: null,
        isValid: false,
        method: 'temperature',
        message: '无法基于体温数据预测排卵日'
      };
    }

    // 排卵日通常在体温上升前1-2天
    const shiftDate = new Date(coverLineResult.shiftDate);
    const ovulationDate = new Date(shiftDate);
    ovulationDate.setDate(ovulationDate.getDate() - 1);

    return {
      date: this.formatDate(ovulationDate),
      isValid: true,
      method: 'temperature',
      confidence: this.calculatePredictionConfidence(temperatureData, coverLineResult),
      message: '基于体温上升模式预测'
    };
  }

  /**
   * 计算预测置信度
   */
  static calculatePredictionConfidence(temperatureData, coverLineResult) {
    // 基于数据质量计算置信度
    const validCount = temperatureData.filter(item => 
      item.temperature && item.temperature.temperature
    ).length;

    if (validCount < 10) return 'low';
    if (validCount < 20) return 'medium';
    return 'high';
  }

  /**
   * 分析体温趋势
   */
  static analyzeTemperatureTrend(temperatureData) {
    const validTemps = temperatureData
      .filter(item => item.temperature && item.temperature.temperature)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (validTemps.length < 3) {
      return {
        trend: 'insufficient_data',
        message: '数据不足以分析趋势'
      };
    }

    const recent = validTemps.slice(-3);
    const isRising = recent[2].temperature.temperature > recent[0].temperature.temperature + 0.1;
    const isFalling = recent[2].temperature.temperature < recent[0].temperature.temperature - 0.1;

    if (isRising) {
      return { trend: 'rising', message: '体温呈上升趋势' };
    } else if (isFalling) {
      return { trend: 'falling', message: '体温呈下降趋势' };
    } else {
      return { trend: 'stable', message: '体温相对稳定' };
    }
  }

  /**
   * 工具方法：格式化日期
   */
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

module.exports = {
  TemperatureAnalyzer
};