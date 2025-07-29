// pages/chart/chart.js
const { FertilityStorage } = require('../../utils/storage');
const { DateUtils } = require('../../utils/date.js');

Page({
  data: {
    chartData: [],
    viewMode: 'all',
    displayMode: 'chart',
    isLoading: true,
    cycleStats: {
      cycleDay: 0,
      averageTemp: 0,
      predictedOvulation: '',
      temperatureCount: 0,
      menstrualDays: 0,
      intercourseCount: 0
    },
    dateRange: {
      start: '',
      end: ''
    },
    isZoomed: false,
    chartWidth: 350,
    chartScrollLeft: 0,
    selectedPointData: null,
    showFullscreenChart: false,
    chartDateLabels: [],
    chartDataPoints: [],
    temperatureLinePoints: ''
  },

  async onLoad(options) {
    await this.initializeDateRange();
    this.loadChartData();
  },

  onShow() {
    this.loadChartData();
  },

  onReady() {
    setTimeout(() => {
      this.drawTemperatureLine();
    }, 500);
  },

  async initializeDateRange() {
    try {
      const cycles = await FertilityStorage.getCycles();
      const today = DateUtils.formatDate(new Date());
      
      if (cycles && cycles.length > 0) {
        const latestCycle = cycles[cycles.length - 1];
        
        if (latestCycle && latestCycle.startDate) {
          const userSettings = await FertilityStorage.getUserSettings();
          const averageCycleLength = userSettings?.personalInfo?.averageCycleLength || 28;
          const cycleEndDate = DateUtils.addDays(latestCycle.startDate, averageCycleLength - 1);
          
          if (today <= cycleEndDate) {
            this.setData({
              dateRange: {
                start: latestCycle.startDate,
                end: today
              }
            });
          } else {
            const thirtyDaysAgo = DateUtils.subtractDays(today, 29);
            this.setData({
              dateRange: {
                start: thirtyDaysAgo,
                end: today
              }
            });
          }
        } else {
          this.setDefaultDateRange();
        }
      } else {
        this.setDefaultDateRange();
      }
    } catch (error) {
      console.error('初始化日期范围失败:', error);
      this.setDefaultDateRange();
    }
  },

  setDefaultDateRange() {
    const today = DateUtils.formatDate(new Date());
    const thirtyDaysAgo = DateUtils.subtractDays(today, 29);
    
    this.setData({
      dateRange: {
        start: thirtyDaysAgo,
        end: today
      }
    });
  },

  drawTemperatureLine() {
    const query = wx.createSelectorQuery();
    query.select('#temperatureCanvas').fields({ node: true, size: true }).exec((res) => {
      if (res[0] && res[0].node) {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        ctx.clearRect(0, 0, res[0].width, res[0].height);
        
        // 获取有体温数据的点，按日期排序
        const temperaturePoints = this.data.chartDataPoints
          .filter(point => point.hasTemperature && point.temperatureValue)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        console.log('找到体温数据点:', temperaturePoints.length, '个');
        
        if (temperaturePoints.length < 2) {
          console.log('体温数据点不足2个，无法绘制连线');
          return;
        }
        
        ctx.beginPath();
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const canvasWidth = res[0].width;
        const canvasHeight = res[0].height;
        
        temperaturePoints.forEach((point, index) => {
          const x = (point.x / 100) * canvasWidth;
          const y = (point.y / 100) * canvasHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
        console.log('体温连接线绘制完成');
      }
    });
  },

  async loadChartData() {
    try {
      this.setData({ isLoading: true });
      
      const { start, end } = this.data.dateRange;
      const dayRecords = await FertilityStorage.getDayRecords();
      const chartData = this.buildChartData(start, end, dayRecords);
      const cycleStats = this.calculateCycleStats(chartData);
      const chartDateLabels = this.generateChartDateLabels(start, end);
      const { chartDataPoints, temperatureLinePoints } = this.generateChartPoints(chartData);
      
      this.setData({
        chartData,
        cycleStats,
        chartDateLabels,
        chartDataPoints,
        temperatureLinePoints
      }, () => {
        this.drawTemperatureLine();
      });
    } catch (error) {
      console.error('加载图表数据异常:', error);
      wx.showToast({
        title: '加载数据异常',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  buildChartData(startDate, endDate, dayRecords) {
    const chartData = [];
    const dates = DateUtils.getDateRange(startDate, endDate);
    
    dates.forEach(date => {
      const dayData = { date };
      
      if (dayRecords && dayRecords[date]) {
        const record = dayRecords[date];
        
        if (record.temperature) {
          dayData.temperature = record.temperature;
        }
        if (record.menstrual) {
          dayData.menstrual = record.menstrual;
        }
        if (record.intercourse) {
          dayData.intercourse = record.intercourse;
        }
      }
      
      chartData.push(dayData);
    });
    
    return chartData;
  },

  calculateCycleStats(chartData) {
    const stats = {
      cycleDay: 0,
      averageTemp: 0,
      predictedOvulation: '',
      temperatureCount: 0,
      menstrualDays: 0,
      intercourseCount: 0
    };
    
    const tempData = chartData.filter(item => 
      item.temperature && item.temperature.temperature
    );
    stats.temperatureCount = tempData.length;
    
    if (tempData.length > 0) {
      const totalTemp = tempData.reduce((sum, item) => 
        sum + item.temperature.temperature, 0
      );
      stats.averageTemp = (totalTemp / tempData.length).toFixed(1);
    }
    
    return stats;
  },

  generateChartDateLabels(startDate, endDate) {
    const labels = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    const labelCount = Math.min(5, daysDiff);
    const interval = Math.floor(daysDiff / (labelCount - 1));
    
    for (let i = 0; i < labelCount; i++) {
      let labelDate;
      if (i === labelCount - 1) {
        labelDate = new Date(endDate);
      } else {
        labelDate = new Date(start);
        labelDate.setDate(start.getDate() + (i * interval));
      }
      
      const month = labelDate.getMonth() + 1;
      const day = labelDate.getDate();
      labels.push(`${month}/${day}`);
    }
    
    return labels;
  },

  generateChartPoints(chartData) {
    const chartDataPoints = [];
    const temperaturePoints = [];
    const totalDays = chartData.length;
    
    console.log('生成图表点，总天数:', totalDays);
    
    const temperatureData = chartData.filter(item => item.temperature && item.temperature.temperature);
    let minTemp = 36.0;
    let maxTemp = 37.5;
    
    if (temperatureData.length > 0) {
      const temps = temperatureData.map(item => item.temperature.temperature);
      minTemp = Math.min(...temps) - 0.2;
      maxTemp = Math.max(...temps) + 0.2;
      console.log('体温范围:', minTemp, '到', maxTemp);
    }
    
    chartData.forEach((dayData, index) => {
      const xPercent = totalDays > 1 ? (index / (totalDays - 1)) * 80 + 10 : 50;
      
      const hasTemperature = dayData.temperature && dayData.temperature.temperature;
      const hasMenstrual = dayData.menstrual && dayData.menstrual.flow !== 'none';
      const hasIntercourse = dayData.intercourse && dayData.intercourse.length > 0;
      
      let yPercent = 50;
      let temperatureValue = null;
      
      if (hasTemperature) {
        const tempValue = dayData.temperature.temperature;
        temperatureValue = tempValue.toFixed(1);
        yPercent = 80 - ((tempValue - minTemp) / (maxTemp - minTemp)) * 60;
        temperaturePoints.push(`${xPercent},${yPercent}`);
        
        console.log(`${dayData.date}: 体温${tempValue}°C, 坐标(${xPercent}%, ${yPercent}%)`);
      }
      
      if (hasTemperature || hasMenstrual || hasIntercourse) {
        const pointData = {
          date: dayData.date,
          x: xPercent,
          y: yPercent,
          hasTemperature,
          hasMenstrual,
          hasIntercourse,
          temperatureValue
        };
        
        chartDataPoints.push(pointData);
      }
    });
    
    const temperatureLinePoints = temperaturePoints.join(' ');
    
    console.log('生成的数据点:', chartDataPoints.length, '个');
    console.log('体温数据点:', chartDataPoints.filter(p => p.hasTemperature).length, '个');
    
    return {
      chartDataPoints,
      temperatureLinePoints
    };
  },

  onPointClick(e) {
    const { point } = e.currentTarget.dataset;
    this.showPointDetails(point);
  },

  showPointDetails(pointData) {
    const selectedPointData = {
      dateDisplay: DateUtils.formatDisplayDate(pointData.date),
      temperature: pointData.hasTemperature ? `${pointData.temperatureValue}°C` : '--'
    };
    
    this.setData({ selectedPointData });
  },

  closeDetails() {
    this.setData({ selectedPointData: null });
  },

  onViewModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  },

  goToRecord() {
    wx.navigateTo({
      url: '/pages/record/record'
    });
  },

  onChartTap() {
    console.log('点击图表，准备打开全屏模式');
    console.log('当前图表数据点数量:', this.data.chartDataPoints.length);
    console.log('体温数据点数量:', this.data.chartDataPoints.filter(p => p.hasTemperature).length);
    
    this.setData({
      showFullscreenChart: true
    }, () => {
      setTimeout(() => {
        this.drawFullscreenTemperatureLine();
      }, 500);
    });
  },

  closeFullscreenChart() {
    this.setData({
      showFullscreenChart: false
    });
  },

  drawFullscreenTemperatureLine() {
    console.log('开始绘制全屏体温连接线');
    
    const query = wx.createSelectorQuery();
    query.select('#fullscreenTemperatureCanvas').fields({ node: true, size: true }).exec((res) => {
      console.log('Canvas查询结果:', res);
      
      if (res[0] && res[0].node) {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        
        console.log('全屏Canvas尺寸:', res[0].width, 'x', res[0].height);
        
        ctx.clearRect(0, 0, res[0].width, res[0].height);
        
        // 获取有体温数据的点，按日期排序
        const temperaturePoints = this.data.chartDataPoints
          .filter(point => point.hasTemperature && point.temperatureValue)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        console.log('全屏图表找到体温数据点:', temperaturePoints.length, '个');
        
        if (temperaturePoints.length < 2) {
          console.log('全屏图表：体温数据点不足2个，无法绘制连线');
          // 即使只有一个点，也绘制一个圆圈表示
          if (temperaturePoints.length === 1) {
            const point = temperaturePoints[0];
            const x = (point.x / 100) * res[0].width;
            const y = (point.y / 100) * res[0].height;
            
            ctx.fillStyle = '#ff6b9d';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();
            console.log('绘制单个体温点:', x, y);
          }
          return;
        }
        
        // 绘制连接线
        ctx.beginPath();
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const canvasWidth = res[0].width;
        const canvasHeight = res[0].height;
        
        temperaturePoints.forEach((point, index) => {
          const x = (point.x / 100) * canvasWidth;
          const y = (point.y / 100) * canvasHeight;
          
          console.log(`全屏点${index + 1}: 坐标(${x}, ${y})`);
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
        console.log('全屏体温连接线绘制完成');
        
        // 绘制数据点圆圈
        ctx.fillStyle = '#ff6b9d';
        temperaturePoints.forEach((point) => {
          const x = (point.x / 100) * canvasWidth;
          const y = (point.y / 100) * canvasHeight;
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, 2 * Math.PI);
          ctx.fill();
          
          // 绘制白色边框
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = '#ff6b9d';
          ctx.lineWidth = 4;
        });
        
        console.log('全屏体温点和连接线绘制完成');
      } else {
        console.error('无法获取全屏Canvas节点');
      }
    });
  },

  onZoomToggle() {
    const isZoomed = !this.data.isZoomed;
    let chartWidth = 350;
    
    if (isZoomed) {
      const dataCount = this.data.chartData.length;
      chartWidth = Math.max(700, dataCount * 30);
    }
    
    this.setData({ 
      isZoomed,
      chartWidth
    });

    wx.showToast({
      title: isZoomed ? '已放大图表' : '已缩小图表',
      icon: 'none',
      duration: 1500
    });
  }
});