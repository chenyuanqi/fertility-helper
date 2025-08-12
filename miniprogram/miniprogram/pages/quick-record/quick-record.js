// pages/quick-record/quick-record.js
const { FertilityStorage } = require('../../utils/storage');
const { DataManager } = require('../../utils/dataManager');
const { DateUtils } = require('../../utils/date');

Page({
  data: {
    date: DateUtils.getToday(),
    today: DateUtils.getToday(),
    text: '',
    // 解析结果
    parsed: false,
    temperature: '',
    temperatureTime: '',
    menstrualLabel: '', // 少量/中等/大量/无
    menstrualPadCount: 0,
    intercourse: null, // null/none/once
    intercourseYes: false,
  },

  onLoad(options) {
    if (options && options.date) {
      this.setData({ date: options.date });
    }
  },

  onDateChange(e) {
    const picked = e.detail.value;
    // 保护：不可选择今天之后
    const today = DateUtils.getToday();
    if (new Date(picked) > new Date(today)) {
      wx.showToast({ title: '不能选择未来日期', icon: 'none' });
      this.setData({ date: today });
    } else {
      this.setData({ date: picked });
    }
  },

  onInput(e) {
    this.setData({ text: e.detail.value });
  },

  // 升级解析：
  // - 体温：36.6/36点6/三十六点六/36度6 等
  // - 时间：7:05/07:05/7点/7点05/晚上10点/晚22:30 等
  // - 经量：无/少量/中量/大量；词语别名：轻/偏少/一般/很多等
  // - 同房：无同房/未同房；或 有同房/一次/1次/晚上同房；识别“有无避孕”
  // - 颜色（可选）：鲜红/暗红/褐色/粉色
  parseText() {
    const raw = (this.data.text || '').replace(/\s+/g, '');
    if (!raw) {
      wx.showToast({ title: '请输入文字', icon: 'none' });
      return;
    }

    // 相对日期识别：今天/昨天/前天/明天（必要时可扩展“后天”）
    let targetDate = this.data.date || DateUtils.getToday();
    try {
      const today = DateUtils.getToday();
      if (/前天/.test(raw)) {
        targetDate = DateUtils.subtractDays(today, 2);
      } else if (/昨天/.test(raw)) {
        targetDate = DateUtils.subtractDays(today, 1);
      } else if (/明天/.test(raw)) {
        // 禁止未来：解析为明天时，重置为今天并提示
        wx.showToast({ title: '不能记录未来日期，已改为今天', icon: 'none' });
        targetDate = today;
      } else if (/今天/.test(raw)) {
        targetDate = today;
      }
    } catch (_) {}

    let temperature = '';
    let temperatureTime = '';
    let menstrualPadCount = 0;
    let menstrualLabel = '';
    let intercourse = null; // 'none' | 'once'
    let hasProtection = false;
    let menstrualColor = '';

    // 中文数字工具
    const cnMap = { 零:0,〇:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10 };
    const parseCnInt = (s, max=99) => {
      if (!s) return NaN;
      // 纯数字
      if (/^\d+$/.test(s)) return Math.min(max, parseInt(s, 10));
      // 处理“十七”“三十六”“三六”“十”
      let val = 0;
      if (s.length === 1 && s in cnMap && s !== '十') return cnMap[s];
      if (s === '十') return 10;
      const m1 = s.match(/^([一二两三四五六七八九])?十([一二三四五六七八九])?$/);
      if (m1) {
        const tens = m1[1] ? cnMap[m1[1]] : 1;
        const ones = m1[2] ? cnMap[m1[2]] : 0;
        val = tens * 10 + ones;
        return Math.min(max, val);
      }
      const m2 = s.match(/^([一二三四五六七八九])([一二三四五六七八九])$/); // 如“三七”≈37（上下文限定）
      if (m2) {
        val = cnMap[m2[1]] * 10 + cnMap[m2[2]];
        return Math.min(max, val);
      }
      // 单字+“十”形式：三十
      const m3 = s.match(/^([一二三四五六七八九])十$/);
      if (m3) return Math.min(max, cnMap[m3[1]] * 10);
      return NaN;
    };

    // 体温：匹配36.0-42.9，支持“36.6”“36点6”“三十六点六”“36度6”
    // 先尝试阿拉伯数字
    let tempMatch = raw.match(/(3[5-9]|4[0-2])[\.|点度]?([0-9])/);
    if (tempMatch) {
      temperature = `${tempMatch[1]}.${tempMatch[2]}`;
    } else {
      // 中文写法：三十六点六 / 三七度一 / 三十七度一
      const m = raw.match(/([一二三四五六七八九十]{1,3})(?:点|度)?([零一二三四五六七八九])?/);
      if (m) {
        const tensOnes = parseCnInt(m[1], 99);
        const dec = m[2] ? parseCnInt(m[2], 9) : 0;
        if (!isNaN(tensOnes) && tensOnes >= 35 && tensOnes <= 42) {
          temperature = `${tensOnes}.${dec}`;
        }
      }
    }

    // 时间：HH:mm 或 H点mm 或 H点；也识别“晚上/早上/上午/下午”
    let timeMatch = raw.match(/(凌晨|清晨|早上|上午|中午|下午|傍晚|晚上|夜里|夜晚)?((\d{1,2})|[一二三四五六七八九十]{1,3})(点|时)(半|[零一二三四五六七八九十]{1,3}|\d{1,2})?/);
    if (timeMatch) {
      const prefix = timeMatch[1] || '';
      const hourRaw = timeMatch[2];
      let h = parseCnInt(hourRaw, 23);
      if (isNaN(h)) h = 0;
      let minutes = 0;
      const mmRaw = timeMatch[5] || '';
      if (mmRaw === '半') minutes = 30; else if (mmRaw) {
        const mm = parseCnInt(mmRaw, 59);
        if (!isNaN(mm)) minutes = mm; else if (/^\d{1,2}$/.test(mmRaw)) minutes = parseInt(mmRaw,10);
      }
      // 调整时段
      if (/下午|傍晚|晚上|夜里|夜晚/.test(prefix) && h < 12) h += 12;
      if (/中午/.test(prefix)) { if (h === 0) h = 12; else if (h < 12) h += 12; }
      if (/凌晨|清晨/.test(prefix) && h === 12) h = 0;
      const hh = String(Math.min(23, Math.max(0, h))).padStart(2, '0');
      const mm = String(Math.min(59, Math.max(0, minutes))).padStart(2, '0');
      temperatureTime = `${hh}:${mm}`;
    }

    // 经量：无/少/中/多（映射为0/1/2/3+）
    if (/(无经|无月经|没有月经|未见月经|今日无)/.test(raw)) {
      menstrualPadCount = 0; menstrualLabel = '无';
    } else if (/少量|偏少|轻/.test(raw)) {
      menstrualPadCount = 1; menstrualLabel = '少量';
    } else if (/中等|中量/.test(raw)) {
      menstrualPadCount = 2; menstrualLabel = '中量';
    } else if (/多|大量|很厚/.test(raw)) {
      menstrualPadCount = 3; menstrualLabel = '大量';
    }

    // 经血颜色：鲜红/暗红/褐色/粉色
    if (/鲜红|亮红|大红/.test(raw)) menstrualColor = 'bright_red';
    else if (/暗红|深红/.test(raw)) menstrualColor = 'dark_red';
    else if (/褐色|咖色/.test(raw)) menstrualColor = 'brown';
    else if (/粉色/.test(raw)) menstrualColor = 'pink';

    // 同房：有/无/一次/1次/两次（>0 视为有）
    if (/(无同房|没同房|未同房|未有同房|没有同房)/.test(raw)) {
      intercourse = 'none';
    } else if (/(有同房|同房了|一次|1次|两次|2次|晚间同房|晚上同房)/.test(raw)) {
      intercourse = 'once';
    }
    // 避孕：有/无/套/避孕
    if (/(避孕|套|安全套|有保护)/.test(raw)) hasProtection = true;

    this.setData({
      date: targetDate,
      temperature,
      temperatureTime: temperatureTime || DateUtils.getCurrentTime(),
      menstrualPadCount,
      menstrualLabel,
      menstrualColor,
      intercourse,
      intercourseYes: intercourse === 'once',
      hasProtection,
      parsed: true,
    });
  },

  onTemperatureInput(e) {
    this.setData({ temperature: e.detail.value });
  },
  onTimeChange(e) {
    this.setData({ temperatureTime: e.detail.value });
  },
  setFlow(e) {
    const c = Number(e.currentTarget.dataset.count || 0);
    this.setData({ menstrualPadCount: c, menstrualLabel: c===0?'无':(c===1?'少量':(c===2?'中量':'大量')) });
  },
  setColor(e) {
    const color = e.currentTarget.dataset.color || '';
    this.setData({ menstrualColor: color });
  },
  onIntercourseToggle(e) {
    const yes = !!e.detail.value;
    this.setData({ intercourseYes: yes, intercourse: yes ? 'once' : 'none' });
  },
  onProtectionToggle(e) {
    this.setData({ hasProtection: !!e.detail.value });
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
          color: this.data.menstrualColor || undefined,
          note: '快捷记录'
        });
      }

      // 同房
      if (this.data.intercourse) {
        if (this.data.intercourse === 'none') {
          await dataManager.saveNoIntercourseRecord({ date, time: null, protection: false, note: '', type: 'none' });
        } else {
          await dataManager.saveIntercourseRecord({ date, time: '22:00', protection: !!this.data.hasProtection, note: '快捷记录' });
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

