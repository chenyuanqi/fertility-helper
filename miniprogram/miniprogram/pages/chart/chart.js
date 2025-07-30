// pages/chart/chart.js - 重新设计的图表页面
const { FertilityStorage } = require('../../utils/storage');
const { DateUtils } = require('../../utils/date');

Page({
  data: {
    // 周期信息
    currentCycleIndex: 0,
    cycles: [],
    cycleInfo: {
      startDate: '',
      endDate: '',
      dayCount: 0,
      averageTemp: 0,
      predictedOvulation: '',
      temperatureCount: 0
    },
    
    // 图表数据
    chartData: [],
    viewMode: 'all', // 'all' 或 'temperature'
    
    // UI状态
    isLoading: true,
    canScrollLeft: false,
    canScrollRight: false
  },

  async onLoad() {
    try {
      console.log('图表页面开始加载');
      await this.loadCycles();
      await this.loadCurrentCycleData();
      console.log('图表页面加载完成');
    } catch (error) {
      console.error('图表页面加载失败:', error);
      wx.showToast({ title: '页面加载失败', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  onShow() {
    try {
      console.log('图表页面显示');
      this.loadCurrentCycleData();
    } catch (error) {
      console.error('图表页面显示时加载数据失败:', error);
    }
  },

  /**
   * 加载所有周期数据
   */
  async loadCycles() {
    try {
      let cycles = await FertilityStorage.getCycles() || [];
      
      // 如果没有周期数据，创建当前周期
      if (cycles.length === 0) {
        const today = DateUtils.getToday();
        const defaultCycle = {
          id: `cycle_${Date.now()}`,
          startDate: DateUtils.subtractDays(today, 29),
          endDate: today,
          isComplete: false
        };
        cycles = [defaultCycle];
        await FertilityStorage.saveCycles(cycles);
      }
      
      // 确保每个周期都有结束日期
      const userSettings = await FertilityStorage.getUserSettings();
      cycles = cycles.map(cycle => {
        if (!cycle.endDate) {
          const cycleLength = userSettings?.personalInfo?.averageCycleLength || 28;
          cycle.endDate = DateUtils.addDays(cycle.startDate, cycleLength - 1);
        }
        return cycle;
      });
      
      this.setData({ 
        cycles,
        currentCycleIndex: cycles.length - 1 // 默认显示最新周期
      });
      
      console.log('周期数据加载完成:', cycles.length, '个周期');
      
    } catch (error) {
      console.error('加载周期数据失败:', error);
      wx.showToast({ title: '加载周期失败', icon: 'none' });
    }
  },

  /**
   * 加载当前周期的数据
   */
  async loadCurrentCycleData() {
    try {
      this.setData({ isLoading: true });
      
      const { cycles, currentCycleIndex } = this.data;
      if (!cycles || cycles.length === 0) return;
      
      const currentCycle = cycles[currentCycleIndex];
      if (!currentCycle) return;
      
      // 获取周期日期范围内的所有数据
      const dayRecords = await FertilityStorage.getDayRecords();
      const chartData = this.buildChartData(currentCycle.startDate, currentCycle.endDate, dayRecords);
      
      // 计算周期统计信息
      const cycleInfo = this.calculateCycleInfo(currentCycle, chartData);
      
      this.setData({
        chartData,
        cycleInfo,
        isLoading: false
      });
      
      console.log('当前周期数据:', { cycleInfo, chartDataCount: chartData.length });
      
    } catch (error) {
      console.error('加载周期数据失败:', error);
      wx.showToast({ title: '加载数据失败', icon: 'none' });
      this.setData({ isLoading: false });
    }
  },

  /**
   * 构建图表数据
   */
  buildChartData(startDate, endDate, dayRecords) {
    const dates = DateUtils.getDateRange(startDate, endDate);
    const chartData = [];
    
    dates.forEach((date, index) => {
      const dayData = {
        date,
        dayIndex: index + 1,
        dateDisplay: DateUtils.formatDisplayDate(date),
        hasData: false
      };
      
      if (dayRecords && dayRecords[date]) {
        const record = dayRecords[date];
        
        // 体温数据
        if (record.temperature && 
            typeof record.temperature.temperature === 'number' &&
            record.temperature.temperature > 30 && 
            record.temperature.temperature < 45) {
          dayData.temperature = record.temperature.temperature;
          dayData.hasData = true;
        }
        
        // 月经数据 - 只有实际月经才标记
        if (record.menstrual && 
            record.menstrual.flow && 
            ['light', 'medium', 'heavy'].includes(record.menstrual.flow)) {
          dayData.menstrual = record.menstrual.flow;
          dayData.hasData = true;
        }
        
        // 同房数据 - 只有实际同房才标记
        if (record.intercourse && Array.isArray(record.intercourse)) {
          const validIntercourse = record.intercourse.filter(item => 
            item && 
            item.time && 
            (!item.type || item.type !== 'none')
          );
          if (validIntercourse.length > 0) {
            dayData.intercourse = validIntercourse.length;
            dayData.hasData = true;
          }
        }
      }
      
      chartData.push(dayData);
    });
    
    return chartData;
  },

  /**
   * 计算周期统计信息
   */
  calculateCycleInfo(cycle, chartData) {
    const dayCount = DateUtils.getDaysDifference(cycle.startDate, cycle.endDate) + 1;
    
    // 计算平均体温
    const temperatureData = chartData.filter(day => day.temperature);
    const averageTemp = temperatureData.length > 0 
      ? (temperatureData.reduce((sum, day) => sum + day.temperature, 0) / temperatureData.length).toFixed(1)
      : 0;
    
    // 计算月经天数
    const menstrualDays = chartData.filter(day => day.menstrual).length;
    
    // 计算同房次数
    const intercourseCount = chartData.reduce((sum, day) => sum + (day.intercourse || 0), 0);
    
    // 预测排卵日（简化算法：周期开始后14天）
    const predictedOvulation = DateUtils.addDays(cycle.startDate, 13);
    
    return {
      startDate: cycle.startDate,
      endDate: cycle.endDate,
      dayCount,
      averageTemp: parseFloat(averageTemp),
      predictedOvulation: DateUtils.formatDisplayDate(predictedOvulation),
      temperatureCount: temperatureData.length,
      menstrualDays,
      intercourseCount
    };
  },

  /**
   * 切换到上一个周期
   */
  onPreviousCycle() {
    const { currentCycleIndex } = this.data;
    if (currentCycleIndex > 0) {
      this.setData({ currentCycleIndex: currentCycleIndex - 1 });
      this.loadCurrentCycleData();
    } else {
      wx.showToast({ title: '已是最早周期', icon: 'none' });
    }
  },

  /**
   * 切换到下一个周期
   */
  onNextCycle() {
    const { currentCycleIndex, cycles } = this.data;
    if (currentCycleIndex < cycles.length - 1) {
      this.setData({ currentCycleIndex: currentCycleIndex + 1 });
      this.loadCurrentCycleData();
    } else {
      wx.showToast({ title: '已是最新周期', icon: 'none' });
    }
  },

  /**
   * 切换显示模式
   */
  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  /**
   * 图表滚动事件
   */
  onChartScroll(e) {
    const { scrollLeft, scrollWidth } = e.detail;
    const containerWidth = 750; // 假设容器宽度
    
    this.setData({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - containerWidth
    });
  },

  /**
   * 生成测试数据（开发用）
   */
  async generateTestData() {
    try {
      wx.showLoading({ title: '生成测试数据...' });
      
      const today = DateUtils.getToday();
      const startDate = DateUtils.subtractDays(today, 29);
      const dates = DateUtils.getDateRange(startDate, today);
      
      const dayRecords = {};
      
      dates.forEach((date, index) => {
        const dayRecord = { date };
        
        // 生成体温数据（90%概率）
        if (Math.random() < 0.9) {
          const baseTemp = 36.2 + (Math.random() * 1.0);
          // 模拟体温在排卵后升高
          const ovulationDay = 14;
          const tempAdjustment = index > ovulationDay ? 0.3 : 0;
          
          dayRecord.temperature = {
            id: `temp_${Date.now()}_${index}`,
            date: date,
            time: '07:00',
            temperature: Math.round((baseTemp + tempAdjustment) * 10) / 10,
            note: '',
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          };
        }
        
        // 生成月经数据（前5天）
        if (index < 5) {
          const flows = ['light', 'medium', 'heavy'];
          dayRecord.menstrual = {
            id: `menstrual_${Date.now()}_${index}`,
            date: date,
            flow: flows[Math.floor(Math.random() * flows.length)],
            isStart: index === 0,
            isEnd: index === 4,
            note: '',
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          };
        }
        
        // 生成同房数据（25%概率，在排卵期前后概率更高）
        const isOvulationPeriod = index >= 10 && index <= 16;
        const intercourseChance = isOvulationPeriod ? 0.5 : 0.15;
        
        if (Math.random() < intercourseChance) {
          dayRecord.intercourse = [{
            id: `intercourse_${Date.now()}_${index}`,
            date: date,
            time: '22:00',
            protection: Math.random() < 0.3,
            note: '',
            createdAt: DateUtils.formatISO(new Date()),
            updatedAt: DateUtils.formatISO(new Date())
          }];
        }
        
        dayRecords[date] = dayRecord;
      });
      
      await FertilityStorage.saveDayRecords(dayRecords);
      
      // 创建测试周期
      const testCycle = {
        id: `cycle_${Date.now()}`,
        startDate: startDate,
        endDate: today,
        isComplete: false
      };
      
      await FertilityStorage.saveCycles([testCycle]);
      
      wx.hideLoading();
      wx.showToast({ title: '测试数据生成成功', icon: 'success' });
      
      // 重新加载数据
      await this.loadCycles();
      await this.loadCurrentCycleData();
      
    } catch (error) {
      wx.hideLoading();
      console.error('生成测试数据失败:', error);
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  }
});