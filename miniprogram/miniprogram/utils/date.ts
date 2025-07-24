/**
 * 日期处理工具类
 * 提供日期格式化、计算等功能
 */

export class DateUtils {
  /**
   * 格式化日期为 YYYY-MM-DD 格式
   * @param date 日期对象或时间戳
   */
  static formatDate(date: Date | number | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化时间为 HH:mm 格式
   * @param date 日期对象或时间戳
   */
  static formatTime(date: Date | number | string): string {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 格式化为 ISO 字符串
   * @param date 日期对象或时间戳
   */
  static formatISO(date: Date | number | string): string {
    return new Date(date).toISOString();
  }

  /**
   * 获取今天的日期字符串
   */
  static getToday(): string {
    return this.formatDate(new Date());
  }

  /**
   * 获取当前时间字符串
   */
  static getCurrentTime(): string {
    return this.formatTime(new Date());
  }

  /**
   * 计算两个日期之间的天数差
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  static getDaysDifference(startDate: string | Date, endDate: string | Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 添加天数到指定日期
   * @param date 基准日期
   * @param days 要添加的天数
   */
  static addDays(date: string | Date, days: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return this.formatDate(d);
  }

  /**
   * 减去天数从指定日期
   * @param date 基准日期
   * @param days 要减去的天数
   */
  static subtractDays(date: string | Date, days: number): string {
    return this.addDays(date, -days);
  }

  /**
   * 获取月份的第一天
   * @param date 日期
   */
  static getFirstDayOfMonth(date: string | Date): string {
    const d = new Date(date);
    d.setDate(1);
    return this.formatDate(d);
  }

  /**
   * 获取月份的最后一天
   * @param date 日期
   */
  static getLastDayOfMonth(date: string | Date): string {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    return this.formatDate(d);
  }

  /**
   * 获取日期范围内的所有日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  static getDateRange(startDate: string | Date, endDate: string | Date): string[] {
    const dates: string[] = [];
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
   * @param date 要检查的日期
   */
  static isToday(date: string | Date): boolean {
    return this.formatDate(date) === this.getToday();
  }

  /**
   * 检查日期是否在指定范围内
   * @param date 要检查的日期
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  static isDateInRange(date: string | Date, startDate: string | Date, endDate: string | Date): boolean {
    const d = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return d >= start && d <= end;
  }

  /**
   * 获取星期几（0-6，0为周日）
   * @param date 日期
   */
  static getDayOfWeek(date: string | Date): number {
    return new Date(date).getDay();
  }

  /**
   * 获取星期几的中文名称
   * @param date 日期
   */
  static getDayOfWeekName(date: string | Date): string {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[this.getDayOfWeek(date)];
  }
}