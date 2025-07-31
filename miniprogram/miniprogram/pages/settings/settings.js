// pages/settings/settings.js
const { DataManager } = require('../../utils/dataManager');
const { FertilityStorage } = require('../../utils/storage');
const { ReminderManager } = require('../../utils/reminderManager');

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
    await this.initReminderManager();
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

  // 初始化提醒管理器
  async initReminderManager() {
    try {
      const reminderManager = ReminderManager.getInstance();
      await reminderManager.init();
      console.log('提醒管理器初始化完成');
    } catch (error) {
      console.error('初始化提醒管理器失败:', error);
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
      
      // 如果修改的是提醒时间，更新提醒管理器
      if (inputType === 'reminderTime') {
        const reminderManager = ReminderManager.getInstance();
        await reminderManager.updateReminders(newSettings.reminders);
      }
      
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
    
    // 更新提醒管理器
    const reminderManager = ReminderManager.getInstance();
    await reminderManager.updateReminders(newSettings.reminders);
    
    wx.showToast({
      title: newSettings.reminders.morningTemperature.enabled ? '晨起测温提醒已开启' : '晨起测温提醒已关闭',
      icon: 'success'
    });
  },

  // 切换易孕期提醒
  async toggleFertileReminder() {
    const newSettings = { ...this.data.userSettings };
    newSettings.reminders.fertileWindow.enabled = !newSettings.reminders.fertileWindow.enabled;
    
    await this.saveSettings(newSettings);
    
    // 更新提醒管理器
    const reminderManager = ReminderManager.getInstance();
    await reminderManager.updateReminders(newSettings.reminders);
    
    wx.showToast({
      title: newSettings.reminders.fertileWindow.enabled ? '易孕期提醒已开启' : '易孕期提醒已关闭',
      icon: 'success'
    });
  },

  // 切换排卵日提醒
  async toggleOvulationReminder() {
    const newSettings = { ...this.data.userSettings };
    newSettings.reminders.periodPrediction.enabled = !newSettings.reminders.periodPrediction.enabled;
    
    await this.saveSettings(newSettings);
    
    // 更新提醒管理器
    const reminderManager = ReminderManager.getInstance();
    await reminderManager.updateReminders(newSettings.reminders);
    
    wx.showToast({
      title: newSettings.reminders.periodPrediction.enabled ? '排卵日提醒已开启' : '排卵日提醒已关闭',
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
        appName: '备小孕',
        userSettings: {
          ...userSettings,
          // 移除敏感信息
          avatar: userSettings.avatar ? '已设置' : '未设置'
        },
        dayRecords,
        cycles,
        statistics: this.data.statistics
      };
      
      // 将数据转为JSON字符串
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // 保存到微信临时文件系统
      const fs = wx.getFileSystemManager();
      const fileName = `备小孕数据备份-${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath,
        data: jsonString,
        encoding: 'utf8',
        success: () => {
          wx.hideLoading();
          
          // 显示导出选项
          wx.showModal({
            title: '导出成功',
            content: '数据已导出完成，您希望如何处理？',
            confirmText: '分享给好友',
            cancelText: '仅保存本地',
            success: (res) => {
              if (res.confirm) {
                // 用户选择分享给好友
                this.shareExportedFile(filePath, fileName);
              } else {
                // 用户选择仅保存本地
                wx.showToast({
                  title: '文件已保存到本地',
                  icon: 'success'
                });
              }
            }
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

  // 分享导出的文件
  shareExportedFile(filePath, fileName) {
    try {
      // 使用微信的文件分享功能
      wx.shareFileMessage({
        filePath: filePath,
        fileName: fileName,
        success: () => {
          wx.showToast({
            title: '分享成功',
            icon: 'success'
          });
        },
        fail: (error) => {
          console.error('分享文件失败:', error);
          
          // 如果分享失败，提供备选方案
          wx.showModal({
            title: '分享失败',
            content: '无法直接分享文件，您可以通过以下方式分享数据：\n1. 复制数据内容\n2. 保存到相册后分享截图',
            confirmText: '复制数据',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this.copyDataToClipboard(filePath);
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('分享文件异常:', error);
      
      // 提供备选的分享方案
      wx.showModal({
        title: '分享方式',
        content: '请选择分享方式：',
        confirmText: '复制数据',
        cancelText: '生成二维码',
        success: (res) => {
          if (res.confirm) {
            this.copyDataToClipboard(filePath);
          } else {
            this.generateQRCode(filePath);
          }
        }
      });
    }
  },

  // 复制数据到剪贴板
  copyDataToClipboard(filePath) {
    try {
      const fs = wx.getFileSystemManager();
      const data = fs.readFileSync(filePath, 'utf8');
      
      wx.setClipboardData({
        data: data,
        success: () => {
          wx.showToast({
            title: '数据已复制到剪贴板',
            icon: 'success',
            duration: 2000
          });
          
          setTimeout(() => {
            wx.showModal({
              title: '使用提示',
              content: '数据已复制到剪贴板，您可以粘贴到微信聊天中发送给好友，或保存到备忘录中。',
              showCancel: false
            });
          }, 2000);
        },
        fail: (error) => {
          console.error('复制到剪贴板失败:', error);
          wx.showToast({
            title: '复制失败',
            icon: 'error'
          });
        }
      });
    } catch (error) {
      console.error('读取文件失败:', error);
      wx.showToast({
        title: '读取文件失败',
        icon: 'error'
      });
    }
  },

  // 生成二维码分享（备选方案）
  generateQRCode(filePath) {
    try {
      // 这里可以实现生成包含数据的二维码
      // 由于数据量可能较大，这里提供一个简化的实现
      wx.showModal({
        title: '二维码分享',
        content: '二维码分享功能正在开发中。建议使用复制数据的方式进行分享。',
        confirmText: '复制数据',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.copyDataToClipboard(filePath);
          }
        }
      });
    } catch (error) {
      console.error('生成二维码失败:', error);
      wx.showToast({
        title: '生成二维码失败',
        icon: 'error'
      });
    }
  },

  // 导入数据
  importData() {
    wx.showActionSheet({
      itemList: ['从聊天记录选择文件', '从剪贴板导入', '扫描二维码导入'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.importFromFile();
            break;
          case 1:
            this.importFromClipboard();
            break;
          case 2:
            this.importFromQRCode();
            break;
        }
      }
    });
  },

  // 从文件导入
  importFromFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          const filePath = res.tempFiles[0].path;
          const fileName = res.tempFiles[0].name;
          this.processImportFile(filePath, fileName);
        } else {
          wx.showToast({
            title: '未选择有效文件',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        console.log('选择文件失败:', error);
        wx.showToast({
          title: '取消选择文件',
          icon: 'none'
        });
      }
    });
  },

  // 从剪贴板导入
  async importFromClipboard() {
    try {
      wx.showLoading({ title: '读取剪贴板...' });
      
      wx.getClipboardData({
        success: (res) => {
          wx.hideLoading();
          const clipboardData = res.data;
          
          if (!clipboardData || !clipboardData.trim()) {
            wx.showModal({
              title: '剪贴板为空',
              content: '剪贴板中没有数据。请先复制备小孕的备份数据到剪贴板。' +
                       '\n\n备份数据应该是JSON格式，以"{"开头，以"}"结尾。',
              showCancel: false
            });
            return;
          }
          
          // 简单检查数据格式
          const trimmedData = clipboardData.trim();
          if (!trimmedData.startsWith('{') || !trimmedData.endsWith('}')) {
            wx.showModal({
              title: '数据格式提示',
              content: '剪贴板中的数据格式可能不正确。\n\n备小孕的备份数据应该是JSON格式，以"{"开头，以"}"结尾。\n\n是否仍要尝试导入？',
              confirmText: '尝试导入',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.processImportData(clipboardData, '剪贴板');
                }
              }
            });
            return;
          }
          
          // 检查是否包含备小孕的关键字段
          if (!trimmedData.includes('"appName"') || !trimmedData.includes('备小孕')) {
            wx.showModal({
              title: '数据来源提示',
              content: '剪贴板中的数据可能不是备小孕的备份数据。\n\n是否仍要尝试导入？',
              confirmText: '尝试导入',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.processImportData(clipboardData, '剪贴板');
                }
              }
            });
            return;
          }
          
          this.processImportData(clipboardData, '剪贴板');
        },
        fail: (error) => {
          wx.hideLoading();
          console.error('读取剪贴板失败:', error);
          wx.showModal({
            title: '读取剪贴板失败',
            content: '无法读取剪贴板内容，请检查小程序权限设置。',
            showCancel: false
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('从剪贴板导入失败:', error);
      wx.showModal({
        title: '导入失败',
        content: '从剪贴板导入数据时发生错误，请重试。',
        showCancel: false
      });
    }
  },

  // 从二维码导入（预留功能）
  importFromQRCode() {
    wx.showModal({
      title: '扫描二维码导入',
      content: '二维码导入功能正在开发中，敬请期待。',
      showCancel: false
    });
  },

  // 处理导入文件
  async processImportFile(filePath, fileName) {
    wx.showLoading({ title: '正在读取文件...' });
    
    try {
      const fs = wx.getFileSystemManager();
      const data = fs.readFileSync(filePath, 'utf8');
      
      wx.hideLoading();
      this.processImportData(data, fileName);
      
    } catch (error) {
      wx.hideLoading();
      console.error('读取文件失败:', error);
      wx.showToast({
        title: '文件读取失败',
        icon: 'error'
      });
    }
  },

  // 处理导入数据
  async processImportData(dataString, sourceName) {
    try {
      // 预处理数据字符串
      const cleanedData = this.preprocessImportData(dataString);
      
      if (!cleanedData) {
        this.showImportFormatError(sourceName);
        return;
      }
      
      // 解析JSON数据
      const importData = JSON.parse(cleanedData);
      
      // 验证数据格式
      const validationResult = this.validateImportData(importData);
      if (!validationResult.isValid) {
        wx.showModal({
          title: '数据格式错误',
          content: `导入失败：${validationResult.error}`,
          showCancel: false
        });
        return;
      }
      
      // 显示导入预览
      this.showImportPreview(importData, sourceName);
      
    } catch (error) {
      console.error('解析导入数据失败:', error);
      this.showImportFormatError(sourceName, error.message);
    }
  },

  // 预处理导入数据
  preprocessImportData(dataString) {
    try {
      if (!dataString || typeof dataString !== 'string') {
        return null;
      }
      
      // 去除首尾空白字符
      let cleaned = dataString.trim();
      
      // 检查是否为空
      if (!cleaned) {
        return null;
      }
      
      // 检查是否以JSON格式开始和结束
      if (!cleaned.startsWith('{') || !cleaned.endsWith('}')) {
        return null;
      }
      
      // 移除可能的BOM字符
      if (cleaned.charCodeAt(0) === 0xFEFF) {
        cleaned = cleaned.slice(1);
      }
      
      return cleaned;
      
    } catch (error) {
      console.error('预处理数据失败:', error);
      return null;
    }
  },

  // 显示导入格式错误信息
  showImportFormatError(sourceName, errorDetail = '') {
    const exampleData = {
      "version": "1.0.0",
      "exportDate": "2024-01-01T12:00:00.000Z",
      "appName": "备小孕",
      "userSettings": {
        "nickname": "小明",
        "personalInfo": {
          "averageCycleLength": 28,
          "averageLutealPhase": 14
        }
      },
      "dayRecords": {
        "2024-01-01": {
          "temperature": 36.5,
          "menstruation": "light"
        }
      },
      "cycles": [],
      "statistics": {
        "totalRecords": 1,
        "completeCycles": 0
      }
    };
    
    const exampleJson = JSON.stringify(exampleData, null, 2);
    
    wx.showModal({
      title: '数据格式错误',
      content: `从${sourceName}导入失败，数据格式不正确。\n\n请确保数据是有效的JSON格式，且包含备小孕的备份数据。`,
      confirmText: '查看示例',
      cancelText: '知道了',
      success: (res) => {
        if (res.confirm) {
          // 显示正确的数据格式示例
          wx.showModal({
            title: '正确的数据格式示例',
            content: '正确的备份数据应该是JSON格式，包含version、appName、userSettings等字段。',
            confirmText: '复制示例',
            cancelText: '关闭',
            success: (res2) => {
              if (res2.confirm) {
                // 将示例数据复制到剪贴板
                wx.setClipboardData({
                  data: exampleJson,
                  success: () => {
                    wx.showToast({
                      title: '示例已复制到剪贴板',
                      icon: 'success'
                    });
                  },
                  fail: () => {
                    wx.showToast({
                      title: '复制失败',
                      icon: 'error'
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  },

  // 验证导入数据格式
  validateImportData(data) {
    try {
      // 检查基本结构
      if (!data || typeof data !== 'object') {
        return { isValid: false, error: '数据格式无效' };
      }
      
      // 检查版本信息
      if (!data.version) {
        return { isValid: false, error: '缺少版本信息' };
      }
      
      // 检查应用名称
      if (!data.appName || data.appName !== '备小孕') {
        return { isValid: false, error: '不是备小孕的备份文件' };
      }
      
      // 检查必要的数据字段
      if (!data.dayRecords && !data.userSettings && !data.cycles) {
        return { isValid: false, error: '备份文件中没有有效数据' };
      }
      
      // 检查数据类型
      if (data.dayRecords && typeof data.dayRecords !== 'object') {
        return { isValid: false, error: '日记录数据格式错误' };
      }
      
      if (data.cycles && !Array.isArray(data.cycles)) {
        return { isValid: false, error: '周期数据格式错误' };
      }
      
      if (data.userSettings && typeof data.userSettings !== 'object') {
        return { isValid: false, error: '用户设置数据格式错误' };
      }
      
      return { isValid: true };
      
    } catch (error) {
      return { isValid: false, error: '数据验证失败' };
    }
  },

  // 显示导入预览
  showImportPreview(importData, sourceName) {
    const dayRecordsCount = importData.dayRecords ? Object.keys(importData.dayRecords).length : 0;
    const cyclesCount = importData.cycles ? importData.cycles.length : 0;
    const hasUserSettings = !!importData.userSettings;
    const exportDate = importData.exportDate ? new Date(importData.exportDate).toLocaleDateString() : '未知';
    
    let previewContent = `数据来源：${sourceName}\n`;
    previewContent += `导出时间：${exportDate}\n`;
    previewContent += `版本：${importData.version}\n\n`;
    previewContent += `包含数据：\n`;
    previewContent += `• 日记录：${dayRecordsCount} 条\n`;
    previewContent += `• 周期数据：${cyclesCount} 个\n`;
    previewContent += `• 用户设置：${hasUserSettings ? '是' : '否'}\n\n`;
    previewContent += `导入后将覆盖当前所有数据，是否继续？`;
    
    wx.showModal({
      title: '确认导入数据',
      content: previewContent,
      confirmText: '确认导入',
      cancelText: '取消',
      confirmColor: '#007aff',
      success: (res) => {
        if (res.confirm) {
          this.performImport(importData);
        }
      }
    });
  },

  // 执行导入操作
  async performImport(importData) {
    wx.showLoading({ title: '正在导入数据...' });
    
    try {
      let importedItems = [];
      
      // 导入用户设置
      if (importData.userSettings) {
        // 恢复头像路径（如果之前被移除了）
        const currentSettings = await FertilityStorage.getUserSettings();
        const settingsToImport = { ...importData.userSettings };
        
        // 如果导入的设置中头像是占位符，保留当前头像
        if (settingsToImport.avatar === '已设置' || settingsToImport.avatar === '未设置') {
          settingsToImport.avatar = currentSettings?.avatar || '';
        }
        
        await FertilityStorage.saveUserSettings(settingsToImport);
        importedItems.push('用户设置');
      }
      
      // 导入日记录
      if (importData.dayRecords) {
        await FertilityStorage.saveDayRecords(importData.dayRecords);
        importedItems.push(`${Object.keys(importData.dayRecords).length} 条日记录`);
      }
      
      // 导入周期数据
      if (importData.cycles) {
        await FertilityStorage.saveCycles(importData.cycles);
        importedItems.push(`${importData.cycles.length} 个周期`);
      }
      
      wx.hideLoading();
      
      // 重新加载数据
      await this.loadUserSettings();
      await this.loadStatistics();
      
      // 重新初始化提醒管理器
      await this.initReminderManager();
      
      // 显示导入成功信息
      const successMessage = `导入成功！\n\n已导入：\n${importedItems.map(item => `• ${item}`).join('\n')}\n\n页面数据已更新。`;
      
      wx.showModal({
        title: '导入完成',
        content: successMessage,
        showCancel: false,
        confirmText: '知道了'
      });
      
    } catch (error) {
      wx.hideLoading();
      console.error('导入数据失败:', error);
      
      wx.showModal({
        title: '导入失败',
        content: `导入过程中发生错误：${error.message || '未知错误'}`,
        showCancel: false
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
    wx.navigateTo({
      url: '/pages/help/help'
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

  // 测试提醒功能
  async testReminder() {
    try {
      const reminderManager = ReminderManager.getInstance();
      
      // 显示当前活跃的提醒
      const activeReminders = reminderManager.getActiveReminders();
      
      if (activeReminders.length === 0) {
        wx.showModal({
          title: '提醒测试',
          content: '当前没有活跃的提醒。请先开启提醒功能。',
          showCancel: false
        });
        return;
      }
      
      let reminderInfo = '当前活跃的提醒：\n';
      activeReminders.forEach((reminder, index) => {
        reminderInfo += `${index + 1}. ${reminder.title}\n`;
        reminderInfo += `   时间: ${reminder.trigger.toLocaleString()}\n`;
        reminderInfo += `   重复: ${reminder.repeat === 'day' ? '每天' : '不重复'}\n`;
        reminderInfo += `   今日状态: ${reminder.shownToday ? '已显示' : '未显示'}\n\n`;
      });
      
      wx.showActionSheet({
        itemList: ['查看提醒状态', '测试通知', '重置今日记录'],
        success: async (res) => {
          switch (res.tapIndex) {
            case 0:
              // 查看提醒状态
              wx.showModal({
                title: '提醒状态',
                content: reminderInfo,
                showCancel: false
              });
              break;
            case 1:
              // 测试通知
              await reminderManager.showNotification('测试提醒', '这是一个测试提醒，提醒功能正常工作！', 'test_reminder');
              break;
            case 2:
              // 重置今日记录
              await reminderManager.resetTodayReminders();
              wx.showToast({
                title: '今日提醒记录已重置',
                icon: 'success'
              });
              break;
          }
        }
      });
      
    } catch (error) {
      console.error('测试提醒失败:', error);
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      });
    }
  },

  // 清空所有数据
  clearAllData() {
    wx.showModal({
      title: '⚠️ 危险操作警告',
      content: '您即将清空所有数据，包括：' +
               '\n• 所有体温记录' +
               '\n• 月经记录' +
               '\n• 同房记录' +
               '\n• 周期数据' +
               '\n• 个人设置' +
               '\n• 统计信息' +
               '\n\n此操作无法撤销！确定要继续吗？',
      confirmText: '我要清空',
      cancelText: '取消',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 第二次确认
          this.showSecondConfirmation();
        }
      }
    });
  },

  // 显示第二次确认
  showSecondConfirmation() {
    wx.showModal({
      title: '🚨 最后确认',
      content: '请再次确认：您真的要清空所有数据吗？' +
               '\n\n清空后将无法恢复，建议您先导出数据进行备份。' +
               '\n\n如果确定要清空，请点击"确认清空"。',
      confirmText: '确认清空',
      cancelText: '我再想想',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          this.performClearData();
        } else {
          wx.showToast({
            title: '已取消清空操作',
            icon: 'success'
          });
        }
      }
    });
  },

  // 执行清空数据
  async performClearData() {
    wx.showLoading({ title: '正在清空所有数据...' });
    
    try {
      // 清空所有存储的数据
      await this.clearAllStorageData();
      
      wx.hideLoading();
      
      wx.showModal({
        title: '✅ 清空完成',
        content: '所有数据已成功清空！' +
                 '\n\n应用将重新启动，您可以重新开始记录数据。',
        showCancel: false,
        confirmText: '重新开始',
        success: () => {
          // 重新启动应用到首页
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('清空数据失败:', error);
      console.error('清空数据失败:', error);
      
      wx.showModal({
        title: '清空失败',
        content: `清空数据时发生错误：${error.message || '未知错误'}` +
                 '\n\n请重试或联系客服。',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 清空所有存储数据
  async clearAllStorageData() {
    try {
      // 获取所有存储键
      const storageKeys = [
        'fertility_user_settings',
        'fertility_day_records', 
        'fertility_cycles',
        'fertility_statistics',
        'fertility_app_version',
        'fertility_backup_data',
        'fertility_last_sync',
        'fertility_reminder_shown_today' // 提醒记录
      ];
      
      // 逐个清空存储项
      const clearPromises = storageKeys.map(key => {
        return new Promise((resolve) => {
          wx.removeStorage({
            key: key,
            success: () => {
              console.log(`已清空存储项: ${key}`);
              resolve();
            },
            fail: (error) => {
              console.warn(`清空存储项失败: ${key}`, error);
              resolve(); // 即使失败也继续
            }
          });
        });
      });
      
      // 等待所有清空操作完成
      await Promise.all(clearPromises);
      
      // 清空文件系统中的用户数据（如头像等）
      await this.clearUserFiles();
      
      console.log('所有数据清空完成');
      
    } catch (error) {
      console.error('清空存储数据失败:', error);
      throw new Error('清空数据失败，请重试');
    }
  },

  // 清空用户文件
  async clearUserFiles() {
    try {
      const fs = wx.getFileSystemManager();
      
      // 获取用户数据目录下的所有文件
      const userDataPath = wx.env.USER_DATA_PATH;
      
      fs.readdir({
        dirPath: userDataPath,
        success: (res) => {
          // 删除所有用户文件
          res.files.forEach(fileName => {
            const filePath = `${userDataPath}/${fileName}`;
            fs.unlink({
              filePath: filePath,
              success: () => {
                console.log(`已删除文件: ${fileName}`);
              },
              fail: (error) => {
                console.warn(`删除文件失败: ${fileName}`, error);
              }
            });
          });
        },
        fail: (error) => {
          console.warn('读取用户数据目录失败:', error);
        }
      });
    } catch (error) {
      console.warn('清空用户文件失败:', error);
      // 不抛出错误，因为这不是关键操作
    }
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

  // 头像组件事件处理
  /**
   * 头像点击事件
   */
  onAvatarTap(e) {
    console.log('头像被点击:', e.detail);
  },

  /**
   * 头像图片选择事件
   */
  async onImageSelected(e) {
    const { tempFilePath } = e.detail;
    console.log('选择了新头像:', tempFilePath);
    
    try {
      wx.showLoading({ title: '处理头像中...' });
      
      // 保存图片到本地
      const savedFilePath = await this.saveImageToLocal(tempFilePath);
      await this.updateAvatar(savedFilePath);
      
      wx.hideLoading();
      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      console.error('保存头像失败:', error);
      wx.showToast({
        title: '头像更新失败',
        icon: 'none'
      });
    }
  },

  /**
   * 头像加载成功事件
   */
  onAvatarLoad(e) {
    console.log('头像加载成功:', e.detail);
  },

  /**
   * 头像加载失败事件
   */
  onAvatarError(e) {
    console.error('头像加载失败:', e.detail);
    wx.showToast({
      title: '头像加载失败',
      icon: 'none'
    });
  },

});