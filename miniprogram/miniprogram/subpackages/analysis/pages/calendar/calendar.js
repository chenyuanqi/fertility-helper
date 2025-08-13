// pages/calendar/calendar.js
const { DataManager } = require('../../../../utils/dataManager.js');
const { DateUtils } = require('../../../../utils/date.js');

Page({
  data: {
    // 当前显示的年月
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    
    // 日历网格数据
    calendarGrid: [],
    
    // 头部统计信息
    calendarStats: {
      cycleDay: 0,
      recordDays: 0,
      predictedOvulation: '--'
    },
    
    // 选中的日期
    selectedDate: '',
    selectedData: null,
    showDetails: false,
    
    // 今天的日期
    today: '',
    
    // 是否为当前月
    isCurrentMonth: true,
    
    // 星期标题
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    
    // 是否正在加载
    isLoading: false
  },

  onLoad(options) {
    const today = new Date();
    console.log('Calendar onLoad - currentYear:', this.data.currentYear, 'currentMonth:', this.data.currentMonth);
    this.setData({
      today: DateUtils.formatDate(today)
    });
    
    this.loadCalendarData();
  },

  onShow() {
    // 页面显示时刷新数据
    // 注意：如果是从编辑页面返回，会通过事件通知方式更新数据
    // 这里只处理其他情况下的数据刷新
    const pages = getCurrentPages();
    // 如果是从其他页面返回（不是从编辑页面通过事件返回），则刷新数据
    if (pages.length === 1 || pages[pages.length - 2].route !== 'pages/record/record') {
      this.loadCalendarData();
    }
  },

  /**
   * 加载日历数据
   */
  async loadCalendarData() {
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const { currentYear, currentMonth } = this.data;
      
      console.log('LoadCalendarData - currentYear:', currentYear, 'currentMonth:', currentMonth);
      
      // 获取当前月的第一天和最后一天
      const firstDay = DateUtils.formatDate(new Date(currentYear, currentMonth - 1, 1));
      const lastDay = DateUtils.formatDate(new Date(currentYear, currentMonth, 0));
      
      // 为了完整显示日历，需要获取跨月的数据
      const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
      const lastDayOfWeek = new Date(currentYear, currentMonth, 0).getDay();
      
      const startDate = DateUtils.subtractDays(firstDay, firstDayOfWeek);
      const endDate = DateUtils.addDays(lastDay, 6 - lastDayOfWeek);
      
      // 获取扩展范围的数据
      const result = await dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (result.success) {
        const calendarData = result.data || [];
        
        // 生成日历网格
        this.generateCalendarGrid(calendarData);
        
        // 计算统计信息
        this.calculateCalendarStats(calendarData);
        
        // 检查是否为当前月
        this.checkIsCurrentMonth();
        
        console.log('Calendar data loaded successfully. Current data:', {
          currentYear: this.data.currentYear,
          currentMonth: this.data.currentMonth,
          isCurrentMonth: this.data.isCurrentMonth
        });
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

  /**
   * 生成日历网格
   */
  generateCalendarGrid(calendarData) {
    const { currentYear, currentMonth, today } = this.data;
    const dataMap = {};
    
    // 建立数据索引
    calendarData.forEach(item => {
      dataMap[item.date] = item;
    });
    
    // 获取月份信息
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekDay = firstDay.getDay();
    
    const calendarGrid = [];
    
    // 生成完整的42天网格（6周）
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startWeekDay);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = DateUtils.formatDate(date);
      const dayData = dataMap[dateStr];
      const isCurrentMonth = date.getMonth() === currentMonth - 1;
      const isToday = dateStr === today;
      
      const dayInfo = {
        date: dateStr,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        hasData: !!dayData,
        
        // 数据摘要
        hasTemperature: !!(dayData && dayData.temperature && dayData.temperature.temperature),
        temperatureValue: dayData && dayData.temperature ? dayData.temperature.temperature : null,
        
        hasMenstrual: !!(dayData && dayData.menstrual && dayData.menstrual.flow !== 'none'),
        menstrualFlow: dayData && dayData.menstrual ? dayData.menstrual.flow : 'none',
        
        hasIntercourse: !!(dayData && dayData.intercourse && dayData.intercourse.length > 0 && 
                          dayData.intercourse.some(record => record.type !== 'none')),
        intercourseCount: dayData && dayData.intercourse ? 
          dayData.intercourse.filter(record => record.type !== 'none').length : 0,
        
        // 症状备注
        hasSymptoms: !!(dayData && dayData.temperature && dayData.temperature.note),
        symptoms: dayData && dayData.temperature ? dayData.temperature.note : '',
        
        // 原始数据
        rawData: dayData
      };
      
      calendarGrid.push(dayInfo);
    }
    
    this.setData({ calendarGrid });
  },

  /**
   * 计算日历统计信息
   */
  calculateCalendarStats(calendarData) {
    const stats = {
      cycleDay: 0,
      recordDays: 0,
      predictedOvulation: '--'
    };
    
    // 计算有记录的天数
    stats.recordDays = calendarData.filter(item => 
      (item.temperature && item.temperature.temperature) ||
      (item.menstrual && item.menstrual.flow !== 'none') ||
      (item.intercourse && item.intercourse.length > 0 && 
       item.intercourse.some(record => record.type !== 'none'))
    ).length;
    
    // 查找最近的经期开始日期
    const menstrualStart = calendarData.find(item => 
      item.menstrual && item.menstrual.isStart
    );
    
    if (menstrualStart) {
      const today = DateUtils.formatDate(new Date());
      stats.cycleDay = DateUtils.getDaysDifference(menstrualStart.date, today) + 1;
      
      // 简单的排卵预测（周期第14天）
      const predictedDate = DateUtils.addDays(menstrualStart.date, 13);
      stats.predictedOvulation = DateUtils.formatDisplayDate(predictedDate);
    }
    
    this.setData({ calendarStats: stats });
  },

  /**
   * 检查是否为当前月
   */
  checkIsCurrentMonth() {
    const now = new Date();
    const currentRealYear = now.getFullYear();
    const currentRealMonth = now.getMonth() + 1;
    
    const isCurrentMonth = this.data.currentYear === currentRealYear && 
                          this.data.currentMonth === currentRealMonth;
    
    this.setData({ isCurrentMonth });
  },

  /**
   * 日期点击事件
   */
  onDateClick(e) {
    const { date, isCurrentMonth } = e.currentTarget.dataset;
    
    if (!isCurrentMonth) {
      // 点击非当前月日期，切换月份
      const clickedDate = new Date(date);
      this.setData({
        currentYear: clickedDate.getFullYear(),
        currentMonth: clickedDate.getMonth() + 1
      });
      this.loadCalendarData();
      return;
    }
    
    // 检查是否是未来日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(date);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    if (selectedDateObj > today) {
      wx.showToast({
        title: '不要着急，这一天还没到来呢',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 选中当前日期
    const dayInfo = this.data.calendarGrid.find(item => item.date === date);
    
    this.setData({
      selectedDate: date,
      selectedData: dayInfo,
      showDetails: true
    });
  },

  /**
   * 上一月
   */
  onPrevMonth() {
    console.log('onPrevMonth clicked');
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    
    this.setData({
      currentYear,
      currentMonth,
      showDetails: false,
      selectedDate: ''
    });
    
    this.loadCalendarData();
  },

  /**
   * 下一月
   */
  onNextMonth() {
    console.log('onNextMonth clicked');
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    
    this.setData({
      currentYear,
      currentMonth,
      showDetails: false,
      selectedDate: ''
    });
    
    this.loadCalendarData();
  },

  /**
   * 回到今天
   */
  onToday() {
    const today = new Date();
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1,
      showDetails: false,
      selectedDate: ''
    });
    
    this.loadCalendarData();
  },

  /**
   * 编辑选中日期
   */
  onEditDate() {
    if (this.data.selectedDate) {
      // 保存当前选中的日期
      const selectedDate = this.data.selectedDate;
      
      // 检查是否是未来日期
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateObj = new Date(selectedDate);
      selectedDateObj.setHours(0, 0, 0, 0);
      
      if (selectedDateObj > today) {
        wx.showToast({
          title: '不能编辑未来日期',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 先关闭弹框
      this.setData({
        showDetails: false
      });
      
      // 跳转到记录编辑页面
      wx.navigateTo({
        url: `/pages/record/record?date=${selectedDate}`,
        events: {
          // 监听编辑页面返回事件
          recordUpdated: () => {
            console.log('记录已更新，重新加载数据');
            // 重新加载日历数据
            this.loadCalendarData().then(() => {
              // 更新日历网格中的数据
              const calendarGrid = [...this.data.calendarGrid];
              const index = calendarGrid.findIndex(item => item.date === selectedDate);
              
              if (index !== -1) {
                // 直接从数据库获取最新的日期数据
                const dataManager = DataManager.getInstance();
                dataManager.getDayRecord(selectedDate).then(result => {
                  if (result.success && result.data) {
                    // 构建更新后的日期信息对象
                    const dayData = result.data;
                    const updatedDayInfo = {
                      ...calendarGrid[index],
                      hasData: true,
                      
                      // 数据摘要
                      hasTemperature: !!(dayData && dayData.temperature && dayData.temperature.temperature),
                      temperatureValue: dayData && dayData.temperature ? dayData.temperature.temperature : null,
                      
                      hasMenstrual: !!(dayData && dayData.menstrual && dayData.menstrual.flow !== 'none'),
                      menstrualFlow: dayData && dayData.menstrual ? dayData.menstrual.flow : 'none',
                      
                      hasIntercourse: !!(dayData && dayData.intercourse && dayData.intercourse.length > 0 && 
                                      dayData.intercourse.some(record => record.type !== 'none')),
                      intercourseCount: dayData && dayData.intercourse ? 
                        dayData.intercourse.filter(record => record.type !== 'none').length : 0,
                      
                      // 症状备注
                      hasSymptoms: !!(dayData && dayData.temperature && dayData.temperature.note),
                      symptoms: dayData && dayData.temperature ? dayData.temperature.note : '',
                      
                      // 原始数据
                      rawData: dayData
                    };
                    
                    // 更新日历网格中的数据
                    calendarGrid[index] = updatedDayInfo;
                    this.setData({
                      calendarGrid
                    });
                    
                    console.log('日历数据已更新:', updatedDayInfo);
                  }
                });
              }
            });
          }
        },
        success: (res) => {
          // 设置编辑页面返回时的回调
          const eventChannel = res.eventChannel;
          eventChannel.on('recordSaved', () => {
            console.log('记录已保存，重新加载数据');
            // 重新加载日历数据
            this.loadCalendarData().then(() => {
              // 更新日历网格中的数据
              const calendarGrid = [...this.data.calendarGrid];
              const index = calendarGrid.findIndex(item => item.date === selectedDate);
              
              if (index !== -1) {
                // 直接从数据库获取最新的日期数据
                const dataManager = DataManager.getInstance();
                dataManager.getDayRecord(selectedDate).then(result => {
                  if (result.success && result.data) {
                    // 构建更新后的日期信息对象
                    const dayData = result.data;
                    const updatedDayInfo = {
                      ...calendarGrid[index],
                      hasData: true,
                      
                      // 数据摘要
                      hasTemperature: !!(dayData && dayData.temperature && dayData.temperature.temperature),
                      temperatureValue: dayData && dayData.temperature ? dayData.temperature.temperature : null,
                      
                      hasMenstrual: !!(dayData && dayData.menstrual && dayData.menstrual.flow !== 'none'),
                      menstrualFlow: dayData && dayData.menstrual ? dayData.menstrual.flow : 'none',
                      
                      hasIntercourse: !!(dayData && dayData.intercourse && dayData.intercourse.length > 0 && 
                                      dayData.intercourse.some(record => record.type !== 'none')),
                      intercourseCount: dayData && dayData.intercourse ? 
                        dayData.intercourse.filter(record => record.type !== 'none').length : 0,
                      
                      // 症状备注
                      hasSymptoms: !!(dayData && dayData.temperature && dayData.temperature.note),
                      symptoms: dayData && dayData.temperature ? dayData.temperature.note : '',
                      
                      // 原始数据
                      rawData: dayData
                    };
                    
                    // 更新日历网格中的数据
                    calendarGrid[index] = updatedDayInfo;
                    this.setData({
                      calendarGrid
                    });
                    
                    console.log('日历数据已更新:', updatedDayInfo);
                  }
                });
              }
            });
          });
        }
      });
    }
  },

  /**
   * 隐藏详情面板
   */
  onHideDetails() {
    this.setData({
      showDetails: false,
      selectedDate: ''
    });
  },

  /**
   * 格式化显示日期
   */
  formatDisplayDate(dateStr) {
    return DateUtils.formatDisplayDate(dateStr);
  },

  /**
   * 格式化月年显示
   */
  formatMonthYear(year, month) {
    return `${year}.${String(month).padStart(2, '0')}`;
  },

  /**
   * 获取星期几
   */
  getDayOfWeekName(dateStr) {
    return DateUtils.getDayOfWeekName(dateStr);
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadCalendarData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});