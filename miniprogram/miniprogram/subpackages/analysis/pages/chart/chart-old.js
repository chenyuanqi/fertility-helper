// pages/chart/chart.js
const { FertilityStorage } = require('../../../../utils/storage');
const { DateUtils } = require('../../../../utils/date.js');
const { TestDataGenerator } = require('../../../../utils/testData.js');

Page({
  data: {
    chartData: [],
    viewMode: 'all',
    displayMode: 'chart',
    isLoading: true,
    cycleStats: {
      cycleDay: 0,
      averageTemp: 0,
      predictedOvulation: '',
      temperatureCount: 0,
      menstrualDays: 0,
      intercourseCount: 0
    },
    dateRange: {
      start: '',
      end: ''
    },
    isZoomed: false,
    chartWidth: 350,
    chartScrollLeft: 0,
    selectedPointData: null,
    showFullscreenChart: false,
    chartDateLabels: [],
    chartDataPoints: [],
    temperatureLinePoints: ''
  },

  async onLoad(options) {
    await this.initializeDateRange();
    this.loadChartData();
  },

  onShow() {
    this.loadChartData();
  },

  onReady() {
    // 移除原来的Canvas绘制逻辑，现在使用专业图表组件
  },

  async initializeDateRange() {
    try {
      const cycles = await FertilityStorage.getCycles();
      const today = DateUtils.formatDate(new Date());
      
      if (cycles && cycles.length > 0) {
        const latestCycle = cycles[cycles.length - 1];
        
        if (latestCycle && latestCycle.startDate) {
          const userSettings = await FertilityStorage.getUserSettings();
          const averageCycleLength = userSettings?.personalInfo?.averageCycleLength || 28;
          const cycleEndDate = DateUtils.addDays(latestCycle.startDate, averageCycleLength - 1);
          
          if (today <= cycleEndDate) {
            this.setData({
              dateRange: {
                start: latestCycle.startDate,
                end: today
              }
            });
          } else {
            const thirtyDaysAgo = DateUtils.subtractDays(today, 29);
            this.setData({
              dateRange: {
                start: thirtyDaysAgo,
                end: today
              }
            });
          }
        } else {
          this.setDefaultDateRange();
        }
      } else {
        this.setDefaultDateRange();
      }
    } catch (error) {
      console.error('初始化日期范围失败:', error);
      this.setDefaultDateRange();
    }
  },

  setDefaultDateRange() {
    const today = DateUtils.formatDate(new Date());
    const thirtyDaysAgo = DateUtils.subtractDays(today, 29);
    
    this.setData({
      dateRange: {
        start: thirtyDaysAgo,
        end: today
      }
    });
  },

  // 移除原来的Canvas绘制方法，现在使用专业图表组件

  async loadChartData() {
    try {
      this.setData({ isLoading: true });
      
      const { start, end } = this.data.dateRange;
      let dayRecords = await FertilityStorage.getDayRecords();
      
      // 数据清理和验证
      dayRecords = this.cleanDayRecords(dayRecords);
      
      const chartData = this.buildChartData(start, end, dayRecords);
      const cycleStats = this.calculateCycleStats(chartData);
      const chartDateLabels = this.generateChartDateLabels(start, end);
      const { chartDataPoints, temperatureLinePoints } = this.generateChartPoints(chartData);
      
      this.setData({
        chartData,
        cycleStats,
        chartDateLabels,
        chartDataPoints,
        temperatureLinePoints
      });
    } catch (error) {
      console.error('加载图表数据异常:', error);
      wx.showToast({
        title: '加载数据异常',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 数据清理方法
  cleanDayRecords(dayRecords) {
    if (!dayRecords || typeof dayRecords !== 'object') {
      return {};
    }

    const cleanedRecords = {};
    
    Object.keys(dayRecords).forEach(date => {
      const record = dayRecords[date];
      if (!record || typeof record !== 'object') {
        console.log(`清理无效记录: ${date}`, record);
        return;
      }

      const cleanedRecord = {};

      // 清理体温数据
      if (record.temperature && 
          typeof record.temperature === 'object' && 
          typeof record.temperature.temperature === 'number' &&
          record.temperature.temperature > 30 && 
          record.temperature.temperature < 45) {
        cleanedRecord.temperature = record.temperature;
      }

      // 清理月经数据
      if (record.menstrual && 
          typeof record.menstrual === 'object' && 
          record.menstrual.flow && 
          ['light', 'medium', 'heavy'].includes(record.menstrual.flow)) {
        cleanedRecord.menstrual = record.menstrual;
      }

      // 清理同房数据 - 只保留有实际同房行为的记录
      if (record.intercourse && Array.isArray(record.intercourse) && record.intercourse.length > 0) {
        const validIntercourse = record.intercourse.filter(item => 
          item && 
          typeof item === 'object' && 
          item.type && 
          item.type !== 'none' && 
          item.type !== '' &&
          item.type !== 'no'
        );
        
        if (validIntercourse.length > 0) {
          cleanedRecord.intercourse = validIntercourse;
        }
      }

      // 只保存有有效数据的记录
      if (Object.keys(cleanedRecord).length > 0) {
        cleanedRecords[date] = cleanedRecord;
      } else {
        console.log(`清理空记录: ${date}`);
      }
    });

    console.log('数据清理完成，清理前:', Object.keys(dayRecords).length, '条，清理后:', Object.keys(cleanedRecords).length, '条');
    
    return cleanedRecords;
  },

  buildChartData(startDate, endDate, dayRecords) {
    const chartData = [];
    const dates = DateUtils.getDateRange(startDate, endDate);
    
    console.log('=== 图表数据构建调试 ===');
    console.log('日期范围:', startDate, '到', endDate);
    console.log('生成的日期数组:', dates);
    console.log('原始日记录数据:', dayRecords);
    
    dates.forEach(date => {
      const dayData = { 
        date,
        // 添加格式化的日期显示
        dateDisplay: DateUtils.formatDisplayDate(date)
      };
      
      if (dayRecords && dayRecords[date]) {
        const record = dayRecords[date];
        
        console.log(`${date} 的原始记录:`, record);
        
        // 体温数据验证
        if (record.temperature && 
            typeof record.temperature === 'object' && 
            typeof record.temperature.temperature === 'number' &&
            record.temperature.temperature > 30 && 
            record.temperature.temperature < 45) {
          dayData.temperature = record.temperature;
          console.log(`${date} 体温数据:`, record.temperature);
        }
        
        // 月经数据验证
        if (record.menstrual && 
            typeof record.menstrual === 'object' && 
            record.menstrual.flow && 
            ['light', 'medium', 'heavy'].includes(record.menstrual.flow)) {
          dayData.menstrual = record.menstrual;
          console.log(`${date} 月经数据:`, record.menstrual);
        }
        
        // 同房数据验证 - 只保留有实际同房行为的记录
        if (record.intercourse && Array.isArray(record.intercourse) && record.intercourse.length > 0) {
          // 过滤出有效的同房记录
          const validIntercourse = record.intercourse.filter(item => {
            // 检查记录是否有效
            if (!item || typeof item !== 'object') return false;
            
            // 检查是否明确标记为无同房
            if (item.type === 'none' || item.type === '' || item.type === 'no') return false;
            
            // 检查是否有实际的同房时间或其他标识
            if (item.time || item.protection !== undefined || item.note) return true;
            
            // 如果没有type字段，但有其他字段，认为是有效记录
            if (!item.type && (item.time || item.protection !== undefined)) return true;
            
            return false;
          });
          
          if (validIntercourse.length > 0) {
            dayData.intercourse = validIntercourse;
            console.log(`${date} 有效同房数据:`, validIntercourse);
          } else {
            console.log(`${date} 同房记录无实际行为，已过滤:`, record.intercourse);
          }
        }
        
        // 添加其他可能的数据类型
        if (record.symptoms && Array.isArray(record.symptoms) && record.symptoms.length > 0) {
          dayData.symptoms = record.symptoms;
        }
      } else {
        console.log(`${date} 无记录数据`);
      }
      
      chartData.push(dayData);
    });
    
    console.log('最终图表数据:', chartData.length, '天数据');
    console.log('有体温数据的天数:', chartData.filter(d => d.temperature).length);
    console.log('有月经数据的天数:', chartData.filter(d => d.menstrual).length);
    console.log('有同房数据的天数:', chartData.filter(d => d.intercourse).length);
    console.log('=== 图表数据构建调试结束 ===');
    
    return chartData;
  },

  calculateCycleStats(chartData) {
    const stats = {
      cycleDay: 0,
      averageTemp: 0,
      predictedOvulation: '',
      temperatureCount: 0,
      menstrualDays: 0,
      intercourseCount: 0
    };
    
    const tempData = chartData.filter(item => 
      item.temperature && item.temperature.temperature
    );
    stats.temperatureCount = tempData.length;
    
    if (tempData.length > 0) {
      const totalTemp = tempData.reduce((sum, item) => 
        sum + item.temperature.temperature, 0
      );
      stats.averageTemp = (totalTemp / tempData.length).toFixed(1);
    }
    
    return stats;
  },

  generateChartDateLabels(startDate, endDate) {
    const labels = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const labelCount = Math.min(5, daysDiff);
    const interval = Math.floor(daysDiff / (labelCount - 1));
    
    for (let i = 0; i < labelCount; i++) {
      let labelDate;
      if (i === labelCount - 1) {
        labelDate = new Date(endDate);
      } else {
        labelDate = new Date(start);
        labelDate.setDate(start.getDate() + (i * interval));
      }
      
      const month = labelDate.getMonth() + 1;
      const day = labelDate.getDate();
      labels.push(`${month}/${day}`);
    }
    
    return labels;
  },

  generateChartPoints(chartData) {
    const chartDataPoints = [];
    const temperaturePoints = [];
    const totalDays = chartData.length;
    
    console.log('生成图表点，总天数:', totalDays);
    
    const temperatureData = chartData.filter(item => item.temperature && item.temperature.temperature);
    let minTemp = 36.0;
    let maxTemp = 37.5;
    
    if (temperatureData.length > 0) {
      const temps = temperatureData.map(item => item.temperature.temperature);
      minTemp = Math.min(...temps) - 0.2;
      maxTemp = Math.max(...temps) + 0.2;
      console.log('体温范围:', minTemp, '到', maxTemp);
    }
    
    chartData.forEach((dayData, index) => {
      const xPercent = totalDays > 1 ? (index / (totalDays - 1)) * 80 + 10 : 50;
      
      const hasTemperature = dayData.temperature && dayData.temperature.temperature;
      const hasMenstrual = dayData.menstrual && dayData.menstrual.flow !== 'none';
      // 精确的同房记录验证 - 必须有实际同房行为
      const hasIntercourse = dayData.intercourse && 
        dayData.intercourse.length > 0 && 
        dayData.intercourse.some(record => 
          record && record.type && record.type !== 'none' && record.type !== '' && record.type !== 'no'
        );
      
      let yPercent = 50;
      let temperatureValue = null;
      
      if (hasTemperature) {
        const tempValue = dayData.temperature.temperature;
        temperatureValue = tempValue.toFixed(1);
        yPercent = 80 - ((tempValue - minTemp) / (maxTemp - minTemp)) * 60;
        temperaturePoints.push(`${xPercent},${yPercent}`);
        
        console.log(`${dayData.date}: 体温${tempValue}°C, 坐标(${xPercent}%, ${yPercent}%)`);
      }
      
      if (hasTemperature || hasMenstrual || hasIntercourse) {
        const pointData = {
          date: dayData.date,
          x: xPercent,
          y: yPercent,
          hasTemperature,
          hasMenstrual,
          hasIntercourse,
          temperatureValue
        };
        
        chartDataPoints.push(pointData);
      }
    });
    
    const temperatureLinePoints = temperaturePoints.join(' ');
    
    console.log('生成的数据点:', chartDataPoints.length, '个');
    console.log('体温数据点:', chartDataPoints.filter(p => p.hasTemperature).length, '个');
    
    return {
      chartDataPoints,
      temperatureLinePoints
    };
  },

  onPointClick(e) {
    const { point } = e.currentTarget.dataset;
    this.showPointDetails(point);
  },

  showPointDetails(pointData) {
    const selectedPointData = {
      dateDisplay: DateUtils.formatDisplayDate(pointData.date),
      temperature: pointData.hasTemperature ? `${pointData.temperatureValue}°C` : '--'
    };
    
    this.setData({ selectedPointData });
  },

  closeDetails() {
    this.setData({ selectedPointData: null });
  },

  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  goToRecord() {
    wx.navigateTo({
      url: '/pages/record/record'
    });
  },

  onChartTap() {
    console.log('点击图表，准备打开全屏模式');
    console.log('当前图表数据:', this.data.chartData?.length, '个数据点');
    console.log('当前显示模式:', this.data.viewMode);
    
    this.setData({
      showFullscreenChart: true
    }, () => {
      // 延迟一下让全屏图表重新渲染
      setTimeout(() => {
        console.log('全屏图表应该已经显示');
      }, 300);
    });
  },

  onFullscreenChartClick(e) {
    console.log('全屏图表点击事件:', e.detail);
  },

  closeFullscreenChart() {
    this.setData({
      showFullscreenChart: false
    });
  },

  // 移除原来的全屏Canvas绘制方法，现在使用专业图表组件

  onZoomToggle() {
    const isZoomed = !this.data.isZoomed;
    let chartWidth = 350;
    
    if (isZoomed) {
      const dataCount = this.data.chartData.length;
      chartWidth = Math.max(700, dataCount * 30);
    }
    
    this.setData({ 
      isZoomed,
      chartWidth
    });

    wx.showToast({
      title: isZoomed ? '已放大图表' : '已缩小图表',
      icon: 'none',
      duration: 1500
    });
  },

  /**
   * 生成测试数据 (开发调试用)
   */
  async generateTestData() {
    try {
      wx.showLoading({ title: '生成测试数据...' });
      
      const result = await TestDataGenerator.generateSampleData();
      
      if (result.success) {
        wx.showToast({
          title: '测试数据生成成功',
          icon: 'success'
        });
        
        // 重新加载图表数据
        this.loadChartData();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('生成测试数据失败:', error);
      wx.showToast({
        title: '生成失败: ' + error.message,
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 清除所有数据 (开发调试用)
   */
  async clearAllData() {
    try {
      const result = await new Promise(resolve => {
        wx.showModal({
          title: '确认清除',
          content: '确定要清除所有数据吗？此操作不可恢复。',
          success: resolve
        });
      });
      
      if (!result.confirm) return;
      
      wx.showLoading({ title: '清除数据...' });
      
      const clearResult = await TestDataGenerator.clearAllData();
      
      if (clearResult.success) {
        wx.showToast({
          title: '数据已清除',
          icon: 'success'
        });
        
        // 重新加载图表数据
        this.loadChartData();
      } else {
        throw new Error(clearResult.error);
      }
    } catch (error) {
      console.error('清除数据失败:', error);
      wx.showToast({
        title: '清除失败: ' + error.message,
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});