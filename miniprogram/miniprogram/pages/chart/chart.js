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

  async onShow() {
    try {
      console.log('图表页面显示，重新加载数据');
      // 重新加载周期数据，以防有新的周期被创建
      await this.loadCycles();
      // 重新加载当前周期数据，确保获取最新的记录
      await this.loadCurrentCycleData();
      console.log('图表页面数据刷新完成');
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
        currentCycleIndex: cycles.length > 0 ? cycles.length - 1 : 0 // 默认显示最新周期
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
      if (!cycles || cycles.length === 0) {
        this.setData({ 
          chartData: [],
          cycleInfo: {
            startDate: '',
            endDate: '',
            dayCount: 0,
            averageTemp: 0,
            predictedOvulation: '',
            temperatureCount: 0
          },
          isLoading: false 
        });
        return;
      }
      
      const currentCycle = cycles[currentCycleIndex];
      if (!currentCycle) {
        this.setData({ isLoading: false });
        return;
      }
      
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
    console.log('=== buildChartData 开始构建图表数据 ===');
    console.log('周期范围:', startDate, '至', endDate);
    console.log('原始记录数量:', dayRecords ? Object.keys(dayRecords).length : 0);
    
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
        console.log(`${date} 原始记录:`, record);
        
        // 体温数据
        if (record.temperature && 
            typeof record.temperature.temperature === 'number' &&
            record.temperature.temperature > 30 && 
            record.temperature.temperature < 45) {
          dayData.temperature = record.temperature.temperature;
          dayData.hasData = true;
          console.log(`${date} 体温数据:`, dayData.temperature);
        }
        
        // 月经数据（基于 padCount） - 只有 padCount>0 才标记
        if (record.menstrual && typeof record.menstrual.padCount === 'number') {
          const count = Number(record.menstrual.padCount || 0);
          if (count > 0) {
            dayData.menstrual = {
              padCount: count,
              color: record.menstrual.color || '',
              isStart: !!record.menstrual.isStart,
              isEnd: !!record.menstrual.isEnd
            };
            dayData.hasData = true;
            console.log(`${date} 月经数据:`, dayData.menstrual);
          }
        }
        
        // 同房数据 - 只有实际同房才标记
        if (record.intercourse && Array.isArray(record.intercourse)) {
          const validIntercourse = record.intercourse.filter(item => 
            item && 
            item.time && 
            (!item.type || item.type !== 'none')
          );
          if (validIntercourse.length > 0) {
            dayData.intercourse = validIntercourse;
            dayData.hasData = true;
            console.log(`${date} 同房数据:`, validIntercourse);
          }
        }
      }
      
      chartData.push(dayData);
    });
    
    // 统计最终数据
    const tempCount = chartData.filter(d => d.temperature).length;
    const menstrualCount = chartData.filter(d => d.menstrual).length;
    const intercourseCount = chartData.filter(d => d.intercourse).length;
    
    console.log('=== buildChartData 构建完成 ===');
    console.log(`最终数据统计 - 体温:${tempCount}, 月经:${menstrualCount}, 同房:${intercourseCount}`);
    console.log('总数据点:', chartData.length);
    
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
    const intercourseCount = chartData.reduce((sum, day) => {
      if (day.intercourse && Array.isArray(day.intercourse)) {
        console.log(`${day.date} 同房数据:`, day.intercourse, '数量:', day.intercourse.length);
        return sum + day.intercourse.length;
      }
      return sum;
    }, 0);
    
    console.log('=== 周期统计信息计算 ===');
    console.log('同房总次数:', intercourseCount);
    
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
   * 跳转到首页设置周期
   */
  goToIndex() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  /**
   * 显示周期管理菜单
   */
  showCycleMenu() {
    const { cycles, currentCycleIndex } = this.data;
    if (!cycles || cycles.length === 0) return;

    wx.showActionSheet({
      itemList: ['编辑周期', '删除周期', '新建周期'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.editCurrentCycle();
            break;
          case 1:
            this.deleteCurrentCycle();
            break;
          case 2:
            this.createNewCycle();
            break;
        }
      }
    });
  },

  /**
   * 编辑当前周期
   */
  editCurrentCycle() {
    const { cycles, currentCycleIndex } = this.data;
    const currentCycle = cycles[currentCycleIndex];
    
    wx.showModal({
      title: '编辑周期',
      content: `当前周期：${currentCycle.startDate} 至 ${currentCycle.endDate}`,
      showCancel: true,
      confirmText: '去首页编辑',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  /**
   * 删除当前周期
   */
  async deleteCurrentCycle() {
    const { cycles, currentCycleIndex } = this.data;
    
    wx.showModal({
      title: '删除周期',
      content: '确定要删除这个周期吗？此操作不可恢复。',
      showCancel: true,
      confirmText: '删除',
      confirmColor: '#ff4444',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 删除周期
            cycles.splice(currentCycleIndex, 1);
            await FertilityStorage.saveCycles(cycles);
            
            // 调整当前周期索引
            const newIndex = Math.max(0, Math.min(currentCycleIndex, cycles.length - 1));
            this.setData({ 
              cycles,
              currentCycleIndex: newIndex 
            });
            
            // 重新加载数据
            await this.loadCurrentCycleData();
            
            wx.showToast({
              title: '周期已删除',
              icon: 'success'
            });
          } catch (error) {
            console.error('删除周期失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  /**
   * 创建新周期
   */
  createNewCycle() {
    wx.showModal({
      title: '新建周期',
      content: '请到首页设置新的周期开始日期',
      showCancel: true,
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      }
    });
  },

  /**
   * 下拉刷新
   */
  async onPullDownRefresh() {
    try {
      console.log('图表页面下拉刷新开始');
      await this.loadCycles();
      await this.loadCurrentCycleData();
      console.log('图表页面下拉刷新完成');
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      });
    } catch (error) {
      console.error('图表页面下拉刷新失败:', error);
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
    } finally {
      wx.stopPullDownRefresh();
    }
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
          console.log(`生成月经数据 ${date}:`, dayRecord.menstrual);
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
          console.log(`生成同房数据 ${date}:`, dayRecord.intercourse);
        }
        
        dayRecords[date] = dayRecord;
      });
      
      console.log('=== 测试数据生成完成 ===');
      console.log('总记录数:', Object.keys(dayRecords).length);
      console.log('月经记录数:', Object.values(dayRecords).filter(r => r.menstrual).length);
      console.log('同房记录数:', Object.values(dayRecords).filter(r => r.intercourse).length);
      
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