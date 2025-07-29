// pages/index/index.js
const { FertilityStorage } = require('../../utils/storage');
const { DateUtils } = require('../../utils/date');

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
    quickStats: {
      temperatureRecords: 0,
      menstrualDays: 0,
      intercourseCount: 0
    },
    isLoading: true,
    showFabMenu: false,
    showCycleModal: false,
    selectedPhase: 'unknown',
    // 授权相关
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    userInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    try {
      console.log('Index page onLoad start');
      
      const today = DateUtils.getToday();
      console.log('Today date:', today);
      
      this.setData({
        currentDate: today
      });
      
      console.log('Current date set to:', this.data.currentDate);
      
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

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新数据
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
      
      // 加载周期信息
      await this.loadCycleInfo();
      
      // 加载快速统计
      await this.loadQuickStats();
      
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
      const userSettings = await FertilityStorage.getUserSettings();
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
    } catch (error) {
      console.error('加载今日记录失败:', error);
    }
  },

  /**
   * 加载周期信息
   */
  async loadCycleInfo() {
    try {
      const cycles = await FertilityStorage.getCycles();
      
      // 简化的周期信息计算
      const cycleInfo = {
        cycleDay: 0,
        phase: 'unknown',
        nextPeriod: '',
        ovulationPrediction: ''
      };
      
      if (cycles && cycles.length > 0) {
        const lastCycle = cycles[cycles.length - 1];
        if (lastCycle && lastCycle.startDate) {
          const daysSinceStart = DateUtils.getDaysDifference(lastCycle.startDate, this.data.currentDate);
          cycleInfo.cycleDay = daysSinceStart + 1;
          
          // 简单的周期阶段判断
          if (daysSinceStart < 5) {
            cycleInfo.phase = 'menstrual';
          } else if (daysSinceStart < 14) {
            cycleInfo.phase = 'follicular';
          } else if (daysSinceStart < 16) {
            cycleInfo.phase = 'ovulation';
          } else {
            cycleInfo.phase = 'luteal';
          }
          
          // 预测下次月经
          const averageCycleLength = this.data.userSettings?.personalInfo?.averageCycleLength || 28;
          cycleInfo.nextPeriod = DateUtils.addDays(lastCycle.startDate, averageCycleLength);
          
          // 预测排卵日
          cycleInfo.ovulationPrediction = DateUtils.addDays(lastCycle.startDate, averageCycleLength - 14);
        }
      }
      
      this.setData({ cycleInfo });
    } catch (error) {
      console.error('加载周期信息失败:', error);
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
    this.setData({
      showCycleModal: true,
      selectedPhase: this.data.cycleInfo.phase || 'unknown'
    });
  },

  /**
   * 选择周期阶段
   */
  selectPhase(e) {
    const phase = e.currentTarget.dataset.phase;
    this.setData({
      selectedPhase: phase
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
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserInfo({
            success: (res) => {
              this.setData({
                userInfo: res.userInfo,
                hasUserInfo: true
              });
            }
          });
        }
      }
    });
  },

  /**
   * 获取用户信息（新接口）
   */
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料', // 声明获取用户个人信息后的用途
      success: (res) => {
        console.log('获取用户信息成功:', res);
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
        
        // 保存用户信息到全局
        const app = getApp();
        if (app.globalData) {
          app.globalData.userInfo = res.userInfo;
        }
        
        // 更新用户设置
        this.updateUserSettings(res.userInfo);
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 获取用户信息（旧接口，兼容）
   */
  getUserInfo(e) {
    if (e.detail.userInfo) {
      console.log('获取用户信息成功:', e.detail);
      this.setData({
        userInfo: e.detail.userInfo,
        hasUserInfo: true
      });
      
      // 保存用户信息到全局
      const app = getApp();
      if (app.globalData) {
        app.globalData.userInfo = e.detail.userInfo;
      }
      
      // 更新用户设置
      this.updateUserSettings(e.detail.userInfo);
    } else {
      console.log('用户拒绝授权');
    }
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
  }
});
