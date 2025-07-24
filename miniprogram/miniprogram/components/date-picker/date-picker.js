// components/date-picker/date-picker.js
const { DateUtils } = require('../../utils/date');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 标题
    title: {
      type: String,
      value: '选择日期'
    },
    // 当前值
    value: {
      type: String,
      value: ''
    },
    // 最小日期
    minDate: {
      type: String,
      value: ''
    },
    // 最大日期
    maxDate: {
      type: String,
      value: ''
    },
    // 是否显示快捷选择
    showShortcuts: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    years: [],
    months: [],
    days: [],
    pickerValue: [0, 0, 0],
    selectedDate: '',
    shortcuts: [
      { key: 'today', label: '今天' },
      { key: 'yesterday', label: '昨天' },
      { key: 'week_ago', label: '一周前' }
    ]
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      this.initDatePicker();
    }
  },

  /**
   * 监听属性变化
   */
  observers: {
    'visible': function(visible) {
      if (visible) {
        this.initDatePicker();
      }
    },
    'value': function(value) {
      if (value) {
        this.setSelectedDate(value);
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 初始化日期选择器
     */
    initDatePicker() {
      const currentDate = this.properties.value || DateUtils.getToday();
      const minDate = this.properties.minDate || DateUtils.subtractDays(DateUtils.getToday(), 365);
      const maxDate = this.properties.maxDate || DateUtils.addDays(DateUtils.getToday(), 365);

      // 生成年份数组
      const minYear = new Date(minDate).getFullYear();
      const maxYear = new Date(maxDate).getFullYear();
      const years = [];
      for (let year = minYear; year <= maxYear; year++) {
        years.push(year);
      }

      // 生成月份数组
      const months = [];
      for (let month = 1; month <= 12; month++) {
        months.push(month);
      }

      this.setData({
        years,
        months
      });

      // 设置当前选中的日期
      this.setSelectedDate(currentDate);
    },

    /**
     * 设置选中的日期
     */
    setSelectedDate(dateString) {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // 计算picker-view的索引
      const yearIndex = this.data.years.indexOf(year);
      const monthIndex = month - 1;

      // 生成当月的天数数组
      this.generateDays(year, month);

      // 设置picker-view的值
      this.setData({
        selectedDate: dateString,
        pickerValue: [yearIndex, monthIndex, day - 1]
      });
    },

    /**
     * 生成指定年月的天数数组
     */
    generateDays(year, month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const days = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
      }
      
      this.setData({ days });
    },

    /**
     * picker-view 变化事件
     */
    onPickerChange(e) {
      const [yearIndex, monthIndex, dayIndex] = e.detail.value;
      const year = this.data.years[yearIndex];
      const month = monthIndex + 1;
      
      // 重新生成天数数组（月份变化时）
      if (this.data.pickerValue[1] !== monthIndex) {
        this.generateDays(year, month);
      }
      
      // 确保日期索引不超出范围
      const maxDayIndex = this.data.days.length - 1;
      const validDayIndex = Math.min(dayIndex, maxDayIndex);
      const day = this.data.days[validDayIndex];
      
      // 更新选中的日期
      const selectedDate = DateUtils.formatDate(new Date(year, month - 1, day));
      
      this.setData({
        pickerValue: [yearIndex, monthIndex, validDayIndex],
        selectedDate
      });
    },

    /**
     * 快捷选择点击
     */
    onShortcutTap(e) {
      const key = e.currentTarget.dataset.key;
      let targetDate = '';
      
      switch (key) {
        case 'today':
          targetDate = DateUtils.getToday();
          break;
        case 'yesterday':
          targetDate = DateUtils.subtractDays(DateUtils.getToday(), 1);
          break;
        case 'week_ago':
          targetDate = DateUtils.subtractDays(DateUtils.getToday(), 7);
          break;
      }
      
      if (targetDate) {
        this.setSelectedDate(targetDate);
      }
    },

    /**
     * 取消按钮点击
     */
    onCancelTap() {
      this.triggerEvent('cancel');
    },

    /**
     * 确定按钮点击
     */
    onConfirmTap() {
      const { selectedDate } = this.data;
      
      // 验证日期范围
      if (this.properties.minDate && selectedDate < this.properties.minDate) {
        wx.showToast({
          title: '日期不能早于最小日期',
          icon: 'none'
        });
        return;
      }
      
      if (this.properties.maxDate && selectedDate > this.properties.maxDate) {
        wx.showToast({
          title: '日期不能晚于最大日期',
          icon: 'none'
        });
        return;
      }
      
      this.triggerEvent('confirm', {
        value: selectedDate,
        date: new Date(selectedDate)
      });
    },

    /**
     * 遮罩点击
     */
    onMaskTap() {
      this.triggerEvent('cancel');
    }
  }
});