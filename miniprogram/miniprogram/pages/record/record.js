// pages/record/record.js
const { DataManager } = require('../../utils/dataManager.js');
const { DateUtils } = require('../../utils/date.js');

Page({
  data: {
    recordType: 'temperature', // temperature, menstrual, intercourse
    
    // 体温记录相关
    showTemperatureKeyboard: false,
    temperatureValue: '',
    temperatureTime: '',
    temperatureNote: '',
    
    // 经量记录相关
    menstrualFlow: 0,
    isStartPeriod: false,
    isEndPeriod: false,
    menstrualNote: '',
    flowOptions: [
      { value: 0, label: '无', description: '无月经', position: 0 },
      { value: 1, label: '少量', description: '1-2片卫生巾，颜色较淡', position: 25 },
      { value: 2, label: '中等', description: '3-4片卫生巾，正常颜色', position: 50 },
      { value: 3, label: '较多', description: '5-6片卫生巾，颜色较深', position: 75 },
      { value: 4, label: '大量', description: '7片以上卫生巾，颜色深红', position: 100 }
    ],
    
    // 同房记录相关
    intercourseTime: '',
    hasProtection: false,
    intercourseNote: '',
    noIntercourseToday: false,
    
    // 通用
    selectedDate: '',
    todayDate: '',
    isLoading: false,
    todayRecord: null
  },

  onLoad(options) {
    const today = DateUtils.formatDate(new Date());
    let recordType = 'temperature';
    
    if (options.type && ['temperature', 'menstrual', 'intercourse'].includes(options.type)) {
      recordType = options.type;
    }
    
    this.setData({
      recordType,
      selectedDate: options.date || today,
      todayDate: today,
      temperatureTime: DateUtils.getCurrentTime(),
      intercourseTime: DateUtils.getCurrentTime()
    });
    
    this.loadTodayRecord();
  },

  /**
  /**
   * 加载选中日期的已有记录
   */
  async loadTodayRecord() {
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const result = await dataManager.getDayRecord(this.data.selectedDate);
      
      if (result.success && result.data) {
        const record = result.data;
        const updateData = { todayRecord: record };
        
        // 填充已有的体温数据
        if (record.temperature) {
          updateData.temperatureValue = record.temperature.temperature.toString();
          updateData.temperatureTime = record.temperature.time;
          updateData.temperatureNote = record.temperature.note || '';
        }
        
        // 填充已有的经量数据
        if (record.menstrual) {
          const flowValue = this.getFlowValue(record.menstrual.flow);
          updateData.menstrualFlow = flowValue;
          updateData.isStartPeriod = record.menstrual.isStart;
          updateData.isEndPeriod = record.menstrual.isEnd;
          updateData.menstrualNote = record.menstrual.note || '';
        }
        
        // 填充已有的同房数据（取最新一次）
        if (record.intercourse && record.intercourse.length > 0) {
          const latest = record.intercourse[record.intercourse.length - 1];
          
          // 检查是否是"无同房"记录
          if (latest.type === 'none') {
            updateData.noIntercourseToday = true;
            updateData.intercourseTime = DateUtils.getCurrentTime();
            updateData.hasProtection = false;
            updateData.intercourseNote = '';
          } else {
            updateData.intercourseTime = latest.time;
            updateData.hasProtection = latest.protection;
            updateData.intercourseNote = latest.note || '';
            updateData.noIntercourseToday = false;
          }
        } else {
          updateData.noIntercourseToday = false;
        }
        
        this.setData(updateData);
      }
    } catch (error) {
      console.error('加载当天记录失败:', error);
      wx.showToast({ title: '加载记录失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 转换经量值
   */
  getFlowValue(flow) {
    const flowMap = { light: 1, medium: 2, heavy: 3 };
    return flowMap[flow] || 0;
  },

  /**
   * 转换经量类型
   */
  getFlowType(value) {
    const typeMap = { 0: 'none', 1: 'light', 2: 'medium', 3: 'heavy', 4: 'heavy' };
    return typeMap[value] || 'none';
  },

  /**
  /**
   * 切换记录类型
   */
  onRecordTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ recordType: type });
  },

  /**
   * 日期选择变化
   */
  onDateChange(e) {
    const selectedDate = e.detail.value;
    this.setData({ selectedDate });
    this.loadTodayRecord();
  },

  /**
   * 格式化选中的日期显示
   */
  formatSelectedDate(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 判断是否是今天
    if (DateUtils.formatDate(date) === DateUtils.formatDate(today)) {
      return '今天 ' + DateUtils.formatDate(date);
    }
    
    // 判断是否是昨天
    if (DateUtils.formatDate(date) === DateUtils.formatDate(yesterday)) {
      return '昨天 ' + DateUtils.formatDate(date);
    }
    
    // 其他日期显示星期几
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    
    return `${weekDay} ${DateUtils.formatDate(date)}`;
  },

  // ==================== 体温记录相关方法 ====================
  
  /**
   * 显示体温键盘
   */
  showTemperatureInput() {
    this.setData({ showTemperatureKeyboard: true });
  },

  /**
   * 体温键盘确认
   */
  onTemperatureConfirm(e) {
    const temperature = e.detail.value;
    this.setData({
      temperatureValue: temperature.toString(),
      showTemperatureKeyboard: false
    });
  },

  /**
   * 体温键盘取消
   */
  onTemperatureCancel() {
    this.setData({ showTemperatureKeyboard: false });
  },

  /**
   * 体温时间选择
   */
  onTemperatureTimeChange(e) {
    this.setData({ temperatureTime: e.detail.value });
  },

  /**
   * 体温备注输入
   */
  onTemperatureNoteInput(e) {
    this.setData({ temperatureNote: e.detail.value });
  },

  /**
   * 保存体温记录
   */
  async saveTemperatureRecord() {
    const { temperatureValue, temperatureTime, temperatureNote, selectedDate } = this.data;
    
    if (!temperatureValue) {
      wx.showToast({ title: '请输入体温', icon: 'none' });
      return;
    }
    
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const record = {
        date: selectedDate,
        time: temperatureTime,
        temperature: parseFloat(temperatureValue),
        note: temperatureNote
      };
      
      const result = await dataManager.saveTemperatureRecord(record);
      
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        await this.loadTodayRecord();
      } else {
        throw new Error(result.error?.message || '保存失败');
      }
    } catch (error) {
      console.error('保存体温记录失败:', error);
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // ==================== 经量记录相关方法 ====================
  
  /**
   * 经量滑条变化
   */
  onFlowSliderChange(e) {
    this.setData({ menstrualFlow: e.detail.value });
  },

  /**
   * 经期开始/结束切换
   */
  onPeriodStartChange(e) {
    const isStart = e.detail.value;
    this.setData({ 
      isStartPeriod: isStart,
      isEndPeriod: isStart ? false : this.data.isEndPeriod
    });
  },

  onPeriodEndChange(e) {
    const isEnd = e.detail.value;
    this.setData({ 
      isEndPeriod: isEnd,
      isStartPeriod: isEnd ? false : this.data.isStartPeriod
    });
  },

  /**
   * 经量备注输入
   */
  onMenstrualNoteInput(e) {
    this.setData({ menstrualNote: e.detail.value });
  },

  /**
   * 保存经量记录
   */
  async saveMenstrualRecord() {
    const { menstrualFlow, isStartPeriod, isEndPeriod, menstrualNote, selectedDate } = this.data;
    
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const record = {
        date: selectedDate,
        flow: this.getFlowType(menstrualFlow),
        isStart: isStartPeriod,
        isEnd: isEndPeriod,
        note: menstrualNote
      };
      
      const result = await dataManager.saveMenstrualRecord(record);
      
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        await this.loadTodayRecord();
      } else {
        throw new Error(result.error?.message || '保存失败');
      }
    } catch (error) {
      console.error('保存经量记录失败:', error);
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // ==================== 同房记录相关方法 ====================
  
  /**
   * 同房时间选择
   */
  onIntercourseTimeChange(e) {
    this.setData({ intercourseTime: e.detail.value });
  },

  /**
   * 避孕措施切换
   */
  onProtectionChange(e) {
    this.setData({ hasProtection: e.detail.value });
  },

  /**
   * 同房备注输入
   */
  onIntercourseNoteInput(e) {
    this.setData({ intercourseNote: e.detail.value });
  },

  /**
   * 今日无同房切换
   */
  onNoIntercourseChange(e) {
    const noIntercourseToday = e.detail.value;
    this.setData({ 
      noIntercourseToday,
      // 如果选择了"今日无同房"，清空其他字段
      intercourseTime: noIntercourseToday ? '' : (this.data.intercourseTime || DateUtils.getCurrentTime()),
      hasProtection: false,
      intercourseNote: ''
    });
  },

  /**
   * 保存同房记录
   */
  async saveIntercourseRecord() {
    const { intercourseTime, hasProtection, intercourseNote, selectedDate, noIntercourseToday } = this.data;
    
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();

      // 如果选择了"今日无同房"，保存无同房标记
      if (noIntercourseToday) {
        const record = {
          date: selectedDate,
          time: null,
          protection: false,
          note: '',
          type: 'none' // 标记为无同房
        };
        
        const result = await dataManager.saveNoIntercourseRecord(record);
        
        if (result.success) {
          wx.showToast({ title: '保存成功', icon: 'success' });
          await this.loadTodayRecord();
        } else {
          throw new Error(result.error?.message || '保存失败');
        }
        return;
      }

      // 如果没有选择"今日无同房"，需要验证必填字段
      if (!intercourseTime) {
        wx.showToast({ title: '请选择时间', icon: 'none' });
        return;
      }

      const record = {
        date: selectedDate,
        time: intercourseTime,
        protection: hasProtection,
        note: intercourseNote
      };
      
      const result = await dataManager.saveIntercourseRecord(record);
      
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        await this.loadTodayRecord();
      } else {
        throw new Error(result.error?.message || '保存失败');
      }
    } catch (error) {
      console.error('保存同房记录失败:', error);
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 删除记录
   */
  async deleteRecord(type) {
    const result = await new Promise(resolve => {
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这条记录吗？',
        success: resolve
      });
    });
    
    if (!result.confirm) return;
    
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const deleteResult = await dataManager.deleteRecord(this.data.selectedDate, type);
      
      if (deleteResult.success) {
        wx.showToast({ title: '删除成功', icon: 'success' });
        await this.loadTodayRecord();
      } else {
        throw new Error(deleteResult.error?.message || '删除失败');
      }
    } catch (error) {
      console.error('删除记录失败:', error);
      wx.showToast({ title: error.message || '删除失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});