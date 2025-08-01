// 工具函数测试
const { DateUtils } = require('../utils/date');

describe('DateUtils 测试', () => {
  test('获取今日日期', () => {
    const today = DateUtils.getToday();
    expect(typeof today).toBe('string');
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('日期加法运算', () => {
    const result = DateUtils.addDays('2025-01-15', 10);
    expect(result).toBe('2025-01-25');
  });

  test('日期减法运算', () => {
    const result = DateUtils.subtractDays('2025-01-15', 5);
    expect(result).toBe('2025-01-10');
  });

  test('计算日期差值', () => {
    const diff = DateUtils.getDaysDifference('2025-01-01', '2025-01-15');
    expect(diff).toBe(14);
  });

  test('格式化显示日期', () => {
    const formatted = DateUtils.formatDisplayDate('2025-01-15');
    expect(formatted).toBe('1月15日');
  });

  test('边界日期处理', () => {
    // 测试月末日期
    const result1 = DateUtils.addDays('2025-01-31', 1);
    expect(result1).toBe('2025-02-01');
    
    // 测试年末日期
    const result2 = DateUtils.addDays('2024-12-31', 1);
    expect(result2).toBe('2025-01-01');
  });
});

describe('存储功能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('存储模块加载', () => {
    const { FertilityStorage } = require('../utils/storage');
    expect(FertilityStorage).toBeDefined();
    expect(typeof FertilityStorage.saveUserSettings).toBe('function');
    expect(typeof FertilityStorage.getUserSettings).toBe('function');
  });
});