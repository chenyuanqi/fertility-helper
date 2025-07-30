// components/simple-chart/simple-chart.js - 简化的图表组件
Component({
  properties: {
    chartData: {
      type: Array,
      value: []
    },
    viewMode: {
      type: String,
      value: 'all' // 'all' 或 'temperature'
    },
    width: {
      type: Number,
      value: 750
    },
    height: {
      type: Number,
      value: 400
    }
  },

  data: {
    canvasId: '',
    temperatureRange: { min: 36.0, max: 37.5 }
  },

  lifetimes: {
    attached() {
      this.setData({
        canvasId: `simple_chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    },
    
    ready() {
      setTimeout(() => {
        this.drawChart();
      }, 100);
    }
  },

  observers: {
    'chartData, viewMode': function() {
      setTimeout(() => {
        this.drawChart();
      }, 100);
    }
  },

  methods: {
    /**
     * 绘制图表
     */
    drawChart() {
      if (!this.data.chartData || this.data.chartData.length === 0) {
        console.log('没有图表数据，跳过绘制');
        return;
      }

      const query = wx.createSelectorQuery().in(this);
      query.select('#simpleChart').fields({ node: true, size: true }).exec((res) => {
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          // 使用新的API获取设备像素比
          let dpr = 2; // 默认值
          try {
            const deviceInfo = wx.getDeviceInfo ? wx.getDeviceInfo() : {};
            dpr = deviceInfo.pixelRatio || 2;
          } catch (error) {
            console.warn('获取设备信息失败，使用默认pixelRatio:', error);
          }
          
          const canvasWidth = res[0].width;
          const canvasHeight = res[0].height;
          
          canvas.width = canvasWidth * dpr;
          canvas.height = canvasHeight * dpr;
          ctx.scale(dpr, dpr);
          
          this.drawChartContent(ctx, canvasWidth, canvasHeight);
        }
      });
    },

    /**
     * 绘制图表内容
     */
    drawChartContent(ctx, width, height) {
      // 清空画布
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      
      const padding = { top: 20, right: 20, bottom: 60, left: 40 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      // 计算体温范围
      this.calculateTemperatureRange();
      const { min: minTemp, max: maxTemp } = this.data.temperatureRange;
      
      // 绘制背景网格
      this.drawGrid(ctx, padding, chartWidth, chartHeight, minTemp, maxTemp);
      
      // 绘制数据点和连线
      this.drawDataPoints(ctx, padding, chartWidth, chartHeight, minTemp, maxTemp);
      
      // 绘制日期标签
      this.drawDateLabels(ctx, padding, chartWidth, height);
    },

    /**
     * 计算体温范围
     */
    calculateTemperatureRange() {
      const temperatures = this.data.chartData
        .filter(day => day.temperature)
        .map(day => day.temperature);
      
      if (temperatures.length === 0) {
        this.setData({ temperatureRange: { min: 36.0, max: 37.5 } });
        return;
      }
      
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);
      const margin = (maxTemp - minTemp) * 0.1 || 0.5;
      
      this.setData({
        temperatureRange: {
          min: Math.max(35.0, minTemp - margin),
          max: Math.min(40.0, maxTemp + margin)
        }
      });
    },

    /**
     * 绘制背景网格
     */
    drawGrid(ctx, padding, chartWidth, chartHeight, minTemp, maxTemp) {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      // 绘制水平网格线（体温刻度）
      for (let i = 0; i <= 4; i++) {
        const temp = maxTemp - (i * (maxTemp - minTemp) / 4);
        const y = padding.top + (i * chartHeight / 4);
        
        // 网格线
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // 温度标签
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${temp.toFixed(1)}°C`, padding.left - 5, y + 4);
      }
      
      ctx.setLineDash([]);
    },

    /**
     * 绘制数据点和连线
     */
    drawDataPoints(ctx, padding, chartWidth, chartHeight, minTemp, maxTemp) {
      const dataLength = this.data.chartData.length;
      const tempRange = maxTemp - minTemp;
      
      // 收集体温点坐标用于连线
      const temperaturePoints = [];
      
      this.data.chartData.forEach((day, index) => {
        const x = padding.left + (index / Math.max(1, dataLength - 1)) * chartWidth;
        
        // 绘制体温点
        if (day.temperature) {
          const y = padding.top + chartHeight - ((day.temperature - minTemp) / tempRange) * chartHeight;
          temperaturePoints.push({ x, y, temp: day.temperature });
          
          // 体温点
          ctx.fillStyle = '#ff6b9d';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
          
          // 白色边框
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // 体温标签
          ctx.fillStyle = '#ff6b9d';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${day.temperature.toFixed(1)}`, x, y - 10);
        }
        
        // 在全部数据模式下绘制月经和同房标记
        if (this.data.viewMode === 'all') {
          const baseY = padding.top + chartHeight + 10;
          
          // 月经标记
          if (day.menstrual) {
            const colors = { light: '#ffb3ba', medium: '#ff6b6b', heavy: '#e74c3c' };
            ctx.fillStyle = colors[day.menstrual] || '#ff6b6b';
            ctx.fillRect(x - 3, baseY, 6, 15);
            
            // 白色边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 3, baseY, 6, 15);
          }
          
          // 同房标记
          if (day.intercourse) {
            ctx.fillStyle = '#4ecdc4';
            ctx.beginPath();
            ctx.arc(x, baseY + 25, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            // 白色边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 多次标记
            if (day.intercourse > 1) {
              ctx.fillStyle = '#fff';
              ctx.font = '8px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(day.intercourse.toString(), x, baseY + 28);
            }
          }
        }
      });
      
      // 绘制体温连线
      if (temperaturePoints.length > 1) {
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);
        
        ctx.beginPath();
        ctx.moveTo(temperaturePoints[0].x, temperaturePoints[0].y);
        
        for (let i = 1; i < temperaturePoints.length; i++) {
          ctx.lineTo(temperaturePoints[i].x, temperaturePoints[i].y);
        }
        
        ctx.stroke();
      }
    },

    /**
     * 绘制日期标签
     */
    drawDateLabels(ctx, padding, chartWidth, height) {
      const dataLength = this.data.chartData.length;
      const maxLabels = Math.min(8, dataLength);
      const step = Math.max(1, Math.floor(dataLength / maxLabels));
      
      ctx.fillStyle = '#666';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      
      // 绘制选定的日期标签
      for (let i = 0; i < dataLength; i += step) {
        const day = this.data.chartData[i];
        if (day && day.dateDisplay) {
          const x = padding.left + (i / Math.max(1, dataLength - 1)) * chartWidth;
          const y = height - 15;
          
          ctx.fillText(day.dateDisplay, x, y);
        }
      }
      
      // 确保显示最后一个日期
      if (dataLength > 1) {
        const lastDay = this.data.chartData[dataLength - 1];
        if (lastDay && lastDay.dateDisplay) {
          const x = padding.left + chartWidth;
          const y = height - 15;
          ctx.fillText(lastDay.dateDisplay, x, y);
        }
      }
    }
  }
});