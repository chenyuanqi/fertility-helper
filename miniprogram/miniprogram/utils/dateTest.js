/**
 * 日期工具测试
 */

const { DateUtils } = require('./date');

// 测试 addDays 方法
console.log('=== DateUtils.addDays 测试 ===');
console.log('测试日期: 2025-07-18');
console.log('添加 28 天:');

const testDate = '2025-07-18';
const result = DateUtils.addDays(testDate, 28);
console.log('结果:', result);

// 手动验证
const manual = new Date('2025-07-18');
manual.setDate(manual.getDate() + 28);
console.log('手动计算结果:', DateUtils.formatDate(manual));

// 测试 formatDisplayDate
console.log('=== formatDisplayDate 测试 ===');
const displayResult = DateUtils.formatDisplayDate(result);
console.log('显示格式:', displayResult);

module.exports = {
  testDateUtils: () => {
    console.log('DateUtils 测试完成');
  }
};