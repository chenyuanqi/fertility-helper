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
    isLoading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      currentDate: DateUtils.getToday()
    });
    
    this.loadPageData();
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
      this.setData({ isLoading: true });
      
      // 加载用户设置
      await this.loadUserSettings();
      
      // 加载今日记录
      await this.loadTodayRecord();
      
      // 加载周期信息
      await this.loadCycleInfo();
      
      // 加载快速统计
      await this.loadQuickStats();
      
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
          if (record.menstrual) menstrualDays++;
          if (record.intercourse) intercourseCount += record.intercourse.length;
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
    wx.navigateTo({
      url: '/pages/record/record?type=temperature'
    });
  },

  /**
   * 快速记录月经
   */
  quickRecordMenstrual() {
    wx.navigateTo({
      url: '/pages/record/record?type=menstrual'
    });
  },

  /**
   * 快速记录同房
   */
  quickRecordIntercourse() {
    wx.navigateTo({
      url: '/pages/record/record?type=intercourse'
    });
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
   * 下拉刷新
   */
  onPullDownRefresh() {
    this.loadPageData().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});