// pages/settings/settings.js
const { DataManager } = require('../../utils/dataManager');
const { FertilityStorage } = require('../../utils/storage');
const { ReminderManager } = require('../../utils/reminderManager');
const reportGenerator = require('../../utils/reportGenerator');
const { DateUtils } = require('../../utils/date');

Page({
  data: {
    userSettings: {
      nickname: '',
      avatar: '',
      personalInfo: {
        averageCycleLength: 28,
        averageLutealPhase: 14
      },
      reminders: {
        morningTemperature: {
          enabled: true,
          time: '08:00'
        },
        fertileWindow: {
          enabled: true,
          time: '09:00'
        },
        periodPrediction: {
          enabled: true,
          time: '10:00'
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
    focus_lutealPhase: false,
    // 数据说明弹窗
    showDataExplanationModal: false,
    explanationTitle: '',
    explanationContent: '',
    explanationTips: '',
    // 调试模式相关
    debugMode: false,
    debugClickCount: 0
  },

  async onLoad() {
    await this.loadUserSettings();
    await this.loadStatistics();
    await this.initReminderManager();
    await this.checkDebugMode();
  },

  async onShow() {
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
      const dayRecords = await FertilityStorage.getDayRecords();
      const cycles = await FertilityStorage.getCycles();
      const firstOpenDate = await FertilityStorage.getOrInitFirstOpenDate();
      const statistics = this.calculateStatistics(dayRecords, cycles, firstOpenDate);
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
  calculateStatistics(dayRecords, cycles, firstOpenDate) {
    const records = Object.keys(dayRecords);
    let temperatureCount = 0;
    let intercourseCount = 0;
    
    records.forEach(date => {
      const record = dayRecords[date];
      if (record.temperature) temperatureCount++;
      if (record.intercourse && record.intercourse.length > 0) {
        intercourseCount += record.intercourse.length;
      }
    });
    
    const firstRecord = records.sort()[0];
    const todayStr = DateUtils.getToday();
    // 已使用天数：以首次打开日期为准；若不存在则回退到“最早记录/今天”
    const startDateStr = firstOpenDate || firstRecord || todayStr;
    const daysUsed = DateUtils.getDaysDifference(startDateStr, todayStr) + 1;
    
    return {
      daysUsed,
      totalRecords: records.length,
      completeCycles: Array.isArray(cycles) ? cycles.length : 0,
      temperatureRecords: temperatureCount,
      intercourseRecords: intercourseCount
    };
  },

  // 编辑昵称
  editNickname() {
    this.showInputModal('编辑昵称', 'nickname', this.data.userSettings.nickname || '小龙');
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

  // 显示输入模态框
  showInputModal(title, type, value) {
    this.setData({
      showInputModal: true,
      modalTitle: title,
      inputType: type,
      inputValue: value || ''
    });
    
    setTimeout(() => {
      if (type !== 'reminderTime') {
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
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
  },

  // 输入框获取焦点
  focusInput(e) {
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
          // 级联校验：若黄体期过大，建议调整平均周期长度，确保卵泡期至少12天
          const minFollicular = 12;
          const currentCycleLen = parseInt(newSettings.personalInfo.averageCycleLength || 28);
          const requiredCycleLen = lutealPhase + minFollicular;
          if (currentCycleLen < requiredCycleLen) {
            const suggestLen = Math.min(40, requiredCycleLen);
            await new Promise(resolve => {
              wx.showModal({
                title: '建议调整平均周期长度',
                content: `当前平均周期长度为${currentCycleLen}天，小于“黄体期${lutealPhase}天 + 卵泡期至少${minFollicular}天”。\n建议将平均周期长度调整为${suggestLen}天，以获得更准确的排卵与易孕期预测。`,
                confirmText: '应用建议',
                cancelText: '稍后再说',
                success: (res) => {
                  if (res.confirm) {
                    newSettings.personalInfo.averageCycleLength = suggestLen;
                  }
                  resolve();
                }
              });
            });
          }
          break;
        case 'reminderTime':
          // 统一设置所有提醒的时间
          newSettings.reminders.morningTemperature.time = inputValue;
          newSettings.reminders.fertileWindow.time = inputValue;
          newSettings.reminders.periodPrediction.time = inputValue;
          break;
      }
      
      await FertilityStorage.saveUserSettings(newSettings);
      this.setData({ userSettings: newSettings });
      
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

    const reminderManager = ReminderManager.getInstance();
    await reminderManager.updateReminders(newSettings.reminders);

    wx.showToast({
      title: newSettings.reminders.periodPrediction.enabled ? '排卵日提醒已开启' : '排卵日提醒已关闭',
      icon: 'success'
    });
  },

  // 设置统一提醒时间
  setReminderTime() {
    // 显示时间选择模态框
    this.showInputModal(
      '设置提醒时间',
      'reminderTime',
      this.data.userSettings.reminders.morningTemperature.time || '08:00'
    );
  },

  // 显示数据说明
  showDataExplanation(e) {
    const dataType = e.currentTarget.dataset.type;
    const currentStats = this.data.statistics;

    const explanations = {
      totalRecords: {
        title: '记录天数',
        content: `您已连续记录 ${currentStats.totalRecords} 天的数据。

📊 统计范围
此数据包含以下任一类型记录的日期：
• 📝 体温记录
• 🩸 月经记录（经量、开始/结束标记）
• 💕 同房记录
• 📋 症状备注

🎯 数据价值
记录天数反映您的使用活跃度，连续记录有助于：
• 提高排卵预测准确性
• 识别个人生理规律
• 为医生提供完整参考数据`,
        tips: '专业建议：坚持每日记录，连续3个完整周期的数据可显著提升排卵预测的准确性至85%以上。'
      },
      completeCycles: {
        title: '周期数',
        content: `您已记录 ${currentStats.completeCycles} 个完整的月经周期。

🔄 周期统计规则
• 从月经第一天到下次月经前一天
• 必须标记"经期开始"才计入统计
• 当前进行中的周期不计入
• 正常周期长度：21-35天

📈 数据价值
完整周期数据可以帮助：
• 计算个人平均周期长度
• 分析周期规律性
• 预测下次月经时间
• 确定最佳受孕窗口`,
        tips: '科学提示：拥有3个以上完整周期数据，可准确计算个人平均周期长度，提高排卵日预测精度。'
      },
      temperatureRecords: {
        title: '体温记录',
        content: `您已记录 ${currentStats.temperatureRecords} 次基础体温。

🌡️ 科学原理
基础体温变化的生理机制：
• 排卵后孕激素分泌增加
• 体温上升0.3-0.5°C并持续
• 是判断排卵的"金标准"
• 需要连续测量形成曲线

📋 正确测量方法
确保数据准确性的要点：
• 每天同一时间（起床后立即）
• 测量3-5分钟
• 使用专用基础体温计
• 避免起床、说话、喝水`,
        tips: '医学建议：连续测量至少21天可形成有效的体温曲线，帮助准确识别排卵期和黄体期。'
      },
      intercourseRecords: {
        title: '同房记录',
        content: `您已记录 ${currentStats.intercourseRecords} 次同房数据。

💕 记录意义
同房记录的重要价值：
• 📊 分析受孕时机分布
• 🎯 优化备孕策略
• 📋 为医生提供参考
• 📈 跟踪备孕进度

🔒 隐私保护
我们承诺保护您的隐私：
• 数据仅存储在您的设备本地
• 不会上传到任何服务器
• 您可随时删除所有记录
• 完全掌控个人隐私数据`,
        tips: '备孕建议：排卵期前后每2天一次同房频率最佳，既能保证精子质量，又能最大化受孕机会。'
      }
    };

    const explanation = explanations[dataType];
    if (explanation) {
      this.setData({
        showDataExplanationModal: true,
        explanationTitle: `📊 ${explanation.title}说明`,
        explanationContent: explanation.content,
        explanationTips: explanation.tips
      });
    }
  },

  // 关闭数据说明弹窗
  closeDataExplanationModal() {
    this.setData({
      showDataExplanationModal: false,
      explanationTitle: '',
      explanationContent: '',
      explanationTips: ''
    });
  },

  // 显示个人资料统计说明
  showProfileDataExplanation(e) {
    const dataType = e.currentTarget.dataset.type;
    const currentStats = this.data.statistics;

    const explanations = {
      daysUsed: {
        title: '使用天数',
        content: `您已连续使用备小孕 ${currentStats.daysUsed} 天。

📅 计算方式
使用天数的统计规则：
• 从首次打开小程序的日期开始计算
• 到今天为止的总天数
• 不受数据记录频率影响
• 反映您的小程序使用时长

⏰ 时间价值
持续使用的重要意义：
• 建立规律记录的好习惯
• 积累更多有价值的健康数据
• 提高算法预测的准确性
• 形成长期的健康管理意识`,
        tips: '坚持记录：使用时间越长，积累的数据越多，排卵预测和健康分析越准确。建议至少坚持使用3个月经周期。'
      },
      totalRecords: {
        title: '记录次数',
        content: `您已成功记录 ${currentStats.totalRecords} 次数据。

📝 记录统计
记录次数包含以下数据：
• 📝 体温记录
• 🩸 月经记录（经量、开始/结束）
• 💕 同房记录
• 📋 症状和备注

📈 记录价值
每次记录都是珍贵的健康数据：
• 构建个人生理档案
• 为排卵预测提供依据
• 帮助识别异常情况
• 为医生诊断提供参考`,
        tips: '记录建议：理想的记录频率是每天至少1次，包含体温和任何相关症状。连续记录比偶尔记录更有价值。'
      },
      completeCycles: {
        title: '完整周期',
        content: `您已完成 ${currentStats.completeCycles} 个完整的月经周期记录。

🔄 周期价值
每个完整周期都极其珍贵：
• 提供周期长度的准确数据
• 帮助识别个人排卵规律
• 建立基础体温变化模式
• 为下次周期预测提供基础

📊 数据积累
完整周期数据的重要作用：
• 计算个人平均周期长度
• 分析排卵期规律性
• 预测易孕窗口时间
• 识别可能的健康问题`,
        tips: '周期建议：至少需要3个完整周期才能获得可靠的排卵预测。如果周期不规律，建议记录6个以上周期以获得更准确的分析。'
      }
    };

    const explanation = explanations[dataType];
    if (explanation) {
      this.setData({
        showDataExplanationModal: true,
        explanationTitle: `📊 ${explanation.title}说明`,
        explanationContent: explanation.content,
        explanationTips: explanation.tips
      });
    }
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

    const tryClipboardFallback = async (dataStr) => {
      try {
        await wx.setClipboardData({ data: dataStr });
        wx.showToast({ title: '已复制', icon: 'success' });
        setTimeout(() => {
          wx.showModal({ title: '已复制到剪贴板', content: '由于存储限制，导出文件未保存。您可直接粘贴到聊天/备忘录/邮箱。', showCancel: false });
        }, 300);
      } catch (_) {
        wx.showToast({ title: '导出失败', icon: 'error' });
      }
    };

    try {
      const dayRecords = await FertilityStorage.getDayRecords();
      const cycles = await FertilityStorage.getCycles();
      const userSettings = await FertilityStorage.getUserSettings();
      
      const exportData = {
        version: '1.1.0',
        exportDate: new Date().toISOString(),
        appName: '备小孕',
        userSettings: {
          ...userSettings,
          avatar: userSettings && userSettings.avatar ? '已设置' : '未设置'
        },
        dayRecords,
        cycles,
        statistics: this.data.statistics
      };
      
      const minified = JSON.stringify(exportData);
      // 简化导出：直接复制到剪贴板并提示
      await tryClipboardFallback(minified);
      return;

      const performFileSave = () => {
        // 写入超时兜底（部分 iOS 机型偶现回调未触发）
        const timeoutId = setTimeout(async () => {
          try { wx.hideLoading(); } catch (e) {}
          await tryClipboardFallback(minified);
        }, 6000);

        fs.writeFile({
          filePath,
          data: minified,
          encoding: 'utf8',
          success: () => {
            clearTimeout(timeoutId);
            wx.hideLoading();
            setTimeout(() => {
              wx.showModal({
                title: '导出成功',
                content: '数据已导出完成，您希望如何处理？',
                confirmText: '复制内容',
                cancelText: '仅保存本地',
                success: (res) => {
                  if (res.confirm) {
                    wx.setClipboardData({ data: minified, success: () => wx.showToast({ title: '已复制', icon: 'success' }) });
                  } else {
                    wx.showToast({ title: '文件已保存到本地', icon: 'success' });
                  }
                }
              });
            }, 100);
          },
          fail: async (error) => {
            clearTimeout(timeoutId);
            wx.hideLoading();
            const msg = error && error.errMsg ? String(error.errMsg) : '';
            if (/maximum size/i.test(msg) || /exceed/i.test(msg)) {
              await tryClipboardFallback(minified);
            } else {
              setTimeout(() => {
                wx.showModal({ title: '导出失败', content: msg || '导出失败，请重试', showCancel: false });
              }, 100);
            }
          },
          complete: () => {}
        });
      };

      // iOS 优先提供复制选项，避免个别机型文件回调异常
      const sys = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
      const isIOS = (sys && (sys.platform === 'ios' || (sys.system && /iOS/i.test(sys.system)))) || false;
      if (isIOS) {
        wx.hideLoading();
        setTimeout(() => {
          wx.showActionSheet({
            itemList: ['复制到剪贴板', '尝试保存文件'],
            success: async (res) => {
              if (res.tapIndex === 0) {
                await tryClipboardFallback(minified);
              } else if (res.tapIndex === 1) {
                wx.showLoading({ title: '正在保存...' });
                performFileSave();
              }
            },
            fail: async () => {
              await tryClipboardFallback(minified);
            }
          });
        }, 150);
        return;
      }

      // 非 iOS 直接走保存流程
      performFileSave();
    } catch (error) {
      wx.hideLoading();
      console.error('导出数据失败:', error);
      setTimeout(() => {
        wx.showModal({ title: '导出失败', content: error && error.message ? error.message : '导出失败，请重试', showCancel: false });
      }, 100);
    }
  },

  // 分享导出的文件
  shareExportedFile(filePath, fileName) {
    try {
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
      itemList: ['从聊天记录选择文件', '从剪贴板导入'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.importFromFile();
            break;
          case 1:
            this.importFromClipboard();
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
              content: '剪贴板中没有数据。请先复制备小孕的备份数据到剪贴板。',
              showCancel: false
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

  // 从二维码导入（已移除选项）

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
      const importData = JSON.parse(dataString);
      
      const validationResult = this.validateImportData(importData);
      if (!validationResult.isValid) {
        wx.showModal({
          title: '数据格式错误',
          content: `导入失败：${validationResult.error}`,
          showCancel: false
        });
        return;
      }
      
      this.showImportPreview(importData, sourceName);
      
    } catch (error) {
      console.error('解析导入数据失败:', error);
      wx.showModal({
        title: '数据格式错误',
        content: `从${sourceName}导入失败，数据格式不正确。`,
        showCancel: false
      });
    }
  },

  // 验证导入数据格式
  validateImportData(data) {
    try {
      if (!data || typeof data !== 'object') {
        return { isValid: false, error: '数据格式无效' };
      }
      
      if (!data.version) {
        return { isValid: false, error: '缺少版本信息' };
      }
      
      if (!data.appName || data.appName !== '备小孕') {
        return { isValid: false, error: '不是备小孕的备份文件' };
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
      
      if (importData.userSettings) {
        await FertilityStorage.saveUserSettings(importData.userSettings);
        importedItems.push('用户设置');
      }
      
      if (importData.dayRecords) {
        await FertilityStorage.saveDayRecords(importData.dayRecords);
        importedItems.push(`${Object.keys(importData.dayRecords).length} 条日记录`);
      }
      
      if (importData.cycles) {
        await FertilityStorage.saveCycles(importData.cycles);
        importedItems.push(`${importData.cycles.length} 个周期`);
      }
      
      wx.hideLoading();
      
      await this.loadUserSettings();
      await this.loadStatistics();
      
      const successMessage = `导入成功！\n\n已导入：\n${importedItems.map(item => `• ${item}`).join('\n')}`;
      
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
  async generateReport() {
    wx.showActionSheet({
      itemList: ['生成文本报告', '生成详细数据报告'],
      success: async (res) => {
        switch (res.tapIndex) {
          case 0:
            // 延迟执行，避免与 ActionSheet 关闭动画冲突导致 Loading/Modal 不显示
            setTimeout(() => { this.generateTextReport(); }, 200);
            break;
          case 1:
            setTimeout(() => { this.generateDetailedReport(); }, 200);
            break;
        }
      },
      fail: () => {
        // 用户取消不提示
      }
    });
  },

  // 生成文本报告
  async generateTextReport() {
    wx.showLoading({ title: '正在生成报告...' });
    try {
      // 数据可用性预检查（避免进入空白页）
      const dayRecords = await FertilityStorage.getDayRecords();
      const hasData = dayRecords && Object.keys(dayRecords).length > 0;
      if (!hasData) {
        wx.hideLoading();
        wx.showModal({ title: '提示', content: '暂无记录数据，请先添加一些记录后再生成报告', showCancel: false });
        return;
      }
      wx.hideLoading();
      wx.navigateTo({ url: '/subpackages/settings/pages/report/report?type=text' });
    } catch (error) {
      wx.hideLoading();
      console.error('生成报告失败:', error);
      wx.showModal({ title: '生成失败', content: error.message || '报告生成失败，请稍后重试', showCancel: false });
    }
  },

  // 生成详细数据报告
  async generateDetailedReport() {
    wx.showLoading({ title: '正在生成详细报告...' });
    try {
      // 数据可用性预检查
      const dayRecords = await FertilityStorage.getDayRecords();
      const hasData = dayRecords && Object.keys(dayRecords).length > 0;
      if (!hasData) {
        wx.hideLoading();
        wx.showModal({ title: '提示', content: '暂无记录数据，请先添加一些记录后再生成报告', showCancel: false });
        return;
      }
      wx.hideLoading();
      // 跳转到可视化报告页
      wx.navigateTo({ url: '/subpackages/settings/pages/report/report?type=visual' });
    } catch (error) {
      wx.hideLoading();
      console.error('生成详细报告失败:', error);
      wx.showToast({
        title: '生成失败',
        icon: 'error'
      });
    }
  },

  // 兼容性测试
  runCompatibilityTest() {
    wx.navigateTo({
      url: '/pages/compatibility-test/compatibility-test'
    });
  },

  // 代码审查
  runCodeReview() {
    wx.navigateTo({
      url: '/pages/code-review/code-review'
    });
  },

  // 检查更新（已移除入口）

  // 显示帮助
  showHelp() {
    // 跳转到子包的帮助页面，页面内样式天然左对齐
    wx.navigateTo({ url: '/subpackages/settings/pages/help/help' });
  },

  // 显示隐私政策
  showPrivacy() {
    // 跳转到子包隐私政策页面（左对齐富文本/段落样式）
    wx.navigateTo({ url: '/subpackages/settings/pages/help/help?view=privacy' });
  },

  // 联系我们
  contactUs() {
    // 跳转到左对齐的帮助页面（contact 视图）
    wx.navigateTo({ url: '/subpackages/settings/pages/help/help?view=contact' });
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
          this.performClearData();
        }
      }
    });
  },

  // 执行清空数据
  async performClearData() {
    wx.showLoading({ title: '正在清空所有数据...' });
    
    try {
      const storageKeys = [
        'fertility_user_settings',
        'fertility_day_records', 
        'fertility_cycles',
        'fertility_statistics',
        'fertility_app_version',
        'fertility_backup_data',
        'fertility_last_sync'
      ];
      
      for (const key of storageKeys) {
        try {
          await new Promise((resolve) => {
            wx.removeStorage({
              key: key,
              success: () => resolve(),
              fail: () => resolve()
            });
          });
        } catch (error) {
          console.warn(`清空存储项失败: ${key}`, error);
        }
      }
      
      wx.hideLoading();
      
      wx.showModal({
        title: '✅ 清空完成',
        content: '所有数据已成功清空！应用将重新启动。',
        showCancel: false,
        confirmText: '重新开始',
        success: () => {
          wx.reLaunch({
            url: '/pages/index/index'
          });
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('清空数据失败:', error);
      
      wx.showModal({
        title: '清空失败',
        content: `清空数据时发生错误：${error.message || '未知错误'}`,
        showCancel: false
      });
    }
  },

  // 选择微信头像
  async onChooseWechatAvatar(e) {
    try {
      wx.showLoading({ title: '设置头像中...' });
      
      const { avatarUrl } = e.detail;
      
      if (avatarUrl) {
        const savedFilePath = await this.saveImageToLocal(avatarUrl);
        await this.updateAvatar(savedFilePath);
        
        wx.hideLoading();
        wx.showToast({
          title: '头像设置成功',
          icon: 'success'
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '获取头像失败',
          icon: 'none'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('设置头像失败:', error);
      wx.showToast({
        title: '设置头像失败',
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
    const timestamp = Date.now();
    const fileName = `avatar_${timestamp}.jpg`;
    const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
    
    // 确保目录存在
    try {
      fs.accessSync(wx.env.USER_DATA_PATH);
    } catch (error) {
      try {
        fs.mkdirSync(wx.env.USER_DATA_PATH, true);
      } catch (mkdirError) {
        console.error('创建目录失败:', mkdirError);
        reject(mkdirError);
        return;
      }
    }
    
    // 复制文件
    fs.copyFile({
      srcPath: srcPath,
      destPath: savedPath,
      success: () => {
        console.log('头像保存成功:', savedPath);
        resolve(savedPath);
      },
      fail: (error) => {
        console.error('复制头像文件失败:', error);
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

  // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh() {
    this.loadUserSettings().then(() => {
      this.loadStatistics();
    }).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 页面上拉触底事件的处理函数
  onReachBottom() {
    // 暂无需要处理的逻辑
  },

  // 用户点击右上角分享
  onShareAppMessage() {
    return {
      title: '备小孕 - 专业的生育健康管理工具',
      path: '/pages/index/index'
    };
  },

  // 检查调试模式
  async checkDebugMode() {
    try {
      const debugMode = await wx.getStorage({
        key: 'fertility_debug_mode'
      }).then(res => res.data).catch(() => false);
      
      this.setData({ debugMode });
    } catch (error) {
      console.error('检查调试模式失败:', error);
    }
  },

  // 点击版本号（隐藏的调试模式入口）
  onVersionTap() {
    this.setData({
      debugClickCount: this.data.debugClickCount + 1
    });

    // 连续点击5次开启调试模式
    if (this.data.debugClickCount >= 5) {
      this.toggleDebugMode();
      this.setData({ debugClickCount: 0 });
    }

    // 3秒后重置点击计数
    setTimeout(() => {
      this.setData({ debugClickCount: 0 });
    }, 3000);
  },

  // 切换调试模式
  async toggleDebugMode() {
    const newDebugMode = !this.data.debugMode;
    
    try {
      if (newDebugMode) {
        await wx.setStorage({
          key: 'fertility_debug_mode',
          data: true
        });
        wx.showToast({
          title: '调试模式已开启',
          icon: 'success'
        });
      } else {
        await wx.removeStorage({
          key: 'fertility_debug_mode'
        });
        wx.showToast({
          title: '调试模式已关闭',
          icon: 'success'
        });
      }
      
      this.setData({ debugMode: newDebugMode });
    } catch (error) {
      console.error('切换调试模式失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 测试提醒功能（调试模式专用）
  async testReminder() {
    if (!this.data.debugMode) {
      wx.showToast({
        title: '功能未开放',
        icon: 'none'
      });
      return;
    }

    try {
      const reminderManager = ReminderManager.getInstance();
      
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
              wx.showModal({
                title: '提醒状态',
                content: reminderInfo,
                showCancel: false
              });
              break;
            case 1:
              await reminderManager.showNotification('测试提醒', '这是一个测试提醒，提醒功能正常工作！', 'test_reminder');
              break;
            case 2:
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
  }
});
