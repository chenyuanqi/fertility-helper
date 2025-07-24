// 首页
Page({
  data: {
    todayData: {
      temperature: null,
      menstrualFlow: null,
      hasIntercourse: false,
      date: new Date().toISOString().split('T')[0]
    },
    cycleInfo: {
      currentDay: 15,
      cycleLength: 28,
      nextPeriodDays: 13,
      fertileWindow: {
        isActive: false,
        daysLeft: 3
      }
    },
    recentRecords: []
  },

  onLoad(options) {
    console.log('首页加载');
    this.loadTodayData();
    this.loadCycleInfo();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadTodayData();
  },

  onReady() {
    console.log('首页渲染完成');
  },

  // 加载今日数据
  loadTodayData() {
    // TODO: 从本地存储加载今日数据
    console.log('加载今日数据');
  },

  // 加载周期信息
  loadCycleInfo() {
    // TODO: 计算周期信息
    console.log('加载周期信息');
  },

  // 快速记录
  onQuickRecord() {
    wx.switchTab({
      url: '/pages/record/record'
    });
  },

  // 查看图表
  onViewChart() {
    wx.switchTab({
      url: '/pages/chart/chart'
    });
  },

  // 查看日历
  onViewCalendar() {
    wx.switchTab({
      url: '/pages/calendar/calendar'
    });
  }
});

