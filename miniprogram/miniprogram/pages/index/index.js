// pages/index/index.js
const { FertilityStorage } = require('../../utils/storage');
const { DateUtils } = require('../../utils/date');
const { OvulationAlgorithm } = require('../../utils/ovulationAlgorithm');
const { DataAnalysis } = require('../../utils/dataAnalysis');

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
    showCycleModal: false,
    selectedPhase: 'unknown',
    // 授权相关
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    userInfo: null,
    // 周期开始日期设置
    showCycleStartModal: false,
    cycleStartDate: '',
    cycleStartMinDate: '',
    cycleStartFlow: 'medium',
    // 问候语相关
    greeting: '',
    greetingEmoji: '',
    greetingTip: ''
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
  },

  /**
   * 显示周期开始日期设置模态框
   */
  showCycleStartModal() {
    this.setData({
      showCycleStartModal: true
    });
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
      const cycles = await FertilityStorage.getCycles() || [];
      
      // 添加新周期
      cycles.push(newCycle);
      
      // 保存周期数据
      await FertilityStorage.saveCycles(cycles);
      
      // 同时记录月经数据
      const dayRecords = await FertilityStorage.getDayRecords() || {};
      
      // 创建或更新当天的记录
      if (!dayRecords[this.data.cycleStartDate]) {
        dayRecords[this.data.cycleStartDate] = {};
      }
      
      // 添加月经记录
      dayRecords[this.data.cycleStartDate].menstrual = {
        flow: this.data.cycleStartFlow,
        symptoms: [],
        notes: '周期开始日期'
      };
      
      // 保存日记录
      await FertilityStorage.saveDayRecords(dayRecords);
      
      // 关闭模态框
      this.setData({
        showCycleStartModal: false
      });
      
      // 刷新页面数据
      this.loadPageData();
      
      wx.showToast({
        title: '周期设置成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('设置周期开始日期失败:', error);
      wx.showToast({
        title: '设置失败',
        icon: 'none'
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
        intercourseData
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
      if (analysisResult.ovulationWindow.isValid) {
        const updatedCycleInfo = { ...this.data.cycleInfo };
        
        if (analysisResult.ovulationWindow.ovulationDate) {
          updatedCycleInfo.ovulationPrediction = analysisResult.ovulationWindow.ovulationDate;
        }
        
        if (analysisResult.cycleAnalysis.isValid && analysisResult.cycleAnalysis.nextMenstrualDate) {
          updatedCycleInfo.nextPeriod = analysisResult.cycleAnalysis.nextMenstrualDate;
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
   * 生成问候语
   */
  generateGreeting() {
    try {
      const now = new Date();
      const hour = now.getHours();
      let timeGreeting = '';
      let emoji = '';
      
      // 根据时间段生成不同的问候语
      if (hour >= 5 && hour < 9) {
        timeGreeting = '早安';
        emoji = '🌅';
      } else if (hour >= 9 && hour < 12) {
        timeGreeting = '上午好';
        emoji = '☀️';
      } else if (hour >= 12 && hour < 14) {
        timeGreeting = '午安';
        emoji = '🌞';
      } else if (hour >= 14 && hour < 18) {
        timeGreeting = '下午好';
        emoji = '🌤️';
      } else if (hour >= 18 && hour < 22) {
        timeGreeting = '晚上好';
        emoji = '🌙';
      } else {
        timeGreeting = '夜深了';
        emoji = '✨';
      }
      
      // 温馨称呼列表
      const nicknames = ['亲爱的', '美丽的', '可爱的', '温柔的', '勇敢的', '坚强的', '聪明的'];
      const randomNickname = nicknames[Math.floor(Math.random() * nicknames.length)];
      
      // 根据周期阶段生成个性化问候语
      let phaseTip = '';
      if (this.data.cycleInfo && this.data.cycleInfo.phase) {
        switch (this.data.cycleInfo.phase) {
          case 'menstrual':
            phaseTip = '月经期要注意保暖哦，多喝热水~';
            break;
          case 'follicular':
            phaseTip = '卵泡期是活力满满的时候，今天也要元气满满哦！';
            break;
          case 'ovulation':
            phaseTip = '排卵期到啦，是备小孕的好时机呢！';
            break;
          case 'luteal':
            phaseTip = '黄体期要注意休息，保持好心情很重要哦~';
            break;
          default:
            phaseTip = '今天也要开心哦，记得记录你的身体状况~';
        }
      } else {
        // 随机鼓励语
        const encouragements = [
          '今天也要元气满满哦！',
          '记录身体变化，更懂自己~',
          '健康生活，好孕相伴！',
          '每一天都是新的开始！',
          '坚持记录，收获惊喜！'
        ];
        phaseTip = encouragements[Math.floor(Math.random() * encouragements.length)];
      }
      
      this.setData({
        greeting: `${timeGreeting}，${randomNickname}`,
        greetingEmoji: emoji,
        greetingTip: phaseTip
      });
    } catch (error) {
      console.error('生成问候语失败:', error);
      // 设置默认问候语
      this.setData({
        greeting: '你好',
        greetingEmoji: '👋',
        greetingTip: '欢迎使用备小孕！'
      });
    }
  }
});
