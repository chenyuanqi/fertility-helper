// 日历页面
Page({
  data: {
    currentMonth: new Date().getMonth() + 1,
    currentYear: new Date().getFullYear(),
    calendarDays: [],
    selectedDate: ''
  },

  onLoad(options) {
    console.log('日历页面加载');
    this.generateCalendar();
  },

  onReady() {
    console.log('日历页面渲染完成');
  },

  // 生成日历
  generateCalendar() {
    // TODO: 生成日历数据
    console.log('生成日历数据');
  },

  // 选择日期
  onDateTap(e) {
    const { date } = e.currentTarget.dataset;
    this.setData({
      selectedDate: date
    });
  },

  // 切换月份
  onPrevMonth() {
    let { currentMonth, currentYear } = this.data;
    currentMonth--;
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    this.setData({ currentMonth, currentYear });
    this.generateCalendar();
  },

  onNextMonth() {
    let { currentMonth, currentYear } = this.data;
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    this.setData({ currentMonth, currentYear });
    this.generateCalendar();
  }
});
