// pages/calendar/calendar.js
const { DataManager } = require('../../utils/dataManager.js');
const { DateUtils } = require('../../utils/date.js');

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
    isLoading: false,
    
    // 触摸滑动相关
    touchStartX: 0,
    touchStartY: 0,
    touchEndX: 0,
    touchEndY: 0,
    minSwipeDistance: 50, // 最小滑动距离
    isSwipeProcessing: false, // 防止重复处理滑动
    // 记录编辑前的年月，用于返回后恢复
    beforeEditYear: null,
    beforeEditMonth: null
  },
  
  /**
   * 查看备注全文
   */
  onNoteTap(e) {
    const note = e.currentTarget.dataset.note || '';
    if (!note) return;
    wx.showModal({
      title: '备注',
      content: note,
      showCancel: false
    });
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
      this.setData({ 
        isLoading: true,
        // 加载新数据时清除之前的选中状态
        showDetails: false,
        selectedDate: '',
        selectedData: null
      });
      
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
         await this.calculateCalendarStats(calendarData);
        
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
        weekday: date.getDay(),
        isCurrentMonth,
        isToday,
        hasData: !!dayData,
        
        // 数据摘要
        hasTemperature: !!(dayData && dayData.temperature && dayData.temperature.temperature),
        temperatureValue: dayData && dayData.temperature ? dayData.temperature.temperature : null,
        
        hasMenstrual: !!(dayData && dayData.menstrual && typeof dayData.menstrual.padCount === 'number' && dayData.menstrual.padCount > 0),
        menstrualPadCount: dayData && dayData.menstrual ? (Number(dayData.menstrual.padCount || 0)) : 0,
        menstrualLabel: (() => {
          const c = dayData && dayData.menstrual ? Number(dayData.menstrual.padCount || 0) : 0;
          if (c === 0) return '无';
          if (c === 1) return '少量';
          if (c === 2) return '中量';
          return '大量';
        })(),
        
        hasIntercourse: !!(dayData && dayData.intercourse && dayData.intercourse.length > 0 && 
                          dayData.intercourse.some(record => record.type !== 'none')),
        intercourseCount: dayData && dayData.intercourse ? 
          dayData.intercourse.filter(record => record.type !== 'none').length : 0,
        
        // 症状备注
        // 备注（分别记录）
        hasSymptoms: !!(
          (dayData && dayData.temperature && dayData.temperature.note) ||
          (dayData && dayData.menstrual && dayData.menstrual.note) ||
          (dayData && dayData.intercourse && dayData.intercourse.some(i => i && i.note))
        ),
        temperatureNote: dayData && dayData.temperature ? (dayData.temperature.note || '') : '',
        menstrualNote: dayData && dayData.menstrual ? (dayData.menstrual.note || '') : '',
        intercourseNote: (() => {
          if (dayData && dayData.intercourse && dayData.intercourse.length > 0) {
            const rec = dayData.intercourse.find(i => i && i.note);
            return rec ? rec.note : '';
          }
          return '';
        })(),
        symptoms: (() => {
          if (!dayData) return '';
          return (dayData.temperature && dayData.temperature.note) || (dayData.menstrual && dayData.menstrual.note) ||
                 ((dayData.intercourse && dayData.intercourse.find(i => i && i.note)) ? dayData.intercourse.find(i => i && i.note).note : '');
        })(),
        // 经量颜色
        menstrualColor: dayData && dayData.menstrual ? (dayData.menstrual.color || '') : '',
        menstrualColorHex: (() => {
          const c = dayData && dayData.menstrual ? (dayData.menstrual.color || '') : '';
          switch (c) {
            case 'dark_red': return '#b30000';
            case 'brown': return '#8b4513';
            case 'pink': return '#ff8fab';
            case 'bright_red': return '#ff4d4f';
            default: return '';
          }
        })(),
        
        // 原始数据
        rawData: dayData
      };
      
      calendarGrid.push(dayInfo);
    }
    
    // 计算当月的易孕期/最佳期背景：依据用户设置
    // 从 Storage 同步读取以避免额外 await
    try {
      const settings = wx.getStorageSync ? wx.getStorageSync('fertility_user_settings') : null;
      const avgLen = Math.max(20, Math.min(40, settings?.personalInfo?.averageCycleLength || 28));
      const luteal = Math.max(10, Math.min(16, settings?.personalInfo?.averageLutealPhase || 14));
      let ovulationDate = null;
      // 通过当月中最近一次经期开始估算本周期排卵日，再反推易孕/最佳区间
      const startIdx = calendarData.findIndex(x => x && x.menstrual && x.menstrual.isStart);
      if (startIdx >= 0) {
        const cycleStart = calendarData[startIdx].date;
        ovulationDate = DateUtils.addDays(cycleStart, avgLen - luteal);
        const fertileStart = DateUtils.subtractDays(ovulationDate, 5);
        const fertileEnd = ovulationDate;
        const optimalStart = DateUtils.subtractDays(ovulationDate, 2);
        const optimalEnd = ovulationDate;
        
        // 标注到网格数据上（添加标志位，供 WXML 使用）
        calendarGrid.forEach(cell => {
          if (!cell || !cell.isCurrentMonth) return;
          if (cell.date >= fertileStart && cell.date <= fertileEnd) {
            cell.isFertile = true;
          }
          if (cell.date >= optimalStart && cell.date <= optimalEnd) {
            cell.isOptimal = true;
          }
          if (cell.date === ovulationDate) {
            cell.isOvulationDay = true;
          }
        });
      } else {
        // 回退：若当月没有开始标记，用“最近周期开始”（可能在上月）估算
        try {
          const cycles = wx.getStorageSync ? (wx.getStorageSync('fertility_cycles') || []) : [];
          if (Array.isArray(cycles) && cycles.length > 0) {
            // 找到开始日期最接近且不晚于本月最后一天的周期
            const lastDayOfMonth = DateUtils.formatDate(new Date(currentYear, currentMonth, 0));
            const sorted = [...cycles].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
            let chosen = sorted.find(c => new Date(c.startDate) <= new Date(lastDayOfMonth)) || sorted[0];
            if (chosen && chosen.startDate) {
              ovulationDate = DateUtils.addDays(chosen.startDate, avgLen - luteal);
              const fertileStart = DateUtils.subtractDays(ovulationDate, 5);
              const fertileEnd = ovulationDate;
              const optimalStart = DateUtils.subtractDays(ovulationDate, 2);
              const optimalEnd = ovulationDate;
              calendarGrid.forEach(cell => {
                if (!cell || !cell.isCurrentMonth) return;
                if (cell.date >= fertileStart && cell.date <= fertileEnd) {
                  cell.isFertile = true;
                }
                if (cell.date >= optimalStart && cell.date <= optimalEnd) {
                  cell.isOptimal = true;
                }
                if (cell.date === ovulationDate) {
                  cell.isOvulationDay = true;
                }
              });
            }
          }
        } catch (_) {}
      }
      // 若以上两种方式均未标注出任何背景，则遍历全部周期，找出与本月有交集的排卵窗口标注
      const anyMarked = calendarGrid.some(c => c && (c.isFertile || c.isOptimal));
      if (!anyMarked) {
        try {
          const cycles = wx.getStorageSync ? (wx.getStorageSync('fertility_cycles') || []) : [];
          if (Array.isArray(cycles) && cycles.length > 0) {
            const monthStart = DateUtils.formatDate(new Date(currentYear, currentMonth - 1, 1));
            const monthEnd = DateUtils.formatDate(new Date(currentYear, currentMonth, 0));
            cycles.forEach(cycle => {
              if (!cycle || !cycle.startDate) return;
              const start = cycle.startDate;
              const end = cycle.endDate || DateUtils.addDays(start, avgLen - 1);
              // 快速判断与本月是否有交集
              if (new Date(end) < new Date(monthStart) || new Date(start) > new Date(monthEnd)) {
                // 周期与本月无交集，但排卵窗口可能跨月：仍计算排卵窗口再判断
              }
              const ovulation = DateUtils.addDays(start, avgLen - luteal);
              ovulationDate = ovulation; // 以最后一次覆盖为准
              const fertileStart = DateUtils.subtractDays(ovulation, 5);
              const fertileEnd = ovulation;
              const optimalStart = DateUtils.subtractDays(ovulation, 2);
              const optimalEnd = ovulation;
              calendarGrid.forEach(cell => {
                if (!cell || !cell.isCurrentMonth) return;
                if (cell.date >= fertileStart && cell.date <= fertileEnd) cell.isFertile = true;
                if (cell.date >= optimalStart && cell.date <= optimalEnd) cell.isOptimal = true;
                if (cell.date === ovulation) cell.isOvulationDay = true;
              });
            });
          }
        } catch (_) {}
      }

      // 计算“胶囊”区间的起止位，便于渲染连带背景
      const computeRangeRole = (flagKey, roleKey) => {
        for (let i = 0; i < calendarGrid.length; i++) {
          const cell = calendarGrid[i];
          if (!cell || !cell.isCurrentMonth || !cell[flagKey]) continue;
          const isFirstOfWeek = cell.weekday === 0;
          const isLastOfWeek = cell.weekday === 6;
          const prevSameRow = !isFirstOfWeek;
          const nextSameRow = !isLastOfWeek;
          const prevIn = prevSameRow && calendarGrid[i - 1] && calendarGrid[i - 1].isCurrentMonth && calendarGrid[i - 1][flagKey];
          const nextIn = nextSameRow && calendarGrid[i + 1] && calendarGrid[i + 1].isCurrentMonth && calendarGrid[i + 1][flagKey];

          if (!prevIn && !nextIn) {
            cell[roleKey] = 'single';
          } else if (!prevIn && nextIn) {
            cell[roleKey] = 'start';
          } else if (prevIn && nextIn) {
            cell[roleKey] = 'middle';
          } else if (prevIn && !nextIn) {
            cell[roleKey] = 'end';
          }
        }
      };
      computeRangeRole('isFertile', 'fertileRole');
      computeRangeRole('isOptimal', 'optimalRole');
    } catch (e) {
      // 忽略背景标记失败
    }

    this.setData({ calendarGrid });
  },

  /**
   * 计算日历统计信息
   */
  async calculateCalendarStats(calendarData) {
    const stats = {
      cycleDay: 0,
      recordDays: 0,
      predictedOvulation: '--'
    };
    
    // 计算有记录的天数
    stats.recordDays = calendarData.filter(item => 
      (item.temperature && item.temperature.temperature) ||
      (item.menstrual && typeof item.menstrual.padCount === 'number' && item.menstrual.padCount > 0) ||
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
      
      // 基于设置的“平均周期长度 - 黄体期长度”预测排卵日
      try {
        const { FertilityStorage } = require('../../utils/storage');
        const userSettings = await FertilityStorage.getUserSettings();
        const avgLen = Math.max(20, Math.min(40, userSettings?.personalInfo?.averageCycleLength || 28));
        const luteal = Math.max(10, Math.min(16, userSettings?.personalInfo?.averageLutealPhase || 14));
        const predictedDate = DateUtils.addDays(menstrualStart.date, avgLen - luteal);
        stats.predictedOvulation = DateUtils.formatDisplayDate(predictedDate);
      } catch (e) {
        const fallback = DateUtils.addDays(menstrualStart.date, 13);
        stats.predictedOvulation = DateUtils.formatDisplayDate(fallback);
      }
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
        currentMonth: clickedDate.getMonth() + 1,
        showDetails: false,
        selectedDate: ''
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
    
    // 选中当前日期 - 只有在点击当前显示月份的日期时才显示详情
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
    
    // 先关闭详情弹框和清除选中状态
    this.setData({
      showDetails: false,
      selectedDate: '',
      selectedData: null
    });
    
    let { currentYear, currentMonth } = this.data;
    currentMonth--;
    
    if (currentMonth < 1) {
      currentMonth = 12;
      currentYear--;
    }
    
    this.setData({
      currentYear,
      currentMonth
    });
    
    this.loadCalendarData();
  },

  /**
   * 下一月
   */
  onNextMonth() {
    console.log('onNextMonth clicked');
    
    // 先关闭详情弹框和清除选中状态
    this.setData({
      showDetails: false,
      selectedDate: '',
      selectedData: null
    });
    
    let { currentYear, currentMonth } = this.data;
    currentMonth++;
    
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
    
    this.setData({
      currentYear,
      currentMonth
    });
    
    this.loadCalendarData();
  },

  /**
   * 回到今天
   */
  onToday() {
    const today = new Date();
    
    // 先关闭详情弹框和清除选中状态
    this.setData({
      showDetails: false,
      selectedDate: '',
      selectedData: null
    });
    
    this.setData({
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1
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
      // 记录编辑前的年月
      const { currentYear, currentMonth } = this.data;
      this.setData({ beforeEditYear: currentYear, beforeEditMonth: currentMonth });
      
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
              // 恢复到编辑前的月份
              this.restoreMonthAfterEdit();
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
                      
                      hasMenstrual: !!(dayData && dayData.menstrual && typeof dayData.menstrual.padCount === 'number' && dayData.menstrual.padCount > 0),
                      menstrualPadCount: dayData && dayData.menstrual ? Number(dayData.menstrual.padCount || 0) : 0,
                      menstrualLabel: (() => {
                        const c = dayData && dayData.menstrual ? Number(dayData.menstrual.padCount || 0) : 0;
                        if (c === 0) return '无';
                        if (c === 1) return '少量';
                        if (c === 2) return '中量';
                        return '大量';
                      })(),
                      
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
              // 恢复到编辑前的月份
              this.restoreMonthAfterEdit();
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
                      
                      hasMenstrual: !!(dayData && dayData.menstrual && typeof dayData.menstrual.padCount === 'number' && dayData.menstrual.padCount > 0),
                      menstrualPadCount: dayData && dayData.menstrual ? Number(dayData.menstrual.padCount || 0) : 0,
                      menstrualLabel: (() => {
                        const c = dayData && dayData.menstrual ? Number(dayData.menstrual.padCount || 0) : 0;
                        if (c === 0) return '无';
                        if (c === 1) return '少量';
                        if (c === 2) return '中量';
                        return '大量';
                      })(),
                      
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
   * 恢复到编辑前的月份
   */
  restoreMonthAfterEdit() {
    const { beforeEditYear, beforeEditMonth } = this.data;
    if (beforeEditYear && beforeEditMonth) {
      this.setData({ currentYear: beforeEditYear, currentMonth: beforeEditMonth });
      this.loadCalendarData();
      // 清理记忆值
      this.setData({ beforeEditYear: null, beforeEditMonth: null });
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
   * 触摸开始
   */
  onTouchStart(e) {
    if (this.data.isSwipeProcessing) return;
    
    const touch = e.touches[0];
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY
    });
  },

  /**
   * 触摸移动
   */
  onTouchMove(e) {
    if (this.data.isSwipeProcessing) return;
    
    const touch = e.touches[0];
    this.setData({
      touchEndX: touch.clientX,
      touchEndY: touch.clientY
    });
  },

  /**
   * 触摸结束
   */
  onTouchEnd(e) {
    if (this.data.isSwipeProcessing) return;
    
    const { touchStartX, touchStartY, touchEndX, touchEndY, minSwipeDistance } = this.data;
    
    // 计算滑动距离
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // 判断是否为有效的水平滑动（水平距离大于垂直距离，且超过最小距离）
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      this.setData({ isSwipeProcessing: true });
      
      if (deltaX > 0) {
        // 向右滑动 - 上一个月
        console.log('向右滑动，切换到上一个月');
        this.onPrevMonth();
      } else {
        // 向左滑动 - 下一个月
        console.log('向左滑动，切换到下一个月');
        this.onNextMonth();
      }
      
      // 延迟重置滑动处理状态，防止快速连续滑动
      setTimeout(() => {
        this.setData({ isSwipeProcessing: false });
      }, 300);
    }
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
