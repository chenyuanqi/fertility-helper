// pages/index/index.js
const { FertilityStorage } = require('../../utils/storage');
const { DateUtils } = require('../../utils/date');
const { OvulationAlgorithm } = require('../../utils/ovulationAlgorithm');
const { DataAnalysis } = require('../../utils/dataAnalysis');
const { DataManager } = require('../../utils/dataManager.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    currentDate: '',
    todayRecord: null,
    userSettings: null,
    cycleInfo: {
      cycleDay: 0,
      phase: 'unknown',
      nextPeriod: '',
      ovulationPrediction: ''
    },
    // 智能分析结果
    smartAnalysis: {
      ovulationWindow: null,
      fertileWindow: null,
      recommendations: [],
      confidence: 'low'
    },
    quickStats: {
      temperatureRecords: 0,
      menstrualDays: 0,
      intercourseCount: 0
    },
    isLoading: true,
    showFabMenu: false,
    fabMinimized: false,
    lastScrollTop: 0,
    showCycleModal: false,
    selectedPhase: 'unknown',
    // 授权相关
    hasUserInfo: true,
    canIUseGetUserProfile: false,
    userInfo: {
      nickName: '用户',
      avatarUrl: '/images/default-avatar.png'
    },
    // 周期开始日期设置
    showCycleStartModal: false,
    cycleStartDate: '',
    cycleStartMinDate: '',
    cycleStartFlow: 'medium',
    // 问候语相关
    greeting: '',
    greetingEmoji: '',
    greetingTip: '',
    // 今日记录完成进度
    recordsProgress: { completed: 0, total: 3, percent: 0 },
    // 数据说明弹窗
    showStatsExplanationModal: false,
    statsExplanationTitle: '',
    statsExplanationContent: '',
    statsExplanationTips: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    try {
      console.log('Index page onLoad start');
      
      const today = DateUtils.getToday();
      console.log('Today date:', today);
      
      // 设置日期相关数据
      const threeMonthsAgo = DateUtils.subtractDays(today, 90);
      
      this.setData({
        currentDate: today,
        cycleStartMinDate: threeMonthsAgo,
        cycleStartDate: today
      });
      
      console.log('Current date set to:', this.data.currentDate);
      
      // 生成问候语
      this.generateGreeting();
      
      // 检查是否可以使用 getUserProfile API
      if (wx.getUserProfile) {
        this.setData({
          canIUseGetUserProfile: true
        });
      }
      
      // 检查用户是否已授权
      this.checkUserAuth();
      
      this.loadPageData();
    } catch (error) {
      console.error('Index page onLoad error:', error);
      // 设置一个默认日期，避免页面完全不可用
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      this.setData({
        currentDate: dateString
      });
      
      wx.showToast({
        title: '页面初始化失败',
        icon: 'none'
      });
    }
  },

  // 跳转快捷记录
  goQuickRecord() {
    wx.navigateTo({ url: '/pages/quick-record/quick-record?date=' + (this.data.currentDate || '') });
  },

  /**
  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    console.log('=== Index page onShow - 页面显示时刷新数据 ===');
    
    // 如果来自图表页的“编辑/新建周期”意图，自动打开设置模态框
    try {
      const intent = wx.getStorageSync && wx.getStorageSync('fertility_open_cycle_edit');
      if (intent && intent.open) {
        // 清除意图，避免重复打开
        try { wx.removeStorageSync && wx.removeStorageSync('fertility_open_cycle_edit'); } catch (e) {}
        // 打开周期设置
        this.showCycleStartModal();
        // 继续刷新轻量信息
        this.loadUserSettings().catch(() => {});
        return;
      }
    } catch (e) {
      // 忽略
    }

    // 如果数据刚刚被更新，跳过这次刷新，避免覆盖刚保存的数据
    if (this.dataJustUpdated) {
      console.log('数据刚刚更新，跳过onShow刷新');
      // 但仍然刷新用户设置，确保昵称等轻量信息同步
      this.loadUserSettings().catch(() => {});
      return;
    }
    
    // 页面显示时刷新数据，确保获取最新的周期信息
    this.loadPageData();
  },

  /**
   * 加载页面数据
   */
  async loadPageData() {
    try {
      console.log('loadPageData start');
      this.setData({ isLoading: true });
      
      // 加载用户设置
      await this.loadUserSettings();
      
      // 加载今日记录
      await this.loadTodayRecord();
      
      // 在计算周期信息前，自动补齐周期到今天
      await DataManager.getInstance().ensureCyclesUpToCurrentDate();

      // 加载周期信息
      await this.loadCycleInfo();
      
      // 加载快速统计
      await this.loadQuickStats();
      
      // 执行智能分析
      await this.performSmartAnalysis();
      
      console.log('loadPageData completed');
    } catch (error) {
      console.error('加载页面数据失败:', error);
      wx.showToast({
        title: '加载数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  /**
   * 加载用户设置
   */
  async loadUserSettings() {
    try {
      let userSettings = await FertilityStorage.getUserSettings();
      // 若尚未初始化，创建默认设置，避免首页拿不到昵称
      if (!userSettings) {
        userSettings = {
          nickname: '小龙',
          avatar: '',
          personalInfo: { averageCycleLength: 28, averageLutealPhase: 14 },
          reminders: {
            morningTemperature: { enabled: true, time: '07:00' },
            fertileWindow: { enabled: true },
            periodPrediction: { enabled: true }
          }
        };
        try { await FertilityStorage.saveUserSettings(userSettings); } catch (e) {}
      }
      // 兼容可能存在的 nickName 字段，统一为 nickname
      if (userSettings && userSettings.nickName && !userSettings.nickname) {
        userSettings.nickname = userSettings.nickName;
      }
      this.setData({ userSettings });
    } catch (error) {
      console.error('加载用户设置失败:', error);
    }
  },

  /**
   * 加载今日记录
   */
  async loadTodayRecord() {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const todayRecord = dayRecords[this.data.currentDate] || null;
      this.setData({ todayRecord });
      // 更新今日记录完成进度
      this.updateRecordsProgress();
    } catch (error) {
      console.error('加载今日记录失败:', error);
    }
  },

  /**
  /**
   * 加载周期信息
   */
  async loadCycleInfo() {
    try {
      console.log('=== 开始加载周期信息 ===');
      const cycles = await FertilityStorage.getCycles();
      console.log('获取到的周期数据:', cycles);
      console.log('周期数据数量:', cycles ? cycles.length : 0);
      
      // 初始化周期信息
      const cycleInfo = {
        cycleDay: 0,
        phase: 'unknown',
        nextPeriod: '',
        ovulationPrediction: '',
        hasCycleData: false
      };
      
      // 只有当存在有效周期数据时才计算周期信息
      if (cycles && cycles.length > 0) {
        // 按开始日期排序，确保获取最新的周期
        const sortedCycles = cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const lastCycle = sortedCycles[0];
        
        console.log('最新周期数据:', lastCycle);
        
        if (lastCycle && lastCycle.startDate) {
          const daysSinceStart = DateUtils.getDaysDifference(lastCycle.startDate, this.data.currentDate);
          console.log('距离周期开始天数:', daysSinceStart);
          
          // 只有当天数合理时才显示周期信息（避免显示过大的天数）
          if (daysSinceStart >= 0 && daysSinceStart <= 60) {
            cycleInfo.cycleDay = daysSinceStart + 1;
            cycleInfo.hasCycleData = true;
            
            // 简单的周期阶段判断（基于设置的黄体期长度推导排卵窗口）
            const lutealLen = Math.max(10, Math.min(16, (this.data.userSettings?.personalInfo?.averageLutealPhase) || 14));
            const avgLen = Math.max(20, Math.min(40, (this.data.userSettings?.personalInfo?.averageCycleLength) || 28));
            const ovulationOffset = Math.max(6, avgLen - lutealLen); // 从周期开始起第几天（从0开始计）
            if (daysSinceStart < 5) {
              cycleInfo.phase = 'menstrual';
            } else if (daysSinceStart < ovulationOffset) {
              cycleInfo.phase = 'follicular';
            } else if (daysSinceStart < ovulationOffset + 2) {
              cycleInfo.phase = 'ovulation';
            } else {
              cycleInfo.phase = 'luteal';
            }
            
            // 预测下次月经
            // 预测下次月经 - 确保获取最新的用户设置
            const currentUserSettings = this.data.userSettings;
            const averageCycleLength = currentUserSettings?.personalInfo?.averageCycleLength || 28;
            
            console.log('当前用户设置:', currentUserSettings);
            console.log('使用的平均周期长度:', averageCycleLength);
            
            const nextPeriodDate = DateUtils.addDays(lastCycle.startDate, averageCycleLength);
            cycleInfo.nextPeriod = DateUtils.formatDisplayDate(nextPeriodDate);
            
            // 预测排卵日：下次月经前“黄体期长度”天
            const lutealPhaseLen = Math.max(10, Math.min(16, (currentUserSettings?.personalInfo?.averageLutealPhase) || 14));
            const ovulationDate = DateUtils.addDays(lastCycle.startDate, averageCycleLength - lutealPhaseLen);
            cycleInfo.ovulationPrediction = DateUtils.formatDisplayDate(ovulationDate);
            
            console.log('预测计算详情:');
            console.log('- 周期开始日期:', lastCycle.startDate);
            console.log('- 平均周期长度:', averageCycleLength);
            console.log('- 计算公式: 开始日期 + 周期长度');
            console.log('- 计算过程:', lastCycle.startDate, '+', averageCycleLength, '天');
            console.log('- 预测下次月经日期:', nextPeriodDate);
            console.log('- 预测下次月经显示:', cycleInfo.nextPeriod);
            console.log('- 预测排卵日期:', ovulationDate);
            console.log('- 预测排卵显示:', cycleInfo.ovulationPrediction);
            
            console.log('计算完成的周期信息:', cycleInfo);
          } else {
            console.log('周期天数不合理，不显示周期信息');
          }
        } else {
          console.log('周期数据无效');
        }
      } else {
        console.log('没有周期数据');
      }
      
      this.setData({ cycleInfo });
      console.log('周期信息设置完成:', this.data.cycleInfo);
    } catch (error) {
      console.error('加载周期信息失败:', error);
      // 设置默认的空周期信息
      this.setData({
        cycleInfo: {
          cycleDay: 0,
          phase: 'unknown',
          nextPeriod: '',
          ovulationPrediction: '',
          hasCycleData: false
        }
      });
    }
  },

  /**
   * 计算并更新“今日记录”完成进度
   */
  updateRecordsProgress() {
    try {
      const record = this.data.todayRecord || {};
      let completed = 0;
      if (record && record.temperature) completed++;
      if (record && record.menstrual) completed++;
      if (record && record.intercourse && Array.isArray(record.intercourse) && record.intercourse.length > 0) completed++;
      const total = 3;
      const percent = Math.round((completed / total) * 100);
      this.setData({ recordsProgress: { completed, total, percent } });
    } catch (e) {
      // 忽略单次失败
    }
  },

  /**
   * 加载快速统计
   */
  async loadQuickStats() {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      
      let temperatureRecords = 0;
      let menstrualDays = 0;
      let intercourseCount = 0;
      
      // 统计最近30天的数据
      const thirtyDaysAgo = DateUtils.subtractDays(this.data.currentDate, 30);
      
      Object.entries(dayRecords).forEach(([date, record]) => {
        if (date >= thirtyDaysAgo) {
          if (record.temperature) temperatureRecords++;
          
          // 只统计有实际月经的天数（不包括"无月经"）
          if (record.menstrual && record.menstrual.flow !== 'none') {
            menstrualDays++;
          }
          
          // 只统计实际同房次数（不包括"无同房"记录）
          if (record.intercourse && record.intercourse.length > 0) {
            const actualIntercourse = record.intercourse.filter(item => item.type !== 'none');
            intercourseCount += actualIntercourse.length;
          }
        }
      });
      
      this.setData({
        quickStats: {
          temperatureRecords,
          menstrualDays,
          intercourseCount
        }
      });
    } catch (error) {
      console.error('加载快速统计失败:', error);
    }
  },

  /**
   * 快速记录体温
   */
  quickRecordTemperature() {
    console.log('quickRecordTemperature clicked, currentDate:', this.data.currentDate);
    try {
      const url = `/pages/record/record?type=temperature&date=${this.data.currentDate}`;
      console.log('Navigation URL:', url);
      wx.navigateTo({
        url: url,
        success: () => {
          console.log('Navigation success');
        },
        fail: (error) => {
          console.error('Navigation fail:', error);
          wx.showToast({
            title: '跳转失败: ' + error.errMsg,
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('Navigation error:', error);
      wx.showToast({
        title: '跳转异常',
        icon: 'none'
      });
    }
  },

  /**
   * 快速记录月经
   */
  quickRecordMenstrual() {
    console.log('quickRecordMenstrual clicked, currentDate:', this.data.currentDate);
    try {
      const url = `/pages/record/record?type=menstrual&date=${this.data.currentDate}`;
      console.log('Navigation URL:', url);
      wx.navigateTo({
        url: url,
        success: () => {
          console.log('Navigation success');
        },
        fail: (error) => {
          console.error('Navigation fail:', error);
          wx.showToast({
            title: '跳转失败: ' + error.errMsg,
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('Navigation error:', error);
      wx.showToast({
        title: '跳转异常',
        icon: 'none'
      });
    }
  },

  /**
   * 快速记录同房
   */
  quickRecordIntercourse() {
    console.log('quickRecordIntercourse clicked, currentDate:', this.data.currentDate);
    try {
      const url = `/pages/record/record?type=intercourse&date=${this.data.currentDate}`;
      console.log('Navigation URL:', url);
      wx.navigateTo({
        url: url,
        success: () => {
          console.log('Navigation success');
        },
        fail: (error) => {
          console.error('Navigation fail:', error);
          wx.showToast({
            title: '跳转失败: ' + error.errMsg,
            icon: 'none'
          });
        }
      });
    } catch (error) {
      console.error('Navigation error:', error);
      wx.showToast({
        title: '跳转异常',
        icon: 'none'
      });
    }
  },

  /**
   * 查看图表
   */
  viewChart() {
    wx.switchTab({
      url: '/pages/chart/chart'
    });
  },

  /**
   * 查看日历
   */
  viewCalendar() {
    wx.switchTab({
      url: '/pages/calendar/calendar'
    });
  },

  /**
   * 格式化日期显示
   */
  formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  /**
   * 获取星期几
   */
  getDayOfWeek(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekDays[date.getDay()];
  },

  /**
   * 设置周期阶段
   */
  onSetCyclePhase() {
      // 关闭模态框
      this.setData({
        showCycleStartModal: false
      });
      
      // 强制刷新页面数据 - 确保使用最新保存的数据
      // 强制刷新页面数据 - 确保使用最新保存的数据
      console.log('=== 周期数据保存完成，开始刷新页面显示 ===');
      
      // 重新加载所有页面数据
      this.loadPageData().then(() => {
        console.log('=== 页面数据刷新完成 ===');
        wx.showToast({
          title: '周期设置成功',
          icon: 'success'
        });
      }).catch((refreshError) => {
        console.error('刷新页面数据失败:', refreshError);
        wx.showToast({
          title: '数据刷新失败',
          icon: 'none'
        });
      });
  },

  /**
   * 确认周期阶段设置
   */
  confirmCyclePhase() {
    if (this.data.selectedPhase === 'unknown') {
      wx.showToast({
        title: '请选择周期阶段',
        icon: 'none'
      });
      return;
    }

    // 更新周期信息
    this.setData({
      'cycleInfo.phase': this.data.selectedPhase,
      showCycleModal: false
    });
    
    // 保存到本地存储
    this.saveCyclePhase(this.data.selectedPhase);
    
    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
  },

  /**
   * 关闭周期设置模态框
   */
  closeCycleModal() {
    this.setData({
      showCycleModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击模态框内容时关闭模态框
  },

  /**
   * 保存周期阶段到本地存储
   */
  async saveCyclePhase(phase) {
    try {
      // 这里可以调用存储API保存用户设置的周期阶段
      console.log('保存周期阶段:', phase);
    } catch (error) {
      console.error('保存周期阶段失败:', error);
    }
  },

  /**
   * 切换FAB菜单显示状态
   */
  toggleFabMenu() {
    this.setData({
      showFabMenu: !this.data.showFabMenu
    });
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadPageData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 检查用户授权状态
   */
  checkUserAuth() {
    // 新版本不再需要用户授权，直接设置为已授权状态
    this.setData({
      hasUserInfo: true,
      userInfo: {
        nickName: '用户',
        avatarUrl: '/images/default-avatar.png'
      }
    });
  },

  /**
   * 获取用户信息（使用新的方式）
   */
  getUserProfile() {
    // 不再使用废弃的getUserProfile API
    // 直接设置默认用户信息或跳过用户信息获取
    this.setData({
      hasUserInfo: true,
      userInfo: {
        nickName: '用户',
        avatarUrl: '/images/default-avatar.png'
      }
    });
    
    wx.showToast({
      title: '欢迎使用',
      icon: 'success'
    });
  },

  /**
   * 获取用户信息（兼容处理）
   */
  getUserInfo(e) {
    // 兼容处理，直接设置为已授权
    this.setData({
      hasUserInfo: true,
      userInfo: {
        nickName: '用户',
        avatarUrl: '/images/default-avatar.png'
      }
    });
  },

  /**
   * 更新用户设置
   */
  async updateUserSettings(userInfo) {
    try {
      if (!userInfo) return;
      
      const userSettings = await FertilityStorage.getUserSettings() || {};
      
      // 更新用户昵称和头像
      userSettings.nickname = userInfo.nickName;
      userSettings.avatarUrl = userInfo.avatarUrl;
      userSettings.updatedAt = DateUtils.formatISO(new Date());
      
      await FertilityStorage.saveUserSettings(userSettings);
      
      // 刷新页面数据
      this.loadPageData();
    } catch (error) {
      console.error('更新用户设置失败:', error);
    }
  },

  /**
  /**
   * 显示周期开始日期设置模态框
   */
  async showCycleStartModal() {
    try {
      // 获取最新的周期数据，设置为默认日期
      const cycles = await FertilityStorage.getCycles();
      let defaultDate = DateUtils.getToday(); // 默认为今天
      
      if (cycles && cycles.length > 0) {
        // 按开始日期排序，获取最新的周期
        const sortedCycles = cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const lastCycle = sortedCycles[0];
        if (lastCycle && lastCycle.startDate) {
          defaultDate = lastCycle.startDate; // 使用上次设置的日期
          console.log('使用上次设置的周期开始日期:', defaultDate);
        }
      }
      
      this.setData({
        showCycleStartModal: true,
        cycleStartDate: defaultDate
      });
    } catch (error) {
      console.error('显示周期设置模态框失败:', error);
      // 出错时使用今天作为默认日期
      this.setData({
        showCycleStartModal: true,
        cycleStartDate: DateUtils.getToday()
      });
    }
  },

  /**
   * 关闭周期开始日期设置模态框
   */
  closeCycleStartModal() {
    this.setData({
      showCycleStartModal: false
    });
  },

  /**
   * 周期开始日期变更
   */
  onCycleStartDateChange(e) {
    this.setData({
      cycleStartDate: e.detail.value
    });
  },

  /**
   * 选择月经量
   */
  selectFlow(e) {
    const flow = e.currentTarget.dataset.flow;
    this.setData({
      cycleStartFlow: flow
    });
  },

  /**
   * 确认周期开始日期设置
   */
  async confirmCycleStart() {
    try {
      if (!this.data.cycleStartDate) {
        wx.showToast({
          title: '请选择日期',
          icon: 'none'
        });
        return;
      }

      console.log('=== 开始保存周期数据 ===');
      console.log('设置日期:', this.data.cycleStartDate);
      console.log('月经量:', this.data.cycleStartFlow);

      // 显示加载提示
      wx.showLoading({
        title: '保存中...',
        mask: true
      });

      // 创建新的周期记录
      const newCycle = {
        id: this.generateId(),
        startDate: this.data.cycleStartDate,
        endDate: null, // 结束日期暂时为空，将在下一个周期开始时设置
        length: null, // 周期长度暂时为空，将在下一个周期开始时计算
        notes: '用户手动设置的周期开始日期',
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date())
      };

      // 获取现有周期数据
      let cycles = await FertilityStorage.getCycles() || [];
      console.log('现有周期数据:', cycles);
      
      // 重新设置周期开始时间的逻辑：
      // 1. 如果是第一次设置（没有周期数据），直接添加
      // 2. 如果已有周期数据，则替换最新的周期记录，避免重复
      if (cycles.length === 0) {
        // 第一次设置周期
        cycles.push(newCycle);
        console.log('第一次设置周期，添加新记录');
      } else {
        // 已有周期数据，按日期排序找到最新的周期
        cycles.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const latestCycle = cycles[0];
        
        // 检查是否是同一个日期的重复设置
        if (latestCycle.startDate === this.data.cycleStartDate) {
          // 相同日期，更新现有记录
          cycles[0] = newCycle;
          console.log('更新相同日期的周期记录');
        } else {
          // 不同日期，需要结束上一个周期并开始新周期
          const selectedDate = new Date(this.data.cycleStartDate);
          const latestDate = new Date(latestCycle.startDate);
          
          if (selectedDate > latestDate) {
            // 新日期在最新周期之后，正常的新周期
            // 结束上一个周期
            const daysDifference = DateUtils.getDaysDifference(latestCycle.startDate, this.data.cycleStartDate);
            cycles[0].endDate = DateUtils.subtractDays(this.data.cycleStartDate, 1);
            cycles[0].length = daysDifference;
            cycles[0].updatedAt = DateUtils.formatISO(new Date());
            
            // 添加新周期
            cycles.unshift(newCycle);
            console.log('结束上一个周期，开始新周期');
          } else {
            // 新日期在最新周期之前，替换最新周期（用户修正周期开始时间）
            cycles[0] = newCycle;
            console.log('修正周期开始时间，替换最新周期');
          }
        }
      }
      
      // 重新计算周期范围（如果修改了现有周期的开始时间）
      await this.recalculateCycleRanges(cycles);
      
      // 保存周期数据 - 使用多重保存确保数据持久化
      console.log('=== 开始保存周期数据到存储 ===');
      await FertilityStorage.saveCycles(cycles);
      
      // 等待一段时间确保数据写入完成
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // 验证数据是否保存成功
      const isDataSaved = await this.verifyCycleDataSaved(this.data.cycleStartDate);
      if (!isDataSaved) {
        // 如果验证失败，再次尝试保存
        console.log('第一次验证失败，重新保存数据');
        await FertilityStorage.saveCycles(cycles);
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const isDataSavedRetry = await this.verifyCycleDataSaved(this.data.cycleStartDate);
        if (!isDataSavedRetry) {
          throw new Error('数据保存验证失败，请重试');
        }
      }
      
      // 同时记录月经数据
      console.log('=== 开始保存月经记录 ===');
      let dayRecords = await FertilityStorage.getDayRecords() || {};
      
      // 创建或更新当天的记录
      if (!dayRecords[this.data.cycleStartDate]) {
        dayRecords[this.data.cycleStartDate] = { date: this.data.cycleStartDate };
      }
      
      // 添加月经记录
      dayRecords[this.data.cycleStartDate].menstrual = {
        id: this.generateId(),
        flow: this.data.cycleStartFlow,
        symptoms: [],
        notes: '周期开始日期',
        isStart: true,
        createdAt: DateUtils.formatISO(new Date()),
        updatedAt: DateUtils.formatISO(new Date())
      };
      
      // 保存日记录
      await FertilityStorage.saveDayRecords(dayRecords);
      console.log('日记录保存成功');
      
      // 设置一个标记，表示数据刚刚被更新，避免onShow时重新加载覆盖
      this.dataJustUpdated = true;
      
      // 关闭模态框
      this.setData({
        showCycleStartModal: false
      });
      
      // 隐藏加载提示
      wx.hideLoading();
      
      // 强制刷新页面数据 - 确保使用最新保存的数据
      console.log('=== 周期数据保存完成，开始刷新页面显示 ===');
      await this.loadPageData();
      
      // 清除更新标记
      setTimeout(() => {
        this.dataJustUpdated = false;
      }, 1000);
      
      wx.showToast({
        title: '周期设置成功',
        icon: 'success',
        duration: 2000
      });
      
      console.log('=== 周期设置流程完成 ===');
    } catch (error) {
      console.error('设置周期开始日期失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '设置失败: ' + error.message,
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 执行智能分析
   */
  async performSmartAnalysis() {
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      
      // 准备体温数据
      const temperatureData = Object.entries(dayRecords)
        .filter(([date, record]) => record.temperature && record.temperature.temperature)
        .map(([date, record]) => ({
          date,
          temperature: record.temperature.temperature
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // 准备月经数据
      const menstrualData = Object.entries(dayRecords)
        .filter(([date, record]) => record.menstrual && record.menstrual.flow && record.menstrual.flow !== 'none')
        .map(([date, record]) => ({
          date,
          flow: record.menstrual.flow,
          isStart: this.isMenstrualStart(date, dayRecords),
          isEnd: this.isMenstrualEnd(date, dayRecords)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // 准备同房数据
      const intercourseData = Object.entries(dayRecords)
        .filter(([date, record]) => record.intercourse && record.intercourse.length > 0)
        .map(([date, record]) => ({
          date,
          times: record.intercourse.length,
          protection: record.intercourse.some(item => item.protection)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // 执行综合分析
      const analysisResult = OvulationAlgorithm.comprehensiveAnalysis(
        temperatureData,
        menstrualData,
        intercourseData,
        { averageLutealPhase: (this.data.userSettings?.personalInfo?.averageLutealPhase) || 14 }
      );

      // 更新智能分析结果
      this.setData({
        smartAnalysis: {
          ovulationWindow: analysisResult.ovulationWindow,
          fertileWindow: analysisResult.fertileWindow,
          recommendations: analysisResult.recommendations.slice(0, 3), // 只显示前3个建议
          confidence: analysisResult.ovulationWindow.confidence || 'low',
          temperatureAnalysis: analysisResult.temperatureAnalysis,
          cycleAnalysis: analysisResult.cycleAnalysis
        }
      });

      // 更新周期信息
      // 更新周期信息（只在有足够数据且分析结果可靠时才覆盖基础预测）
      if (analysisResult.ovulationWindow.isValid && analysisResult.ovulationWindow.confidence === 'high') {
        const updatedCycleInfo = { ...this.data.cycleInfo };
        
        console.log('智能分析结果可靠，更新预测信息');
        console.log('分析结果:', analysisResult);
        
        if (analysisResult.ovulationWindow.ovulationDate) {
          updatedCycleInfo.ovulationPrediction = analysisResult.ovulationWindow.ovulationDate;
          console.log('更新排卵预测:', analysisResult.ovulationWindow.ovulationDate);
        }
        
        // 只有在分析结果非常可靠时才覆盖基础的月经预测
        if (analysisResult.cycleAnalysis.isValid && 
            analysisResult.cycleAnalysis.nextMenstrualDate && 
            analysisResult.ovulationWindow.confidence === 'high') {
          updatedCycleInfo.nextPeriod = analysisResult.cycleAnalysis.nextMenstrualDate;
          console.log('更新月经预测:', analysisResult.cycleAnalysis.nextMenstrualDate);
        }

        // 更新当前周期阶段
        if (analysisResult.fertileWindow.isValid) {
          const currentStatus = analysisResult.fertileWindow.currentStatus;
          switch (currentStatus.phase) {
            case 'optimal':
            case 'fertile':
              updatedCycleInfo.phase = 'ovulation';
              break;
            case 'pre_fertile':
              updatedCycleInfo.phase = 'follicular';
              break;
            case 'post_fertile':
              updatedCycleInfo.phase = 'luteal';
              break;
          }
        }

        this.setData({ cycleInfo: updatedCycleInfo });
      } else {
        console.log('智能分析结果不够可靠，保持基础预测');
        console.log('分析置信度:', analysisResult.ovulationWindow?.confidence);
      }

      console.log('智能分析完成:', analysisResult);
    } catch (error) {
      console.error('智能分析失败:', error);
      // 设置默认的分析结果
      this.setData({
        smartAnalysis: {
          ovulationWindow: null,
          fertileWindow: null,
          recommendations: [{
            type: 'data_quality',
            priority: 'high',
            title: '开始记录数据',
            content: '建议每天记录体温和月经信息，以获得更准确的排卵预测'
          }],
          confidence: 'low'
        }
      });
    }
  },

  /**
   * 判断是否为月经开始日
   */
  isMenstrualStart(date, dayRecords) {
    const currentRecord = dayRecords[date];
    if (!currentRecord || !currentRecord.menstrual || currentRecord.menstrual.flow === 'none') {
      return false;
    }

    // 检查前一天是否有月经记录
    const previousDate = DateUtils.subtractDays(date, 1);
    const previousRecord = dayRecords[previousDate];
    
    return !previousRecord || !previousRecord.menstrual || previousRecord.menstrual.flow === 'none';
  },

  /**
   * 判断是否为月经结束日
   */
  isMenstrualEnd(date, dayRecords) {
    const currentRecord = dayRecords[date];
    if (!currentRecord || !currentRecord.menstrual || currentRecord.menstrual.flow === 'none') {
      return false;
    }

    // 检查后一天是否有月经记录
    const nextDate = DateUtils.addDays(date, 1);
    const nextRecord = dayRecords[nextDate];
    
    return !nextRecord || !nextRecord.menstrual || nextRecord.menstrual.flow === 'none';
  },

  /**
   * 查看智能分析详情
   */
  viewSmartAnalysis() {
    if (!this.data.smartAnalysis.ovulationWindow && !this.data.smartAnalysis.fertileWindow) {
      wx.showToast({
        title: '暂无分析数据',
        icon: 'none'
      });
      return;
    }

    // 跳转到图表页面查看详细分析
    wx.switchTab({
      url: '/pages/chart/chart'
    });
  },

  /**
   * 获取易孕期状态文本
   */
  getFertileStatusText() {
    if (!this.data.smartAnalysis.fertileWindow || !this.data.smartAnalysis.fertileWindow.isValid) {
      return '暂无预测';
    }

    const status = this.data.smartAnalysis.fertileWindow.currentStatus;
    switch (status.phase) {
      case 'optimal':
        return '最佳受孕期';
      case 'fertile':
        return '易孕期';
      case 'pre_fertile':
        return `${status.daysToFertile}天后进入易孕期`;
      case 'post_fertile':
        return '易孕期已过';
      default:
        return '暂无预测';
    }
  },

  /**
   * 获取置信度文本
   */
  getConfidenceText() {
    switch (this.data.smartAnalysis.confidence) {
      case 'high':
        return '高准确度';
      case 'medium':
        return '中等准确度';
      case 'low':
        return '低准确度';
      default:
        return '暂无数据';
    }
  },

  /**
   * 生成唯一ID
   */
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
  /**
   * 重新计算周期范围
   * 当修改周期开始时间时，需要重新计算所有周期的结束日期和长度
   */
  async recalculateCycleRanges(cycles) {
    try {
      console.log('开始重新计算周期范围');
      
      if (!cycles || cycles.length === 0) {
        return;
      }
      
      // 获取用户设置的平均周期长度
      const userSettings = await FertilityStorage.getUserSettings();
      const averageCycleLength = userSettings?.personalInfo?.averageCycleLength || 28;
      
      // 按开始日期排序
      cycles.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      
      // 重新计算每个周期的结束日期和长度
      for (let i = 0; i < cycles.length; i++) {
        const currentCycle = cycles[i];
        const nextCycle = cycles[i + 1];
        
        if (nextCycle) {
          // 如果有下一个周期，当前周期的结束日期是下一个周期开始的前一天
          const nextStartDate = new Date(nextCycle.startDate);
          const currentEndDate = new Date(nextStartDate);
          currentEndDate.setDate(currentEndDate.getDate() - 1);
          
          currentCycle.endDate = DateUtils.formatDate(currentEndDate);
          currentCycle.length = DateUtils.getDaysDifference(currentCycle.startDate, currentCycle.endDate) + 1;
          
          console.log(`重新计算周期 ${i + 1}:`, {
            startDate: currentCycle.startDate,
            endDate: currentCycle.endDate,
            length: currentCycle.length
          });
        } else {
          // 最后一个周期，使用平均周期长度计算结束日期
          const startDate = new Date(currentCycle.startDate);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + averageCycleLength - 1);
          
          currentCycle.endDate = DateUtils.formatDate(endDate);
          currentCycle.length = averageCycleLength;
          
          console.log(`重新计算最后周期:`, {
            startDate: currentCycle.startDate,
            endDate: currentCycle.endDate,
            length: currentCycle.length
          });
        }
        
        // 更新修改时间
        currentCycle.updatedAt = DateUtils.formatISO(new Date());
      }
      
      console.log('周期范围重新计算完成');
    } catch (error) {
      console.error('重新计算周期范围失败:', error);
      // 不抛出错误，避免影响主流程
    }
  },

  /**
   * 验证数据保存是否成功
   */
  async verifyCycleDataSaved(expectedDate) {
    try {
      console.log('=== 开始验证周期数据保存 ===');
      console.log('期望日期:', expectedDate);
      
      // 等待一小段时间确保数据已写入
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 多次尝试验证，确保数据读取的可靠性
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`第${attempt}次验证尝试`);
        
        const cycles = await FertilityStorage.getCycles();
        console.log(`第${attempt}次获取的周期数据:`, cycles);
        
        if (!cycles || cycles.length === 0) {
          console.error(`第${attempt}次验证失败：没有找到任何周期数据`);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          return false;
        }
        
        const foundCycle = cycles.find(cycle => cycle.startDate === expectedDate);
        if (!foundCycle) {
          console.error(`第${attempt}次验证失败：没有找到指定日期的周期数据`);
          console.error('现有周期日期:', cycles.map(c => c.startDate));
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          return false;
        }
        
        console.log(`第${attempt}次验证成功：找到周期数据`, foundCycle);
        
        // 额外验证：检查数据完整性
        if (!foundCycle.id || !foundCycle.createdAt) {
          console.error(`第${attempt}次验证失败：数据不完整`);
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }
          return false;
        }
        
        console.log('=== 数据验证完全成功 ===');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('验证周期数据时出错:', error);
      return false;
    }
  },

  /**
   * 显示统计数据说明
   */
  showStatsExplanation(e) {
    const { type } = e.currentTarget.dataset;
    let title = '';
    let content = '';
    let tips = '';

    switch (type) {
      case 'temperature':
        title = '体温记录说明';
        content = `体温记录：${this.data.quickStats.temperatureRecords}天

统计最近30天内所有有效的基础体温记录。

基础体温是指在完全休息状态下的体温，通常在清晨起床前测量。体温的变化可以帮助判断排卵期和月经周期。

记录越完整，排卵预测和周期分析就越准确。建议每天同一时间测量并记录。`;
        tips = '连续记录10天以上的体温数据，AI分析会更准确';
        break;
      case 'menstrual':
        title = '月经天数说明';
        content = `月经天数：${this.data.quickStats.menstrualDays}天

统计最近30天内所有月经期的天数（不包括"无月经"的记录）。

月经天数是指月经来潮的实际天数，正常范围通常是3-7天。记录月经量的多少有助于了解身体健康状况。

完整的月经记录有助于：
• 计算准确的周期长度
• 预测下次月经时间
• 监测月经规律性`;
        tips = '建议记录每天的月经量变化，从开始到结束';
        break;
      case 'intercourse':
        title = '同房次数说明';
        content = `同房次数：${this.data.quickStats.intercourseCount}次

统计最近30天内所有同房记录的总次数（不包括"无同房"的记录）。

记录同房时间有助于：
• 结合排卵期预测提高受孕概率
• 分析同房频率与周期的关系
• 为医生提供完整的备孕信息

同房记录会在图表中以特殊标记显示，方便查看与排卵期的关系。`;
        tips = '在易孕期内增加同房频率，可以提高受孕几率';
        break;
    }

    this.setData({
      showStatsExplanationModal: true,
      statsExplanationTitle: title,
      statsExplanationContent: content,
      statsExplanationTips: tips
    });
  },

  /**
   * 关闭统计数据说明弹窗
   */
  closeStatsExplanationModal() {
    this.setData({
      showStatsExplanationModal: false
    });
  },

  /**
   * 生成个性化问候语
   */
  generateGreeting() {
    try {
      const now = new Date();
      const hour = now.getHours();

      // 获取用户昵称，如果没有则使用"小龙"
      const userName = this.data.userSettings?.nickname || '小龙';

      // 获取今日记录完成情况
      const recordsProgress = this.data.recordsProgress || { completed: 0, total: 3 };

      // 时间段问候语配置
      const timeGreetings = this.getTimeBasedGreeting(hour);

      // 生成个性化问候和建议
      const personalizedContent = this.getPersonalizedContent(recordsProgress);

      this.setData({
        greeting: `${timeGreetings.greeting}，${userName}`,
        greetingEmoji: timeGreetings.emoji,
        greetingTip: personalizedContent
      });
    } catch (error) {
      console.error('生成问候语失败:', error);
      this.setData({
        greeting: '你好',
        greetingEmoji: '👋',
        greetingTip: '欢迎使用备小孕，开始健康记录吧！'
      });
    }
  },

  /**
   * 根据时间获取问候语
   */
  getTimeBasedGreeting(hour) {
    if (hour >= 5 && hour < 9) {
      return {
        greeting: '早安',
        emoji: '🌅'
      };
    } else if (hour >= 9 && hour < 12) {
      return {
        greeting: '上午好',
        emoji: '☀️'
      };
    } else if (hour >= 12 && hour < 14) {
      return {
        greeting: '中午好',
        emoji: '🌞'
      };
    } else if (hour >= 14 && hour < 18) {
      return {
        greeting: '下午好',
        emoji: '🌤️'
      };
    } else if (hour >= 18 && hour < 22) {
      return {
        greeting: '晚上好',
        emoji: '🌙'
      };
    } else {
      return {
        greeting: hour < 5 ? '夜深了' : '晚安',
        emoji: '✨'
      };
    }
  },

  /**
   * 生成个性化内容
   */
  getPersonalizedContent(recordsProgress) {
    const now = new Date();
    const hour = now.getHours();

    // 根据记录完成情况生成建议
    if (recordsProgress.completed === 0) {
      if (hour >= 6 && hour < 10) {
        return '新的一天开始了，记得测量基础体温哦~';
      } else if (hour >= 18 && hour < 23) {
        return '今天还没有记录数据呢，花1分钟记录一下吧💕';
      } else {
        return '坚持记录身体变化，更好地了解自己的周期规律';
      }
    } else if (recordsProgress.completed < recordsProgress.total) {
      return `今天已完成${recordsProgress.completed}项记录，继续加油！`;
    } else {
      // 全部完成时根据周期阶段给出建议
      return this.getPhaseBasedTip();
    }
  },

  /**
   * 根据周期阶段生成建议
   */
  getPhaseBasedTip() {
    const cycleInfo = this.data.cycleInfo;

    if (cycleInfo && cycleInfo.phase) {
      switch (cycleInfo.phase) {
        case 'menstrual':
          return '月经期要多休息，注意保暖，适当补充营养哦';
        case 'follicular':
          return '卵泡期是身体恢复活力的时候，可以适当运动';
        case 'ovulation':
          return '排卵期是受孕的最佳时机，注意身体信号变化';
        case 'luteal':
          return '黄体期保持心情愉悦，注意作息规律很重要';
        default:
          return '继续坚持记录，数据会帮你更了解身体周期';
      }
    }

    // 根据记录天数给出鼓励
    const stats = this.data.quickStats;
    if (stats && stats.temperatureRecords >= 10) {
      return '记录数据很丰富，AI分析会更准确哦！';
    } else if (stats && stats.temperatureRecords >= 5) {
      return '记录习惯很棒，继续保持下去！';
    } else {
      return '每天的记录都很宝贵，坚持就是胜利！';
    }
  },

  /**
   * 页面滚动监听 - 控制浮动按钮显示状态
   */
  onPageScroll(e) {
    const currentScrollTop = e.scrollTop;
    const lastScrollTop = this.data.lastScrollTop;
    const threshold = 50; // 滚动阈值

    // 判断滚动方向和距离
    if (Math.abs(currentScrollTop - lastScrollTop) > threshold) {
      if (currentScrollTop > lastScrollTop) {
        // 向下滚动 - 收缩按钮
        if (!this.data.fabMinimized) {
          this.setData({
            fabMinimized: true,
            showFabMenu: false // 收缩时关闭菜单
          });
        }
      } else {
        // 向上滚动 - 展开按钮
        if (this.data.fabMinimized) {
          this.setData({
            fabMinimized: false
          });
        }
      }

      this.setData({
        lastScrollTop: currentScrollTop
      });
    }
  }
});
