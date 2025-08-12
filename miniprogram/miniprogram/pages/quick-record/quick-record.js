// pages/quick-record/quick-record.js
const { FertilityStorage } = require('../../utils/storage');
const { DataManager } = require('../../utils/dataManager');
const { DateUtils } = require('../../utils/date');

Page({
  data: {
    date: DateUtils.getToday(),
    text: '',
    // 解析结果
    parsed: false,
    temperature: '',
    temperatureTime: '',
    menstrualLabel: '', // 少量/中等/大量/无
    menstrualPadCount: 0,
    intercourse: null, // null/none/once
  },

  onLoad(options) {
    if (options && options.date) {
      this.setData({ date: options.date });
    }
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onInput(e) {
    this.setData({ text: e.detail.value });
  },

  // 粗则解析：体温(36.x/37.x)、时间(7:05/07:05/7点/7点05)、经量(无/少/中/多)、同房(有/无/一次)
  parseText() {
    const raw = (this.data.text || '').replace(/\s+/g, '');
    if (!raw) {
      wx.showToast({ title: '请输入文字', icon: 'none' });
      return;
    }

    let temperature = '';
    let temperatureTime = '';
    let menstrualPadCount = 0;
    let menstrualLabel = '';
    let intercourse = null; // 'none' | 'once'

    // 体温：匹配36.0-42.0
    const tempMatch = raw.match(/(3[6-9]|4[0-2])(?:[\.|点])([0-9])/);
    if (tempMatch) {
      temperature = `${tempMatch[1]}.${tempMatch[2]}`;
    }

    // 时间：HH:mm 或 H点mm 或 H点
    const timeMatch = raw.match(/(\d{1,2})[:：点](\d{1,2})?/);
    if (timeMatch) {
      const h = String(Math.min(23, parseInt(timeMatch[1] || '0', 10))).padStart(2, '0');
      const m = String(Math.min(59, parseInt(timeMatch[2] || '0', 10))).padStart(2, '0');
      temperatureTime = `${h}:${m}`;
    }

    // 经量：无/少/中/多（映射为0/1/2/3+）
    if (/无经|无月经|无|没有月经/.test(raw)) {
      menstrualPadCount = 0; menstrualLabel = '无';
    } else if (/少量|偏少|轻/.test(raw)) {
      menstrualPadCount = 1; menstrualLabel = '少量';
    } else if (/中等|中量/.test(raw)) {
      menstrualPadCount = 2; menstrualLabel = '中量';
    } else if (/多|大量|很厚/.test(raw)) {
      menstrualPadCount = 3; menstrualLabel = '大量';
    }

    // 同房：有/无/一次/1次/两次（>0 视为有）
    if (/无同房|没同房|未同房|未有同房|没有同房/.test(raw)) {
      intercourse = 'none';
    } else if (/(有同房|同房了|一次|1次|两次|2次|晚间同房|晚上同房)/.test(raw)) {
      intercourse = 'once';
    }

    this.setData({
      temperature,
      temperatureTime: temperatureTime || DateUtils.getCurrentTime(),
      menstrualPadCount,
      menstrualLabel,
      intercourse,
      parsed: true,
    });
  },

  async confirmSave() {
    try {
      const date = this.data.date || DateUtils.getToday();
      const dataManager = DataManager.getInstance();

      // 体温
      if (this.data.temperature) {
        await dataManager.saveTemperatureRecord({
          date,
          time: this.data.temperatureTime || DateUtils.getCurrentTime(),
          temperature: parseFloat(this.data.temperature),
          note: '快捷记录'
        });
      }

      // 经量
      if (this.data.menstrualLabel) {
        await dataManager.saveMenstrualRecord({
          date,
          padCount: Number(this.data.menstrualPadCount || 0),
          note: '快捷记录'
        });
      }

      // 同房
      if (this.data.intercourse) {
        if (this.data.intercourse === 'none') {
          await dataManager.saveNoIntercourseRecord({ date, time: null, protection: false, note: '', type: 'none' });
        } else {
          await dataManager.saveIntercourseRecord({ date, time: '22:00', protection: false, note: '快捷记录' });
        }
      }

      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 800);
    } catch (e) {
      console.error('快捷保存失败', e);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});

