/**
 * 日期处理工具类
 * 提供日期格式化、计算等功能
 */

class DateUtils {
  /**
   * 格式化日期为 YYYY-MM-DD 格式
   * @param {Date|number|string} date 日期对象或时间戳
   */
  static formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化时间为 HH:mm 格式
   * @param {Date|number|string} date 日期对象或时间戳
   */
  static formatTime(date) {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 格式化为 ISO 字符串
   * @param {Date|number|string} date 日期对象或时间戳
   */
  static formatISO(date) {
    return new Date(date).toISOString();
  }

  /**
   * 获取今天的日期字符串
   */
  static getToday() {
    return this.formatDate(new Date());
  }

  /**
   * 获取当前时间字符串
   */
  static getCurrentTime() {
    return this.formatTime(new Date());
  }

  /**
   * 计算两个日期之间的天数差
   * @param {string|Date} startDate 开始日期
   * @param {string|Date} endDate 结束日期
   */
  static getDaysDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 添加天数到指定日期
   * @param {string|Date} date 基准日期
   * @param {number} days 要添加的天数
   */
  static addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  }

  /**
   * 减去天数从指定日期
   * @param {string|Date} date 基准日期
   * @param {number} days 要减去的天数
   */
  static subtractDays(date, days) {
    return this.addDays(date, -days);
  }

  /**
   * 获取月份的第一天
   * @param {string|Date} date 日期
   */
  static getFirstDayOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    return this.formatDate(d);
  }

  /**
   * 获取月份的最后一天
   * @param {string|Date} date 日期
   */
  static getLastDayOfMonth(date) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    return this.formatDate(d);
  }

  /**
   * 获取日期范围内的所有日期
   * @param {string|Date} startDate 开始日期
   * @param {string|Date} endDate 结束日期
   */
  static getDateRange(startDate, endDate) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      dates.push(this.formatDate(start));
      start.setDate(start.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * 检查是否为今天
   * @param {string|Date} date 要检查的日期
   */
  static isToday(date) {
    return this.formatDate(date) === this.getToday();
  }

  /**
   * 检查日期是否在指定范围内
   * @param {string|Date} date 要检查的日期
   * @param {string|Date} startDate 开始日期
   * @param {string|Date} endDate 结束日期
   */
  static isDateInRange(date, startDate, endDate) {
    const d = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return d >= start && d <= end;
  }

  /**
   * 获取星期几（0-6，0为周日）
   * @param {string|Date} date 日期
   */
  static getDayOfWeek(date) {
    return new Date(date).getDay();
  }

  /**
   * 获取星期几的中文名称
   * @param {string|Date} date 日期
   */
  static getDayOfWeekName(date) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[this.getDayOfWeek(date)];
  }
}

module.exports = {
  DateUtils
};