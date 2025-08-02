// app.js
const { FertilityStorage } = require('./utils/storage');
const { DateUtils } = require('./utils/date');
const { ReminderManager } = require('./utils/reminderManager');
const dataLoader = require('./utils/dataLoader');
const memoryManager = require('./utils/memoryManager');
const performanceMonitor = require('./utils/performanceMonitor');

App({
  globalData: {
    userSettings: null,
    systemInfo: null,
  },

  onLaunch: function () {
    console.log('备小孕启动');
    
    // 开始性能监控
    performanceMonitor.startMonitoring('app_launch');
    
    // 获取系统信息
    this.getSystemInfo().then(systemInfo => {
      this.globalData.systemInfo = systemInfo;
    }).catch(error => {
      console.error('获取系统信息失败:', error);
    });

    // 初始化用户设置
    this.initializeUserSettings();
    
    // 初始化提醒管理器
    this.initializeReminderManager();
    
    // 预加载核心数据
    this.preloadCoreData();
    
    // 检查应用版本更新
    this.checkForUpdates();
    
    // 结束性能监控
    performanceMonitor.endMonitoring('app_launch');
  },

  onShow: function() {
    console.log('应用进入前台');
    
    // 应用进入前台时重新检查提醒设置
    try {
      const reminderManager = ReminderManager.getInstance();
      reminderManager.init().catch(error => {
        console.error('重新初始化提醒管理器失败:', error);
      });
    } catch (error) {
      console.error('应用进入前台时处理提醒失败:', error);
    }
    
    // 重新开始内存监控
    memoryManager.startMonitoring();
  },

  onHide: function() {
    console.log('应用进入后台');
    
    // 应用进入后台时停止内存监控以节省资源
    memoryManager.stopMonitoring();
    
    // 清理过期缓存
    // 清理过期缓存
    if (dataLoader && typeof dataLoader.clearCache === 'function') {
      dataLoader.clearCache();
    }
  },

  onError: function(error) {
    console.error('应用错误:', error);
    // 可以在这里添加错误上报逻辑
  },

  /**
   * 获取系统信息
   */
  getSystemInfo: function() {
    return new Promise((resolve, reject) => {
      // 使用新的API替代弃用的wx.getSystemInfo
      Promise.all([
        new Promise(res => wx.getSystemSetting({ success: res, fail: () => res({}) })),
        new Promise(res => wx.getDeviceInfo({ success: res, fail: () => res({}) })),
        new Promise(res => wx.getWindowInfo({ success: res, fail: () => res({}) })),
        new Promise(res => wx.getAppBaseInfo({ success: res, fail: () => res({}) }))
      ]).then(([systemSetting, deviceInfo, windowInfo, appBaseInfo]) => {
        // 合并所有信息，保持与原wx.getSystemInfo兼容
        const systemInfo = {
          ...systemSetting,
          ...deviceInfo,
          ...windowInfo,
          ...appBaseInfo
        };
        resolve(systemInfo);
      }).catch(reject);
    });
  },

  /**
   * 初始化用户设置
   */
  initializeUserSettings: function() {
    const self = this;
    FertilityStorage.getUserSettings().then(userSettings => {
      if (!userSettings) {
        // 创建默认用户设置
        userSettings = {
          id: self.generateId(),
          personalInfo: {
            averageCycleLength: 28,
            averageLutealPhase: 14,
          },
          reminders: {
            morningTemperature: {
              enabled: true,
              time: '07:00',
            },
            fertileWindow: {
              enabled: true,
              daysBeforeOvulation: 3,
            },
            periodPrediction: {
              enabled: true,
              daysBeforePeriod: 2,
            },
          },
          preferences: {
            temperatureUnit: 'celsius',
            theme: 'light',
            language: 'zh-CN',
          },
          privacy: {
            enableAnalytics: false,
            enableDataExport: true,
          },
          createdAt: DateUtils.formatISO(new Date()),
          updatedAt: DateUtils.formatISO(new Date()),
        };
        
        return FertilityStorage.saveUserSettings(userSettings);
      }
      return Promise.resolve();
    }).then(() => {
      return FertilityStorage.getUserSettings();
    }).then(userSettings => {
      self.globalData.userSettings = userSettings;
    }).catch(error => {
      console.error('初始化用户设置失败:', error);
    });
  },

  /**
   * 初始化提醒管理器
   */
  initializeReminderManager: function() {
    try {
      // 延迟初始化，确保用户设置已加载
      setTimeout(async () => {
        try {
          const reminderManager = ReminderManager.getInstance();
          await reminderManager.init();
          console.log('提醒管理器初始化完成');
        } catch (error) {
          console.error('初始化提醒管理器失败:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('初始化提醒管理器失败:', error);
    }
  },

  /**
   * 检查应用更新
   */
  checkForUpdates: function() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          console.log('发现新版本');
        }
      });
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          },
        });
      });
      
      updateManager.onUpdateFailed(() => {
        console.error('新版本下载失败');
      });
    }
  },

  /**
  /**
   * 预加载核心数据
   */
  preloadCoreData: function() {
    // 延迟预加载，避免阻塞启动
    setTimeout(() => {
      if (dataLoader && typeof dataLoader.preloadData === 'function') {
        dataLoader.preloadData().catch(error => {
          console.error('预加载数据失败:', error);
        });
      } else {
        console.log('dataLoader.preloadData 方法不可用，跳过预加载');
      }
    }, 2000);
  },

  /**
   * 生成唯一ID
   */
  generateId: function() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
});
