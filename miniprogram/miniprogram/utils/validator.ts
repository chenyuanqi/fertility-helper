/**
 * 数据验证工具类
 * 提供各种数据验证功能
 */

export class Validator {
  /**
   * 验证体温数据
   * @param temperature 体温值
   */
  static validateTemperature(temperature: number): { valid: boolean; message?: string } {
    if (typeof temperature !== 'number' || isNaN(temperature)) {
      return { valid: false, message: '体温必须是数字' };
    }
    
    if (temperature < 35.0 || temperature > 42.0) {
      return { valid: false, message: '体温范围应在35.0°C - 42.0°C之间' };
    }
    
    // 检查小数位数
    const decimalPlaces = (temperature.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return { valid: false, message: '体温最多保留两位小数' };
    }
    
    return { valid: true };
  }

  /**
   * 验证日期格式 (YYYY-MM-DD)
   * @param dateString 日期字符串
   */
  static validateDate(dateString: string): { valid: boolean; message?: string } {
    if (!dateString || typeof dateString !== 'string') {
      return { valid: false, message: '日期不能为空' };
    }
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return { valid: false, message: '日期格式应为 YYYY-MM-DD' };
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return { valid: false, message: '无效的日期' };
    }
    
    // 检查日期是否过于久远或未来
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    const oneYearLater = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    
    if (date < oneYearAgo || date > oneYearLater) {
      return { valid: false, message: '日期应在一年内范围' };
    }
    
    return { valid: true };
  }

  /**
   * 验证时间格式 (HH:mm)
   * @param timeString 时间字符串
   */
  static validateTime(timeString: string): { valid: boolean; message?: string } {
    if (!timeString || typeof timeString !== 'string') {
      return { valid: false, message: '时间不能为空' };
    }
    
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeString)) {
      return { valid: false, message: '时间格式应为 HH:mm' };
    }
    
    return { valid: true };
  }

  /**
   * 验证经量类型
   * @param flow 经量类型
   */
  static validateMenstrualFlow(flow: string): { valid: boolean; message?: string } {
    const validFlows = ['light', 'medium', 'heavy'];
    if (!validFlows.includes(flow)) {
      return { valid: false, message: '经量类型必须是 light、medium 或 heavy' };
    }
    
    return { valid: true };
  }

  /**
   * 验证备注长度
   * @param note 备注内容
   */
  static validateNote(note?: string): { valid: boolean; message?: string } {
    if (!note) {
      return { valid: true }; // 备注可以为空
    }
    
    if (typeof note !== 'string') {
      return { valid: false, message: '备注必须是字符串' };
    }
    
    if (note.length > 200) {
      return { valid: false, message: '备注长度不能超过200字符' };
    }
    
    return { valid: true };
  }

  /**
   * 验证用户年龄
   * @param age 年龄
   */
  static validateAge(age: number): { valid: boolean; message?: string } {
    if (typeof age !== 'number' || isNaN(age)) {
      return { valid: false, message: '年龄必须是数字' };
    }
    
    if (age < 12 || age > 60) {
      return { valid: false, message: '年龄应在12-60岁之间' };
    }
    
    return { valid: true };
  }

  /**
   * 验证周期长度
   * @param length 周期长度（天）
   */
  static validateCycleLength(length: number): { valid: boolean; message?: string } {
    if (typeof length !== 'number' || isNaN(length)) {
      return { valid: false, message: '周期长度必须是数字' };
    }
    
    if (length < 21 || length > 35) {
      return { valid: false, message: '周期长度应在21-35天之间' };
    }
    
    return { valid: true };
  }

  /**
   * 验证黄体期长度
   * @param length 黄体期长度（天）
   */
  static validateLutealPhaseLength(length: number): { valid: boolean; message?: string } {
    if (typeof length !== 'number' || isNaN(length)) {
      return { valid: false, message: '黄体期长度必须是数字' };
    }
    
    if (length < 10 || length > 16) {
      return { valid: false, message: '黄体期长度应在10-16天之间' };
    }
    
    return { valid: true };
  }

  /**
   * 验证ID格式
   * @param id ID字符串
   */
  static validateId(id: string): { valid: boolean; message?: string } {
    if (!id || typeof id !== 'string') {
      return { valid: false, message: 'ID不能为空' };
    }
    
    if (id.length < 10) {
      return { valid: false, message: 'ID长度不足' };
    }
    
    return { valid: true };
  }

  /**
   * 批量验证对象的多个字段
   * @param data 要验证的数据对象
   * @param rules 验证规则
   */
  static validateObject(data: any, rules: { [key: string]: (value: any) => { valid: boolean; message?: string } }): { valid: boolean; errors: { [key: string]: string } } {
    const errors: { [key: string]: string } = {};
    let valid = true;
    
    for (const [field, validator] of Object.entries(rules)) {
      const result = validator(data[field]);
      if (!result.valid) {
        errors[field] = result.message || '验证失败';
        valid = false;
      }
    }
    
    return { valid, errors };
  }
}