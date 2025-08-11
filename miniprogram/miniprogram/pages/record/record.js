// pages/record/record.js
const { DataManager } = require('../../utils/dataManager.js');
const { DateUtils } = require('../../utils/date.js');

Page({
  data: {
    recordType: 'temperature', // temperature, menstrual, intercourse
    
    // 体温记录相关
    temperatureValue: '',
    temperatureTime: '',
    temperatureNote: '',
    temperatureIndex: -1,
    temperatureOptions: [],
    
    // 经量记录相关（改为卫生巾数量 + 颜色）
    menstrualPadCount: 0,
    menstrualColor: '',
    isStartPeriod: false,
    isEndPeriod: false,
    menstrualNote: '',
    // 预留：可在 UI 上动态生成 pad 选项与颜色选项
    
    // 同房记录相关
    intercourseTime: '',
    hasProtection: false,
    intercourseNote: '',
    noIntercourseToday: false,
    
    // 通用
    selectedDate: '',
    todayDate: '',
    formattedDate: '',
    isLoading: false,
    todayRecord: null,
    
    // 自动保存相关
    hasUnsavedChanges: false,
    autoSaveTimer: null,
    autoSaveCountdown: 0
  },

  onLoad(options) {
    const today = DateUtils.formatDate(new Date());
    let recordType = 'temperature';
    
    if (options.type && ['temperature', 'menstrual', 'intercourse'].includes(options.type)) {
      recordType = options.type;
    }
    
    const selectedDate = options.date || today;
    
    this.setData({
      recordType,
      selectedDate: selectedDate,
      todayDate: today,
      formattedDate: this.formatSelectedDate(selectedDate),
      temperatureTime: '08:00', // 默认8点
      intercourseTime: '22:00', // 默认22点
      noIntercourseToday: true, // 默认无同房
      temperatureOptions: this.generateTemperatureOptions()
    });
    
    this.loadTodayRecord();
  },

  /**
   * 经期标记点击处理
   */
  async onPeriodMarkerTap(e) {
    const type = e.currentTarget.dataset.type;
    
    if (type === 'start') {
      // 检查是否可以设置经期开始
      const canSetStart = await this.validatePeriodStart();
      if (!canSetStart) {
        return;
      }
      
      // 经期开始和结束只能二选一
      this.setData({ 
        isStartPeriod: !this.data.isStartPeriod,
        isEndPeriod: false // 清除经期结束标记
      });
    } else if (type === 'end') {
      // 检查是否可以设置经期结束
      const canSetEnd = await this.validatePeriodEnd();
      if (!canSetEnd) {
        return;
      }
      
      // 经期开始和结束只能二选一
      this.setData({ 
        isEndPeriod: !this.data.isEndPeriod,
        isStartPeriod: false // 清除经期开始标记
      });
    }
    this.markUnsavedChanges();
  },

  /**
   * 验证是否可以设置经期开始
   */
  async validatePeriodStart() {
    try {
      // 获取前一天的日期
      const currentDate = new Date(this.data.selectedDate);
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateStr = DateUtils.formatDate(previousDate);
      
      // 检查前一天是否有月经记录
      const dataManager = DataManager.getInstance();
      const result = await dataManager.getDayRecord(previousDateStr);
      
      if (result.success && result.data && result.data.menstrual) {
        const menstrualData = result.data.menstrual;
        // 如果前一天有月经记录且不是经期结束，则不允许设置经期开始
        if (menstrualData.flow && menstrualData.flow !== 'none' && !menstrualData.isEnd) {
          wx.showToast({
            title: '前一天已有月经记录，无法设置经期开始',
            icon: 'none',
            duration: 2000
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('验证经期开始失败:', error);
      return true; // 验证失败时允许设置，避免阻塞用户操作
    }
  },

  /**
   * 验证是否可以设置经期结束
   */
  async validatePeriodEnd() {
    try {
      // 获取后一天的日期
      const currentDate = new Date(this.data.selectedDate);
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const nextDateStr = DateUtils.formatDate(nextDate);
      
      // 检查后一天是否有月经记录
      const dataManager = DataManager.getInstance();
      const result = await dataManager.getDayRecord(nextDateStr);
      
      if (result.success && result.data && result.data.menstrual) {
        const menstrualData = result.data.menstrual;
        // 如果后一天有月经记录且不是经期开始，则不允许设置经期结束
        if (menstrualData.flow && menstrualData.flow !== 'none' && !menstrualData.isStart) {
          wx.showToast({
            title: '后一天已有月经记录，无法设置经期结束',
            icon: 'none',
            duration: 2000
          });
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('验证经期结束失败:', error);
      return true; // 验证失败时允许设置，避免阻塞用户操作
    }
  },

  /**
   * 经期开始状态变化（保留兼容性）
   */
  async onPeriodStartChange(e) {
    const isStart = e.detail.value;
    
    if (isStart) {
      // 检查是否可以设置经期开始
      const canSetStart = await this.validatePeriodStart();
      if (!canSetStart) {
        // 恢复原状态
        this.setData({ isStartPeriod: false });
        return;
      }
      
      // 经期开始和结束只能二选一
      this.setData({ 
        isStartPeriod: true,
        isEndPeriod: false
      });
    } else {
      this.setData({ isStartPeriod: false });
    }
    
    this.markUnsavedChanges();
  },

  /**
   * 经期结束状态变化（保留兼容性）
   */
  async onPeriodEndChange(e) {
    const isEnd = e.detail.value;
    
    if (isEnd) {
      // 检查是否可以设置经期结束
      const canSetEnd = await this.validatePeriodEnd();
      if (!canSetEnd) {
        // 恢复原状态
        this.setData({ isEndPeriod: false });
        return;
      }
      
      // 经期开始和结束只能二选一
      this.setData({ 
        isEndPeriod: true,
        isStartPeriod: false
      });
    } else {
      this.setData({ isEndPeriod: false });
    }
    
    this.markUnsavedChanges();
  },

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
          const tempValue = record.temperature.temperature;
          updateData.temperatureValue = tempValue.toFixed(1);
          updateData.temperatureTime = record.temperature.time;
          updateData.temperatureNote = record.temperature.note || '';
          
          // 找到对应的体温选项索引
          const tempIndex = this.data.temperatureOptions.findIndex(option => 
            Math.abs(option.value - tempValue) < 0.01
          );
          updateData.temperatureIndex = tempIndex >= 0 ? tempIndex : -1;
        }
        
        // 填充已有的经量数据（padCount + color）
        if (record.menstrual) {
          const padCount = typeof record.menstrual.padCount === 'number' ? record.menstrual.padCount : 0;
          updateData.menstrualPadCount = padCount;
          updateData.menstrualColor = record.menstrual.color || '';
          updateData.isStartPeriod = !!record.menstrual.isStart;
          updateData.isEndPeriod = !!record.menstrual.isEnd;
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
  // 由 padCount 生成标签（用于内部展示，0无、1少量、2中量、>=3大量）
  getPadLabel(count) {
    if (!count) return '无';
    if (count === 1) return '少量';
    if (count === 2) return '中量';
    return '大量';
  },

  /**
   * 转换经量类型
   */
  // 保留兼容（不再使用 flowType）
  getFlowType(value) {
    return 'none';
  },

  /**
   * 切换记录类型：在切换前先保存当前类型的未保存更改
   */
  async onRecordTypeChange(e) {
    const nextType = e.currentTarget.dataset.type;
    if (!nextType || nextType === this.data.recordType) return;

    try {
      // 如果有未保存的更改，先保存当前类型
      if (this.data.hasUnsavedChanges) {
        wx.showLoading({ title: '正在保存...', mask: true });
        // 立即取消自动保存计时器，避免重复触发
        if (this.data.autoSaveTimer) {
          clearInterval(this.data.autoSaveTimer);
          this.setData({ autoSaveTimer: null });
        }
        await this.saveCurrentRecord();
        this.notifyRecordSaved && this.notifyRecordSaved();
        this.setData({ hasUnsavedChanges: false, autoSaveCountdown: 0 });
      }
    } catch (error) {
      console.error('切换前保存失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请稍后重试', icon: 'none' });
      return; // 保存失败则不切换，避免丢失编辑
    } finally {
      wx.hideLoading();
    }

    // 切换到目标类型
    this.setData({ recordType: nextType });
  },

  /**
   * 日期选择变化
   */
  onDateChange(e) {
    const selectedDate = e.detail.value;
    this.setData({ 
      selectedDate: selectedDate,
      formattedDate: this.formatSelectedDate(selectedDate)
    });
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

  // ==================== 自动保存相关方法 ====================
  
  /**
   * 标记有未保存的更改
   */
  markUnsavedChanges() {
    this.setData({ hasUnsavedChanges: true });
    // 重置已有计时器
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
    // 直接开始6秒倒计时
    this.startAutoSaveTimer(6);
  },

  /**
   * 开始自动保存倒计时
   */
  startAutoSaveTimer(seconds = 6) {
    this.setData({ autoSaveCountdown: seconds });
    const timer = setInterval(() => {
      const countdown = this.data.autoSaveCountdown - 1;
      this.setData({ autoSaveCountdown: countdown });
      if (countdown <= 0) {
        clearInterval(timer);
        this.setData({ autoSaveTimer: null });
        this.autoSaveCurrentRecord();
      }
    }, 1000);
    this.setData({ autoSaveTimer: timer });
  },

  /**
   * 取消自动保存
   */
  cancelAutoSave() {
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
    this.setData({
      autoSaveTimer: null,
      hasUnsavedChanges: false,
      autoSaveCountdown: 0
    });
  },

  /**
   * 手动保存当前记录
   */
  async manualSaveCurrentRecord() {
    this.cancelAutoSave();
    await this.saveCurrentRecord();
    this.notifyRecordSaved();
  },

  /**
   * 自动保存当前记录
   */
  async autoSaveCurrentRecord() {
    this.setData({
      autoSaveTimer: null,
      hasUnsavedChanges: false,
      autoSaveCountdown: 0
    });
    await this.saveCurrentRecord();
    this.notifyRecordSaved();
  },

  /**
   * 通知上一个页面记录已保存（用于日历返回后刷新且保持月份）
   */
  notifyRecordSaved() {
    try {
      if (typeof this.getOpenerEventChannel === 'function') {
        const eventChannel = this.getOpenerEventChannel();
        if (eventChannel) {
          eventChannel.emit('recordSaved');
          eventChannel.emit('recordUpdated');
        }
      }
    } catch (e) {
      // 忽略通知异常
    }
  },

  /**
   * 保存当前记录（根据记录类型）
   */
  async saveCurrentRecord() {
    const { recordType } = this.data;
    
    try {
      switch (recordType) {
        case 'temperature':
          await this.saveTemperatureRecord();
          break;
        case 'menstrual':
          await this.saveMenstrualRecord();
          break;
        case 'intercourse':
          await this.saveIntercourseRecord();
          break;
      }
    } catch (error) {
      console.error('保存记录失败:', error);
    }
  },

  /**
   * 页面卸载时清理定时器
   */
  onUnload() {
    if (this.data.autoSaveTimer) {
      clearInterval(this.data.autoSaveTimer);
    }
  },

  /**
   * 生成体温选项数组
   */
  generateTemperatureOptions() {
    const options = [];
    // 体温范围：35.0°C - 42.0°C，步长0.1°C
    for (let temp = 35.0; temp <= 42.0; temp += 0.1) {
      options.push({
        value: Math.round(temp * 10) / 10, // 确保精度
        label: temp.toFixed(1) + '°C'
      });
    }
    return options;
  },

  // ==================== 体温记录相关方法 ====================
  
  /**
   * 体温选择变化
   */
  onTemperatureChange(e) {
    const index = e.detail.value;
    const selectedOption = this.data.temperatureOptions[index];
    
    if (selectedOption) {
      this.setData({
        temperatureIndex: index,
        temperatureValue: selectedOption.value.toFixed(1)
      });
      this.markUnsavedChanges();
    }
  },

  /**
   * 体温时间选择
   */
  onTemperatureTimeChange(e) {
    this.setData({ temperatureTime: e.detail.value });
    this.markUnsavedChanges();
  },

  /**
   * 体温备注输入
   */
  onTemperatureNoteInput(e) {
    this.setData({ temperatureNote: e.detail.value });
    this.markUnsavedChanges();
  },

  /**
   * 保存体温记录
   */
  async saveTemperatureRecord() {
    const { temperatureValue, temperatureTime, temperatureNote, selectedDate } = this.data;
    
    if (!temperatureValue) {
      wx.showToast({ title: '请选择体温', icon: 'none' });
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
        this.setData({ hasUnsavedChanges: false });
        await this.loadTodayRecord();
        this.notifyRecordSaved();
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
   * 经量选项点击
   */
  // 卫生巾数量选择
  onPadOptionTap(e) {
    const count = Number(e.currentTarget.dataset.count || 0);
    this.setData({ menstrualPadCount: count });
    this.markUnsavedChanges();
  },

  // 颜色选择
  onColorOptionTap(e) {
    const color = e.currentTarget.dataset.color || '';
    this.setData({ menstrualColor: color });
    this.markUnsavedChanges();
  },


  /**
   * 经量备注输入
   */
  onMenstrualNoteInput(e) {
    this.setData({ menstrualNote: e.detail.value });
    this.markUnsavedChanges();
  },

  /**
   * 保存经量记录
   */
  async saveMenstrualRecord() {
    const { menstrualPadCount, menstrualColor, isStartPeriod, isEndPeriod, menstrualNote, selectedDate } = this.data;
    
    try {
      this.setData({ isLoading: true });
      
      const dataManager = DataManager.getInstance();
      const record = {
        date: selectedDate,
        padCount: Number(menstrualPadCount || 0),
        color: menstrualColor || undefined,
        isStart: !!isStartPeriod,
        isEnd: !!isEndPeriod,
        note: menstrualNote
      };
      
      const result = await dataManager.saveMenstrualRecord(record);
      
      if (result.success) {
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.setData({ hasUnsavedChanges: false });
        await this.loadTodayRecord();
        this.notifyRecordSaved();
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
    this.markUnsavedChanges();
  },

  /**
   * 避孕措施切换
   */
  onProtectionChange(e) {
    this.setData({ hasProtection: e.detail.value });
    this.markUnsavedChanges();
  },

  /**
   * 同房备注输入
   */
  onIntercourseNoteInput(e) {
    this.setData({ intercourseNote: e.detail.value });
    this.markUnsavedChanges();
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
    this.markUnsavedChanges();
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
          this.setData({ hasUnsavedChanges: false });
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
        this.setData({ hasUnsavedChanges: false });
        await this.loadTodayRecord();
        this.notifyRecordSaved();
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