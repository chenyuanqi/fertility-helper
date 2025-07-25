// pages/chart/chart.js
const { DataManager } = require('../../utils/dataManager.js');
const { DateUtils } = require('../../utils/date.js');

Page({
  data: {
    chartData: [],
    viewMode: 'all', // all, temperature, minimal
    isLoading: true,
    currentCycle: null,
    cycleStats: {
      cycleDay: 0,
      averageTemp: 0,
      predictedOvulation: ''
    },
    dateRange: {
      start: '',
      end: ''
    }
  },

  onLoad(options) {
    // 设置默认日期范围（最近30天）
    const today = DateUtils.formatDate(new Date());
    const thirtyDaysAgo = DateUtils.subtractDays(today, 29);
    
    this.setData({
      dateRange: {
        start: thirtyDaysAgo,
        end: today
      }
    });
    
    this.loadChartData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadChartData();
  },

  /**
   * 加载图表数据
   */
  async loadChartData() {
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const { start, end } = this.data.dateRange;
      
      // 获取日期范围内的数据
      const result = await dataManager.getDayRecordsInRange(start, end);
      
      if (result.success) {
        const rawData = result.data || [];
        
        // 构建完整的日期数据数组
        const chartData = this.buildChartData(start, end, rawData);
        
        // 计算周期统计
        const cycleStats = this.calculateCycleStats(chartData);
        
        this.setData({
          chartData,
          cycleStats
        });
      } else {
        console.error('加载图表数据失败:', result.error);
        wx.showToast({
          title: '加载数据失败',
          icon: 'none'
        });
      }
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

  /**
   * 构建图表数据
   */
  buildChartData(startDate, endDate, rawData) {
    const chartData = [];
    const dataMap = {};
    
    // 将原始数据按日期建立索引
    rawData.forEach(item => {
      dataMap[item.date] = item;
    });
    
    // 生成连续的日期数据
    const dates = DateUtils.getDateRange(startDate, endDate);
    
    dates.forEach(date => {
      const dayData = dataMap[date] || { date };
      chartData.push(dayData);
    });
    
    return chartData;
  },

  /**
   * 计算周期统计
   */
  calculateCycleStats(chartData) {
    const stats = {
      cycleDay: 0,
      averageTemp: 0,
      predictedOvulation: '',
      temperatureCount: 0,
      menstrualDays: 0,
      intercourseCount: 0
    };
    
    // 计算体温记录数
    const tempData = chartData.filter(item => 
      item.temperature && item.temperature.temperature
    );
    stats.temperatureCount = tempData.length;
    
    // 计算平均体温
    if (tempData.length > 0) {
      const totalTemp = tempData.reduce((sum, item) => 
        sum + item.temperature.temperature, 0
      );
      stats.averageTemp = (totalTemp / tempData.length).toFixed(1);
    }
    
    // 计算经期天数（排除"无月经"）
    stats.menstrualDays = chartData.filter(item => 
      item.menstrual && item.menstrual.flow !== 'none'
    ).length;
    
    // 计算同房次数（排除"无同房"）
    stats.intercourseCount = chartData.reduce((sum, item) => {
      if (item.intercourse && item.intercourse.length > 0) {
        const actualCount = item.intercourse.filter(record => record.type !== 'none').length;
        return sum + actualCount;
      }
      return sum;
    }, 0);
    
    // 查找最近的经期开始日期
    const menstrualStart = chartData.find(item => 
      item.menstrual && item.menstrual.isStart
    );
    
    if (menstrualStart) {
      const today = DateUtils.formatDate(new Date());
      stats.cycleDay = DateUtils.getDaysDifference(menstrualStart.date, today) + 1;
      
      // 简单的排卵预测（周期第14天）
      const predictedDate = DateUtils.addDays(menstrualStart.date, 13);
      stats.predictedOvulation = DateUtils.formatDisplayDate(predictedDate);
    }
    
    return stats;
  },

  /**
   * 图表点击事件
   */
  onPointClick(e) {
    const { data, position } = e.detail;
    
    console.log('点击了数据点:', data);
    
    // 显示详细信息
    this.showPointDetails(data, position);
  },

  /**
   * 显示点击点的详细信息
   */
  showPointDetails(data, position) {
    const content = [];
    
    content.push(`日期: ${DateUtils.formatDisplayDate(data.date)}`);
    
    if (data.temperature) {
      content.push(`体温: ${data.temperature.temperature}°C`);
      if (data.temperature.note) {
        content.push(`备注: ${data.temperature.note}`);
      }
    }
    
    if (data.menstrual && data.menstrual.flow !== 'none') {
      const flowMap = {
        light: '少量',
        medium: '中等', 
        heavy: '大量'
      };
      content.push(`经量: ${flowMap[data.menstrual.flow] || '未知'}`);
    }
    
    if (data.intercourse && data.intercourse.length > 0) {
      const actualCount = data.intercourse.filter(item => item.type !== 'none').length;
      if (actualCount > 0) {
        content.push(`同房: ${actualCount}次`);
      }
    }
    
    wx.showModal({
      title: '详细信息',
      content: content.join('\n'),
      showCancel: false
    });
  },

  /**
   * 切换视图模式
   */
  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  /**
   * 切换到上一周期
   */
  onPreviousCycle() {
    const { start } = this.data.dateRange;
    const newEnd = DateUtils.subtractDays(start, 1);
    const newStart = DateUtils.subtractDays(newEnd, 29);
    
    this.setData({
      dateRange: {
        start: newStart,
        end: newEnd
      }
    });
    
    this.loadChartData();
  },

  /**
   * 切换到下一周期
   */
  onNextCycle() {
    const { end } = this.data.dateRange;
    const today = DateUtils.formatDate(new Date());
    
    // 不能超过今天
    if (end >= today) {
      wx.showToast({
        title: '已是最新数据',
        icon: 'none'
      });
      return;
    }
    
    const newStart = DateUtils.addDays(end, 1);
    const newEnd = DateUtils.addDays(newStart, 29);
    
    // 确保不超过今天
    const actualEnd = newEnd > today ? today : newEnd;
    
    this.setData({
      dateRange: {
        start: newStart,
        end: actualEnd
      }
    });
    
    this.loadChartData();
  },

  /**
   * 跳转到记录页面
   */
  goToRecord() {
    wx.navigateTo({
      url: '/pages/record/record'
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadChartData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});