/**
 * 日历视图组件
 * 用于显示月视图日历并展示每日的数据摘要
 */

const { DateUtils } = require('../../utils/date.js');

Component({
  properties: {
    // 当前显示的年月
    currentYear: {
      type: Number,
      value: new Date().getFullYear()
    },
    currentMonth: {
      type: Number,
      value: new Date().getMonth() + 1
    },
    // 日历数据
    calendarData: {
      type: Array,
      value: []
    },
    // 选中的日期
    selectedDate: {
      type: String,
      value: ''
    }
  },

  data: {
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarGrid: [],
    today: ''
  },

  lifetimes: {
    attached() {
      const today = new Date();
      this.setData({
        today: DateUtils.formatDate(today)
      });
      this.generateCalendar();
    }
  },

  observers: {
    'currentYear, currentMonth': function() {
      this.generateCalendar();
    },
    'calendarData': function() {
      this.generateCalendar();
    }
  },

  methods: {
    /**
     * 生成日历网格
     */
    generateCalendar() {
      const { currentYear, currentMonth } = this.data;
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      const daysInMonth = lastDay.getDate();
      const startWeekDay = firstDay.getDay();

      const calendarGrid = [];
      let week = [];

      // 填充上个月的日期
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
      const prevMonthLastDay = new Date(prevYear, prevMonth, 0).getDate();

      for (let i = startWeekDay - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        week.push({
          day,
          isCurrentMonth: false,
          isToday: false,
          isPrevMonth: true,
          date: DateUtils.formatDate(new Date(prevYear, prevMonth - 1, day)),
          data: null
        });
      }

      // 填充当前月的日期
      for (let day = 1; day <= daysInMonth; day++) {
        const date = DateUtils.formatDate(new Date(currentYear, currentMonth - 1, day));
        const dayData = this.findDayData(date);
        const isToday = date === this.data.today;

        week.push({
          day,
          isCurrentMonth: true,
          isToday,
          isPrevMonth: false,
          date,
          data: dayData
        });

        if (week.length === 7) {
          calendarGrid.push(week);
          week = [];
        }
      }

      // 填充下个月的日期
      if (week.length > 0) {
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        let nextDay = 1;

        while (week.length < 7) {
          const date = DateUtils.formatDate(new Date(nextYear, nextMonth - 1, nextDay));
          week.push({
            day: nextDay,
            isCurrentMonth: false,
            isToday: false,
            isPrevMonth: false,
            date,
            data: null
          });
          nextDay++;
        }
        calendarGrid.push(week);
      }

      this.setData({ calendarGrid });
    },

    /**
     * 查找指定日期的数据
     */
    findDayData(date) {
      const data = this.data.calendarData.find(item => item.date === date);
      if (!data) return null;

      return {
        hasTemperature: !!(data.temperature && data.temperature.temperature),
        temperatureValue: data.temperature ? data.temperature.temperature : null,
        hasMenstrual: !!(data.menstrual && data.menstrual.flow !== 'none'),
        menstrualFlow: data.menstrual ? data.menstrual.flow : null,
        hasIntercourse: !!(data.intercourse && data.intercourse.length > 0 && 
                          data.intercourse.some(record => record.type !== 'none')),
        intercourseCount: data.intercourse ? 
          data.intercourse.filter(record => record.type !== 'none').length : 0
      };
    },

    /**
     * 点击日期
     */
    onDateClick(e) {
      const { date, isCurrentMonth } = e.currentTarget.dataset;
      
      if (!isCurrentMonth) {
        // 点击非当前月日期，切换月份
        const clickedDate = new Date(date);
        this.triggerEvent('monthChange', {
          year: clickedDate.getFullYear(),
          month: clickedDate.getMonth() + 1,
          selectedDate: date
        });
      } else {
        // 点击当前月日期，触发日期选择事件
        this.setData({ selectedDate: date });
        this.triggerEvent('dateSelect', {
          date,
          data: this.findDayData(date)
        });
      }
    },

    /**
     * 上一月
     */
    onPrevMonth() {
      let { currentYear, currentMonth } = this.data;
      currentMonth--;
      
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }

      this.triggerEvent('monthChange', {
        year: currentYear,
        month: currentMonth
      });
    },

    /**
     * 下一月
     */
    onNextMonth() {
      let { currentYear, currentMonth } = this.data;
      currentMonth++;
      
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }

      this.triggerEvent('monthChange', {
        year: currentYear,
        month: currentMonth
      });
    },

    /**
     * 回到今天
     */
    onToday() {
      const today = new Date();
      this.triggerEvent('monthChange', {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        selectedDate: this.data.today
      });
    },

    /**
     * 格式化日期显示（工具方法，供WXML调用）
     */
    formatDateForDisplay(dateStr) {
      return DateUtils.formatDisplayDate(dateStr);
    }
  }
});