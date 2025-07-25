// pages/settings/settings.js
const { DataManager } = require('../../utils/dataManager');
const { FertilityStorage } = require('../../utils/storage');

Page({
  data: {
    userSettings: {
      nickname: '',
      avatar: '', // 添加头像字段
      personalInfo: {
        averageCycleLength: 28,
        averageLutealPhase: 14
      },
      reminders: {
        morningTemperature: {
          enabled: true,
          time: '07:00'
        },
        fertileWindow: {
          enabled: true
        },
        periodPrediction: {
          enabled: true
        }
      }
    },
    statistics: {
      daysUsed: 0,
      totalRecords: 0,
      completeCycles: 0,
      temperatureRecords: 0,
      intercourseRecords: 0
    },
    showInputModal: false,
    showAvatarModal: false, // 添加头像模态框控制
    modalTitle: '',
    inputType: '',
    inputValue: '',
    focus_nickname: false,
    focus_cycleLength: false,
    focus_lutealPhase: false
  },

  async onLoad() {
    await this.loadUserSettings();
    await this.loadStatistics();
  },

  async onShow() {
    // 页面显示时更新统计数据
    await this.loadStatistics();
  },

  // 加载用户设置
  async loadUserSettings() {
    try {
      const settings = await FertilityStorage.getUserSettings();
      if (settings) {
        this.setData({
          userSettings: {
            ...this.data.userSettings,
            ...settings
          }
        });
      }
    } catch (error) {
      console.error('加载用户设置失败:', error);
      wx.showToast({
        title: '加载设置失败',
        icon: 'none'
      });
    }
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      const dataManager = DataManager.getInstance();
      
      // 获取所有日记录
      const dayRecords = await FertilityStorage.getDayRecords();
      const cycles = await FertilityStorage.getCycles();
      
      // 计算统计数据
      const statistics = this.calculateStatistics(dayRecords, cycles);
      
      this.setData({ statistics });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 计算统计数据
  calculateStatistics(dayRecords, cycles) {
    const records = Object.keys(dayRecords);
    let temperatureCount = 0;
    let intercourseCount = 0;
    
    // 统计各类记录数量
    records.forEach(date => {
      const record = dayRecords[date];
      if (record.temperature) temperatureCount++;
      if (record.intercourse && record.intercourse.length > 0) {
        intercourseCount += record.intercourse.length;
      }
    });
    
    // 计算使用天数
    const firstRecord = records.sort()[0];
    const daysUsed = firstRecord ? 
      Math.ceil((new Date() - new Date(firstRecord)) / (1000 * 60 * 60 * 24)) + 1 : 0;
    
    return {
      daysUsed,
      totalRecords: records.length,
      completeCycles: cycles.filter(cycle => cycle.isComplete).length,
      temperatureRecords: temperatureCount,
      intercourseRecords: intercourseCount
    };
  },

  // 编辑昵称
  editNickname() {
    this.showInputModal('编辑昵称', 'nickname', this.data.userSettings.nickname || '小明');
  },

  // 编辑周期长度
  editCycleLength() {
    this.showInputModal('编辑周期长度', 'cycleLength', 
      String(this.data.userSettings.personalInfo.averageCycleLength || 28));
  },

  // 编辑黄体期长度
  editLutealPhase() {
    this.showInputModal('编辑黄体期长度', 'lutealPhase', 
      String(this.data.userSettings.personalInfo.averageLutealPhase || 14));
  },

  // 设置提醒时间
  setReminderTime() {
    if (!this.data.userSettings.reminders.morningTemperature.enabled) {
      wx.showToast({
        title: '请先开启测温提醒',
        icon: 'none'
      });
      return;
    }
    this.showInputModal('设置提醒时间', 'reminderTime', 
      this.data.userSettings.reminders.morningTemperature.time || '07:00');
  },

  // 显示输入模态框
  showInputModal(title, type, value) {
    this.setData({
      showInputModal: true,
      modalTitle: title,
      inputType: type,
      inputValue: value
    });
    
    // 延迟一下确保DOM渲染完成后再设置焦点
    setTimeout(() => {
      if (type !== 'reminderTime') {
        // 对于非时间选择器的输入框，确保焦点设置
        this.setData({
          [`focus_${type}`]: true
        });
      }
    }, 100);
  },

  // 关闭输入模态框
  closeInputModal() {
    this.setData({
      showInputModal: false,
      modalTitle: '',
      inputType: '',
      inputValue: '',
      focus_nickname: false,
      focus_cycleLength: false,
      focus_lutealPhase: false
    });
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    // 阻止事件冒泡，防止点击输入框时关闭模态框
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  },

  // 输入框获取焦点
  focusInput(e) {
    // 阻止事件冒泡
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  },

  // 输入值变化
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 时间选择变化
  onTimeChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 保存输入
  async saveInput() {
    const { inputType, inputValue } = this.data;
    
    if (!inputValue.trim()) {
      wx.showToast({
        title: '请输入有效值',
        icon: 'none'
      });
      return;
    }
    
    try {
      let newSettings = { ...this.data.userSettings };
      
      switch(inputType) {
        case 'nickname':
          newSettings.nickname = inputValue;
          break;
        case 'cycleLength':
          const cycleLength = parseInt(inputValue);
          if (cycleLength < 20 || cycleLength > 40) {
            wx.showToast({
              title: '周期长度应在20-40天之间',
              icon: 'none'
            });
            return;
          }
          newSettings.personalInfo.averageCycleLength = cycleLength;
          break;
        case 'lutealPhase':
          const lutealPhase = parseInt(inputValue);
          if (lutealPhase < 10 || lutealPhase > 16) {
            wx.showToast({
              title: '黄体期长度应在10-16天之间',
              icon: 'none'
            });
            return;
          }
          newSettings.personalInfo.averageLutealPhase = lutealPhase;
          break;
        case 'reminderTime':
          newSettings.reminders.morningTemperature.time = inputValue;
          break;
      }
      
      // 保存设置
      await FertilityStorage.saveUserSettings(newSettings);
      
      this.setData({ userSettings: newSettings });
      this.closeInputModal();
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('保存设置失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 切换晨起测温提醒
  async toggleMorningReminder() {
    const newSettings = { ...this.data.userSettings };
    newSettings.reminders.morningTemperature.enabled = !newSettings.reminders.morningTemperature.enabled;
    
    await this.saveSettings(newSettings);
    
    wx.showToast({
      title: newSettings.reminders.morningTemperature.enabled ? '已开启' : '已关闭',
      icon: 'success'
    });
  },

  // 切换易孕期提醒
  async toggleFertileReminder() {
    const newSettings = { ...this.data.userSettings };
    newSettings.reminders.fertileWindow.enabled = !newSettings.reminders.fertileWindow.enabled;
    
    await this.saveSettings(newSettings);
    
    wx.showToast({
      title: newSettings.reminders.fertileWindow.enabled ? '已开启' : '已关闭',
      icon: 'success'
    });
  },

  // 切换排卵日提醒
  async toggleOvulationReminder() {
    const newSettings = { ...this.data.userSettings };
    newSettings.reminders.periodPrediction.enabled = !newSettings.reminders.periodPrediction.enabled;
    
    await this.saveSettings(newSettings);
    
    wx.showToast({
      title: newSettings.reminders.periodPrediction.enabled ? '已开启' : '已关闭',
      icon: 'success'
    });
  },

  // 保存设置
  async saveSettings(newSettings) {
    try {
      await FertilityStorage.saveUserSettings(newSettings);
      this.setData({ userSettings: newSettings });
    } catch (error) {
      console.error('保存设置失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 导出数据
  async exportData() {
    wx.showLoading({ title: '正在准备导出...' });
    
    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const cycles = await FertilityStorage.getCycles();
      const userSettings = await FertilityStorage.getUserSettings();
      
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        userSettings,
        dayRecords,
        cycles,
        statistics: this.data.statistics
      };
      
      // 将数据转为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // 保存到微信文件系统
      const fs = wx.getFileSystemManager();
      const fileName = `fertility-backup-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath,
        data: jsonString,
        encoding: 'utf8',
        success: () => {
          wx.hideLoading();
          wx.showModal({
            title: '导出成功',
            content: `数据已导出到 ${fileName}，您可以通过微信文件管理器查看。`,
            showCancel: false
          });
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('导出数据失败:', error);
          wx.showToast({
            title: '导出失败',
            icon: 'error'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('导出数据失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'error'
      });
    }
  },

  // 导入数据
  importData() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const filePath = res.tempFiles[0].path;
        this.processImportFile(filePath);
      },
      fail: () => {
        wx.showToast({
          title: '取消选择文件',
          icon: 'none'
        });
      }
    });
  },

  // 处理导入文件
  async processImportFile(filePath) {
    wx.showLoading({ title: '正在导入数据...' });
    
    try {
      const fs = wx.getFileSystemManager();
      const data = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(data);
      
      // 验证数据格式
      if (!importData.version || !importData.dayRecords) {
        throw new Error('无效的备份文件格式');
      }
      
      // 保存导入的数据
      if (importData.userSettings) {
        await FertilityStorage.saveUserSettings(importData.userSettings);
      }
      if (importData.dayRecords) {
        await FertilityStorage.saveDayRecords(importData.dayRecords);
      }
      if (importData.cycles) {
        await FertilityStorage.saveCycles(importData.cycles);
      }
      
      wx.hideLoading();
      
      // 重新加载数据
      await this.loadUserSettings();
      await this.loadStatistics();
      
      wx.showModal({
        title: '导入成功',
        content: '数据已成功导入，页面已更新。',
        showCancel: false
      });
    } catch (error) {
      wx.hideLoading();
      console.error('导入数据失败:', error);
      wx.showToast({
        title: '导入失败',
        icon: 'error'
      });
    }
  },

  // 生成报告
  generateReport() {
    wx.showLoading({ title: '正在生成报告...' });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showModal({
        title: '功能开发中',
        content: '报告生成功能正在开发中，敬请期待。',
        showCancel: false
      });
    }, 1500);
  },

  // 检查更新
  checkUpdate() {
    wx.showLoading({ title: '正在检查更新...' });
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '当前已是最新版本',
        icon: 'success'
      });
    }, 1000);
  },

  // 显示帮助
  showHelp() {
    wx.showModal({
      title: '使用帮助',
      content: '帮助文档正在完善中，如有问题请联系客服。',
      showCancel: false
    });
  },

  // 显示隐私政策
  showPrivacy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们非常重视您的隐私保护，所有数据仅存储在您的设备本地，不会上传到任何服务器。',
      showCancel: false
    });
  },

  // 联系我们
  contactUs() {
    wx.showModal({
      title: '联系我们',
      content: '如有问题或建议，请通过小程序内的反馈功能联系我们。',
      showCancel: false
    });
  },

  // 清空所有数据
  clearAllData() {
    wx.showModal({
      title: '危险操作',
      content: '确定要清空所有数据吗？此操作无法撤销！',
      confirmColor: '#f5222d',
      success: (res) => {
        if (res.confirm) {
          this.performClearData();
        }
      }
    });
  },

  // 执行清空数据
  async performClearData() {
    wx.showLoading({ title: '正在清空数据...' });
    
    try {
      const { StorageManager } = require('../../utils/storage');
      await StorageManager.clear();
      
      wx.hideLoading();
      
      wx.showModal({
        title: '清空完成',
        content: '所有数据已清空，将返回首页。',
        showCancel: false,
        success: () => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('清空数据失败:', error);
      wx.showToast({
        title: '清空失败',
        icon: 'error'
      });
    }
  },

  // 选择头像
  selectAvatar() {
    this.setData({
      showAvatarModal: true
    });
  },

  // 关闭头像选择模态框
  closeAvatarModal() {
    this.setData({
      showAvatarModal: false
    });
  },

  // 选择微信头像（新版API）
  async onChooseAvatar(e) {
    try {
      wx.showLoading({ title: '获取微信头像...' });
      
      const { avatarUrl } = e.detail;
      
      if (avatarUrl) {
        // 保存图片到本地
        const savedFilePath = await this.saveImageToLocal(avatarUrl);
        await this.updateAvatar(savedFilePath);
        this.closeAvatarModal();
        
        wx.hideLoading();
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '获取微信头像失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('获取微信头像失败:', error);
      wx.showToast({
        title: '获取微信头像失败',
        icon: 'error'
      });
    }
  },

  // 选择头像（新版API）
  chooseAvatar() {
    return new Promise((resolve, reject) => {
      if (wx.chooseAvatar) {
        wx.chooseAvatar({
          success: (res) => {
            resolve(res);
          },
          fail: (error) => {
            reject(error);
          }
        });
      } else {
        reject(new Error('API不支持'));
      }
    });
  },

  // 获取用户信息
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '获取头像用于个人资料展示',
        success: (res) => {
          resolve(res.userInfo);
        },
        fail: (error) => {
          // 如果getUserProfile失败，尝试使用getUserInfo
          wx.getUserInfo({
            success: (res) => {
              resolve(res.userInfo);
            },
            fail: (err) => {
              console.log('获取用户信息失败:', err);
              reject(err);
            }
          });
        }
      });
    });
  },

  // 从相册选择
  async chooseFromAlbum() {
    try {
      const res = await this.chooseImage();
      
      if (res && res.tempFilePaths && res.tempFilePaths.length > 0) {
        const tempFilePath = res.tempFilePaths[0];
        
        // 保存图片到本地
        const savedFilePath = await this.saveImageToLocal(tempFilePath);
        
        await this.updateAvatar(savedFilePath);
        this.closeAvatarModal();
        
        wx.showToast({
          title: '头像更新成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('选择头像失败:', error);
      wx.showToast({
        title: '选择头像失败',
        icon: 'error'
      });
    }
  },

  // 选择图片
  chooseImage() {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'], // 使用压缩图
        sourceType: ['album'], // 只允许从相册选择
        success: (res) => {
          resolve(res);
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  },

  // 保存图片到本地
  saveImageToLocal(tempFilePath) {
    return new Promise((resolve, reject) => {
      // 如果是网络图片，先下载
      if (tempFilePath.startsWith('http://') || tempFilePath.startsWith('https://')) {
        wx.downloadFile({
          url: tempFilePath,
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              this.copyImageToLocal(downloadRes.tempFilePath, resolve, reject);
            } else {
              reject(new Error('下载图片失败'));
            }
          },
          fail: (error) => {
            reject(error);
          }
        });
      } else {
        // 本地临时文件，直接复制
        this.copyImageToLocal(tempFilePath, resolve, reject);
      }
    });
  },

  // 复制图片到本地存储
  copyImageToLocal(srcPath, resolve, reject) {
    const fs = wx.getFileSystemManager();
    const fileName = `avatar_${Date.now()}.jpg`;
    const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    
    fs.copyFile({
      srcPath: srcPath,
      destPath: savedPath,
      success: () => {
        resolve(savedPath);
      },
      fail: (error) => {
        reject(error);
      }
    });
  },

  // 更新头像
  async updateAvatar(avatarUrl) {
    try {
      const newSettings = { ...this.data.userSettings };
      newSettings.avatar = avatarUrl;
      
      await FertilityStorage.saveUserSettings(newSettings);
      this.setData({ userSettings: newSettings });
    } catch (error) {
      console.error('保存头像失败:', error);
      throw error;
    }
  },

  // 移除头像
  async removeAvatar() {
    try {
      const newSettings = { ...this.data.userSettings };
      newSettings.avatar = '';
      
      await FertilityStorage.saveUserSettings(newSettings);
      this.setData({ userSettings: newSettings });
      this.closeAvatarModal();
      
      wx.showToast({
        title: '头像已移除',
        icon: 'success'
      });
    } catch (error) {
      console.error('移除头像失败:', error);
      wx.showToast({
        title: '移除头像失败',
        icon: 'error'
      });
    }
  }
});