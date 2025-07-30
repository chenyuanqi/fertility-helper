// utils/reminderManager.js - 提醒管理工具类
const { FertilityStorage } = require('./storage');
const { DateUtils } = require('./date');

class ReminderManager {
  constructor() {
    this.reminders = new Map(); // 存储已设置的提醒
  }

  /**
   * 获取单例实例
   */
  static getInstance() {
    if (!ReminderManager.instance) {
      ReminderManager.instance = new ReminderManager();
    }
    return ReminderManager.instance;
  }

  /**
   * 初始化提醒管理器
   */
  async init() {
    try {
      const userSettings = await FertilityStorage.getUserSettings();
      if (userSettings && userSettings.reminders) {
        await this.setupAllReminders(userSettings.reminders);
      }
    } catch (error) {
      console.error('初始化提醒管理器失败:', error);
    }
  }

  /**
   * 设置所有提醒
   */
  async setupAllReminders(reminders) {
    try {
      // 清除所有现有提醒
      await this.clearAllReminders();

      // 设置晨起体温提醒
      if (reminders.morningTemperature && reminders.morningTemperature.enabled) {
        await this.setupMorningTemperatureReminder(reminders.morningTemperature.time);
      }

      // 设置易孕期提醒
      if (reminders.fertileWindow && reminders.fertileWindow.enabled) {
        await this.setupFertileWindowReminder();
      }

      // 设置排卵日提醒
      if (reminders.periodPrediction && reminders.periodPrediction.enabled) {
        await this.setupPeriodPredictionReminder();
      }

      console.log('所有提醒设置完成');
    } catch (error) {
      console.error('设置提醒失败:', error);
    }
  }

  /**
   * 设置晨起体温提醒
   */
  async setupMorningTemperatureReminder(time = '07:00') {
    try {
      const reminderId = 'morning_temperature';
      
      // 取消现有提醒
      await this.cancelReminder(reminderId);

      // 计算下次提醒时间
      const nextReminderTime = this.getNextReminderTime(time);
      
      // 设置本地通知
      wx.requestSubscribeMessage({
        tmplIds: ['temperature_reminder_template'], // 需要在微信公众平台配置模板
        success: (res) => {
          if (res['temperature_reminder_template'] === 'accept') {
            // 用户同意接收通知
            this.scheduleLocalNotification({
              id: reminderId,
              title: '体温测量提醒',
              content: '该测量基础体温了，记得在起床前测量哦！',
              trigger: nextReminderTime,
              repeat: 'day' // 每天重复
            });
          }
        },
        fail: (error) => {
          console.warn('用户拒绝订阅消息:', error);
          // 即使用户拒绝订阅消息，也可以设置本地提醒
          this.scheduleLocalNotification({
            id: reminderId,
            title: '体温测量提醒',
            content: '该测量基础体温了，记得在起床前测量哦！',
            trigger: nextReminderTime,
            repeat: 'day'
          });
        }
      });

    } catch (error) {
      console.error('设置晨起体温提醒失败:', error);
    }
  }

  /**
   * 设置易孕期提醒
   */
  async setupFertileWindowReminder() {
    try {
      const reminderId = 'fertile_window';
      
      // 取消现有提醒
      await this.cancelReminder(reminderId);

      // 获取用户设置和周期数据
      const userSettings = await FertilityStorage.getUserSettings();
      const cycles = await FertilityStorage.getCycles();
      
      if (!cycles || cycles.length === 0) {
        console.log('没有周期数据，无法设置易孕期提醒');
        return;
      }

      // 获取最新周期
      const latestCycle = cycles[cycles.length - 1];
      const cycleLength = userSettings?.personalInfo?.averageCycleLength || 28;
      const lutealPhase = userSettings?.personalInfo?.averageLutealPhase || 14;
      
      // 计算预计排卵日（周期开始前14天）
      const ovulationDay = cycleLength - lutealPhase;
      const fertileStart = ovulationDay - 5; // 易孕期开始（排卵前5天）
      
      // 计算下次易孕期开始时间
      const nextCycleStart = DateUtils.addDays(latestCycle.startDate, cycleLength);
      const nextFertileStart = DateUtils.addDays(nextCycleStart, fertileStart);
      
      // 设置提醒时间为易孕期开始当天的上午9点
      const reminderTime = new Date(nextFertileStart);
      reminderTime.setHours(9, 0, 0, 0);

      this.scheduleLocalNotification({
        id: reminderId,
        title: '易孕期提醒',
        content: '您的易孕期即将开始，注意观察身体变化！',
        trigger: reminderTime,
        repeat: 'none'
      });

    } catch (error) {
      console.error('设置易孕期提醒失败:', error);
    }
  }

  /**
   * 设置排卵日提醒
   */
  async setupPeriodPredictionReminder() {
    try {
      const reminderId = 'period_prediction';
      
      // 取消现有提醒
      await this.cancelReminder(reminderId);

      // 获取用户设置和周期数据
      const userSettings = await FertilityStorage.getUserSettings();
      const cycles = await FertilityStorage.getCycles();
      
      if (!cycles || cycles.length === 0) {
        console.log('没有周期数据，无法设置排卵日提醒');
        return;
      }

      // 获取最新周期
      const latestCycle = cycles[cycles.length - 1];
      const cycleLength = userSettings?.personalInfo?.averageCycleLength || 28;
      const lutealPhase = userSettings?.personalInfo?.averageLutealPhase || 14;
      
      // 计算预计排卵日
      const ovulationDay = cycleLength - lutealPhase;
      const nextCycleStart = DateUtils.addDays(latestCycle.startDate, cycleLength);
      const nextOvulationDate = DateUtils.addDays(nextCycleStart, ovulationDay);
      
      // 设置提醒时间为排卵日当天的上午8点
      const reminderTime = new Date(nextOvulationDate);
      reminderTime.setHours(8, 0, 0, 0);

      this.scheduleLocalNotification({
        id: reminderId,
        title: '排卵日提醒',
        content: '今天是预计排卵日，注意观察排卵症状！',
        trigger: reminderTime,
        repeat: 'none'
      });

    } catch (error) {
      console.error('设置排卵日提醒失败:', error);
    }
  }

  /**
   * 计算下次提醒时间
   */
  getNextReminderTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date();
    
    reminderTime.setHours(hours, minutes, 0, 0);
    
    // 如果今天的提醒时间已过，设置为明天
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    return reminderTime;
  }

  /**
   * 安排本地通知
   */
  scheduleLocalNotification(options) {
    try {
      // 微信小程序不支持本地推送通知，这里使用模拟实现
      // 实际项目中可能需要结合服务端推送或其他方案
      
      const { id, title, content, trigger, repeat } = options;
      
      // 存储提醒信息
      this.reminders.set(id, {
        id,
        title,
        content,
        trigger,
        repeat,
        created: new Date()
      });

      // 计算距离提醒时间的毫秒数
      const now = new Date();
      const delay = trigger.getTime() - now.getTime();
      
      if (delay > 0) {
        // 设置定时器
        const timerId = setTimeout(() => {
          this.showNotification(title, content);
          
          // 如果是重复提醒，重新设置
          if (repeat === 'day') {
            const nextTrigger = new Date(trigger);
            nextTrigger.setDate(nextTrigger.getDate() + 1);
            this.scheduleLocalNotification({
              ...options,
              trigger: nextTrigger
            });
          }
        }, delay);
        
        // 存储定时器ID以便取消
        const reminder = this.reminders.get(id);
        if (reminder) {
          reminder.timerId = timerId;
          this.reminders.set(id, reminder);
        }
        
        console.log(`已设置提醒: ${title}, 将在 ${trigger.toLocaleString()} 提醒`);
      }
      
    } catch (error) {
      console.error('安排本地通知失败:', error);
    }
  }

  /**
   * 显示通知
   */
  showNotification(title, content) {
    try {
      // 显示系统通知（如果支持）
      wx.showModal({
        title: title,
        content: content,
        showCancel: false,
        confirmText: '知道了'
      });
      
      // 同时显示Toast提示
      wx.showToast({
        title: title,
        icon: 'none',
        duration: 3000
      });
      
      console.log(`显示通知: ${title} - ${content}`);
    } catch (error) {
      console.error('显示通知失败:', error);
    }
  }

  /**
   * 取消指定提醒
   */
  async cancelReminder(reminderId) {
    try {
      const reminder = this.reminders.get(reminderId);
      if (reminder && reminder.timerId) {
        clearTimeout(reminder.timerId);
        this.reminders.delete(reminderId);
        console.log(`已取消提醒: ${reminderId}`);
      }
    } catch (error) {
      console.error('取消提醒失败:', error);
    }
  }

  /**
   * 清除所有提醒
   */
  async clearAllReminders() {
    try {
      for (const [id, reminder] of this.reminders) {
        if (reminder.timerId) {
          clearTimeout(reminder.timerId);
        }
      }
      this.reminders.clear();
      console.log('已清除所有提醒');
    } catch (error) {
      console.error('清除所有提醒失败:', error);
    }
  }

  /**
   * 获取所有活跃的提醒
   */
  getActiveReminders() {
    const activeReminders = [];
    for (const [id, reminder] of this.reminders) {
      if (reminder.trigger > new Date()) {
        activeReminders.push({
          id,
          title: reminder.title,
          content: reminder.content,
          trigger: reminder.trigger,
          repeat: reminder.repeat
        });
      }
    }
    return activeReminders;
  }

  /**
   * 更新提醒设置
   */
  async updateReminders(reminders) {
    try {
      await this.setupAllReminders(reminders);
      console.log('提醒设置已更新');
    } catch (error) {
      console.error('更新提醒设置失败:', error);
    }
  }
}

module.exports = {
  ReminderManager
};