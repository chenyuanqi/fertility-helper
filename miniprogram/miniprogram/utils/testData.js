/**
 * 测试数据生成工具
 * 用于生成示例数据来测试图表功能
 */

const { FertilityStorage } = require('./storage');
const { DateUtils } = require('./date');

class TestDataGenerator {
  /**
   * 生成示例数据
   */
  static async generateSampleData() {
    try {
      console.log('开始生成示例数据...');
      
      // 生成过去30天的数据
      const today = DateUtils.getToday();
      const startDate = DateUtils.subtractDays(today, 29);
      const dates = DateUtils.getDateRange(startDate, today);
      
      const dayRecords = {};
      
      dates.forEach((date, index) => {
        const dayRecord = { date };
        
        // 生成体温数据 (80%的概率)
        if (Math.random() < 0.8) {
          const baseTemp = 36.2 + Math.random() * 1.0; // 36.2-37.2°C
          dayRecord.temperature = {
            id: `temp_${Date.now()}_${index}`,
            date: date,
            time: '07:00',
            temperature: Math.round(baseTemp * 10) / 10,
            note: '',
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          };
        }
        
        // 生成月经数据 (前5天)
        if (index < 5) {
          const flows = ['light', 'medium', 'heavy'];
          dayRecord.menstrual = {
            id: `menstrual_${Date.now()}_${index}`,
            date: date,
            flow: flows[Math.floor(Math.random() * flows.length)],
            isStart: index === 0,
            isEnd: index === 4,
            note: index === 0 ? '月经开始' : '',
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          };
        }
        
        // 生成同房数据 (30%的概率)
        if (Math.random() < 0.3) {
          dayRecord.intercourse = [{
            id: `intercourse_${Date.now()}_${index}`,
            date: date,
            time: '22:00',
            protection: Math.random() < 0.5,
            note: '',
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          }];
        }
        
        dayRecords[date] = dayRecord;
      });
      
      // 保存到存储
      await FertilityStorage.saveDayRecords(dayRecords);
      
      // 生成周期数据
      const cycles = [{
        id: `cycle_${Date.now()}`,
        startDate: startDate,
        endDate: null,
        length: null,
        isComplete: false,
        averageTemperature: {
          follicular: 36.3,
          luteal: 36.8
        }
      }];
      
      await FertilityStorage.saveCycles(cycles);
      
      console.log('示例数据生成完成!');
      console.log('生成了', Object.keys(dayRecords).length, '天的数据');
      console.log('有体温数据的天数:', Object.values(dayRecords).filter(r => r.temperature).length);
      console.log('有月经数据的天数:', Object.values(dayRecords).filter(r => r.menstrual).length);
      console.log('有同房数据的天数:', Object.values(dayRecords).filter(r => r.intercourse).length);
      
      return {
        success: true,
        data: dayRecords
      };
    } catch (error) {
      console.error('生成示例数据失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 清除所有数据
   */
  static async clearAllData() {
    try {
      await FertilityStorage.saveDayRecords({});
      await FertilityStorage.saveCycles([]);
      console.log('所有数据已清除');
      return { success: true };
    } catch (error) {
      console.error('清除数据失败:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = {
  TestDataGenerator
};