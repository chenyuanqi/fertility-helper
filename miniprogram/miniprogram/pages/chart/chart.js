// 图表页面
Page({
  data: {
    chartData: [],
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear()
  },

  onLoad(options) {
    console.log('图表页面加载');
    this.loadChartData();
  },

  onReady() {
    console.log('图表页面渲染完成');
  },

  // 加载图表数据
  loadChartData() {
    // TODO: 从本地存储加载数据
    console.log('加载图表数据');
  },

  // 切换月份
  onMonthChange(e) {
    const { month, year } = e.detail;
    this.setData({
      currentMonth: month,
      currentYear: year
    });
    this.loadChartData();
  }
});
