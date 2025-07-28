// pages/chart/chart.js
const { DataManager } = require('../../utils/dataManager.js');
const { DateUtils } = require('../../utils/date.js');

Page({
  data: {
    chartData: [],
    viewMode: 'all', // all, temperature, minimal
    displayMode: 'chart', // chart, calendar
    isLoading: true,
    currentCycle: null,
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
    // 日历相关数据
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth() + 1,
    calendarData: [],
    selectedDate: '',
    // 选中点的详细信息
    selectedPointData: null,
    showFullscreenChart: false
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

  /**
   * 加载日历数据
   */
  async loadCalendarData() {
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const { calendarYear, calendarMonth } = this.data;
      
      // 获取当前月的第一天和最后一天
      const firstDay = DateUtils.formatDate(new Date(calendarYear, calendarMonth - 1, 1));
      const lastDay = DateUtils.formatDate(new Date(calendarYear, calendarMonth, 0));
      
      // 获取月份数据
      const result = await dataManager.getDayRecordsInRange(firstDay, lastDay);
      
      if (result.success) {
        const calendarData = result.data || [];
        this.setData({ calendarData });
      } else {
        console.error('加载日历数据失败:', result.error);
        wx.showToast({
          title: '加载数据失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载日历数据异常:', error);
      wx.showToast({
        title: '加载数据异常',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadChartData();
    if (this.data.displayMode === 'calendar') {
      this.loadCalendarData();
    }
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
    const selectedPointData = {
      dateDisplay: DateUtils.formatDisplayDate(data.date),
      temperature: data.temperature ? `${data.temperature.temperature}°C` : '--',
      menstruation: '无',
      intercourse: '无'
    };
    
    if (data.menstrual && data.menstrual.flow !== 'none') {
      const flowMap = {
        light: '少量',
        medium: '中等', 
        heavy: '大量'
      };
      selectedPointData.menstruation = flowMap[data.menstrual.flow] || '未知';
    }
    
    if (data.intercourse && data.intercourse.length > 0) {
      const actualCount = data.intercourse.filter(item => item.type !== 'none').length;
      if (actualCount > 0) {
        selectedPointData.intercourse = `${actualCount}次`;
      }
    }
    
    this.setData({ selectedPointData });
  },

  /**
   * 关闭详细信息
   */
  closeDetails() {
    this.setData({ selectedPointData: null });
  },

  /**
   * 切换视图模式
   */
  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  /**
   * 切换显示模式（图表/日历）
   */
  onDisplayModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ displayMode: mode });
    
    if (mode === 'calendar') {
      this.loadCalendarData();
    }
    
    wx.showToast({
      title: mode === 'calendar' ? '切换到日历视图' : '切换到图表视图',
      icon: 'none',
      duration: 1000
    });
  },

  /**
   * 日历月份变化事件
   */
  onCalendarMonthChange(e) {
    const { year, month, selectedDate } = e.detail;
    
    this.setData({
      calendarYear: year,
      calendarMonth: month,
      selectedDate: selectedDate || ''
    });
    
    this.loadCalendarData();
  },

  /**
   * 日历日期选择事件
   */
  onCalendarDateSelect(e) {
    const { date, data } = e.detail;
    
    this.setData({ selectedDate: date });
    
    // 显示日期详情（和图表点击显示类似）
    if (data) {
      this.showDateDetails(date, data);
    } else {
      // 没有数据，提示用户可以添加记录
      wx.showModal({
        title: '记录提醒',
        content: `${DateUtils.formatDisplayDate(date)} 暂无数据，是否前往记录页面添加？`,
        confirmText: '去记录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/record/record?date=${date}`
            });
          }
        }
      });
    }
  },

  /**
   * 显示日期详情
   */
  showDateDetails(date, data) {
    const content = [];
    
    content.push(`日期: ${DateUtils.formatDisplayDate(date)}`);
    
    if (data.hasTemperature) {
      content.push(`体温: ${data.temperatureValue}°C`);
    }
    
    if (data.hasMenstrual) {
      const flowMap = {
        light: '少量',
        medium: '中等', 
        heavy: '大量'
      };
      content.push(`经量: ${flowMap[data.menstrualFlow] || '未知'}`);
    }
    
    if (data.hasIntercourse) {
      content.push(`同房: ${data.intercourseCount}次`);
    }
    
    wx.showModal({
      title: '详细信息',
      content: content.join('\n'),
      showCancel: false
    });
  },

  /**
   * 切换缩放模式
   */
  onZoomToggle() {
    const isZoomed = !this.data.isZoomed;
    let chartWidth = 350;
    let chartScrollLeft = 0;
    
    if (isZoomed) {
      // 根据数据量动态计算宽度，每天至少30rpx宽度
      const dataCount = this.data.chartData.length;
      chartWidth = Math.max(700, dataCount * 30);
      
      // 自动滚动到最右侧（最新数据）
      setTimeout(() => {
        chartScrollLeft = chartWidth - 350; // 滚动到最右侧
        this.setData({ chartScrollLeft });
      }, 100);
    }
    
    this.setData({ 
      isZoomed,
      chartWidth
    });

    wx.showToast({
      title: isZoomed ? '已放大图表，可左右滑动查看' : '已缩小图表',
      icon: 'none',
      duration: 1500
    });
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
    
    wx.showToast({
      title: '切换至上一周期',
      icon: 'none',
      duration: 1000
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
    let newEnd = DateUtils.addDays(newStart, 29);
    
    // 确保不超过今天
    if (newEnd > today) {
      newEnd = today;
    }
    
    this.setData({
      dateRange: {
        start: newStart,
        end: newEnd
      }
    });
    
    wx.showToast({
      title: '切换至下一周期',
      icon: 'none',
      duration: 1000
    });
    
    this.loadChartData();
  },

  /**
   * 快速跳转到当前周期
   */
  goToCurrentCycle() {
    const today = DateUtils.formatDate(new Date());
    const thirtyDaysAgo = DateUtils.subtractDays(today, 29);
    
    this.setData({
      dateRange: {
        start: thirtyDaysAgo,
        end: today
      }
    });
    
    wx.showToast({
      title: '已回到当前周期',
      icon: 'none',
      duration: 1000
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
   * 关闭详情
   */
  closeDetails() {
    this.setData({
      selectedPointData: null
    });
  },

  /**
   * 点击图表放大
   */
  onChartTap() {
    this.setData({
      showFullscreenChart: true
    });
  },

  /**
   * 关闭全屏图表
   */
  closeFullscreenChart() {
    this.setData({
      showFullscreenChart: false
    });
  }
});