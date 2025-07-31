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
      
      // 增加顶部空间以容纳月经和同房标记
      const padding = { top: 60, right: 20, bottom: 60, left: 40 };
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
      
      // 绘制纵向网格线（日期对应）
      const dataLength = this.data.chartData.length;
      
      // 计算纵向网格线的间距
      const dateSpacing = chartWidth / Math.max(1, dataLength - 1);
      const minSpacing = 25; // 最小间距，避免网格线过密
      
      // 如果日期太密集，则隔几个显示一条纵向网格线
      let step = 1;
      if (dateSpacing < minSpacing && dataLength > 15) {
        step = Math.max(1, Math.floor(dataLength / 15)); // 最多显示15条纵向网格线
      }
      
      // 绘制纵向网格线
      for (let i = 0; i < dataLength; i += step) {
        const x = padding.left + (i / Math.max(1, dataLength - 1)) * chartWidth;
        
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }
      
      // 确保显示最后一条纵向网格线
      if (dataLength > 1) {
        const lastX = padding.left + chartWidth;
        ctx.beginPath();
        ctx.moveTo(lastX, padding.top);
        ctx.lineTo(lastX, padding.top + chartHeight);
        ctx.stroke();
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
        
        // 在全部数据模式下绘制月经和同房标记 - 标记在日期上方
        if (this.data.viewMode === 'all') {
          // 月经标记 - 在图表顶部上方
          if (day.menstrual) {
            const colors = { light: '#ffcccb', medium: '#ff6b6b', heavy: '#e74c3c' };
            const markY = padding.top - 30;
            
            // 绘制月经标记矩形
            ctx.fillStyle = colors[day.menstrual] || '#ff6b6b';
            ctx.fillRect(x - 5, markY, 10, 8);
            
            // 白色边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 5, markY, 10, 8);
          }
          
          // 同房标记 - 在图表顶部上方，如果有月经记录则在更上方
          if (day.intercourse) {
            const markY = day.menstrual ? padding.top - 45 : padding.top - 30;
            
            // 绘制同房标记圆形
            ctx.fillStyle = '#4ecdc4';
            ctx.beginPath();
            ctx.arc(x, markY + 4, 5, 0, 2 * Math.PI);
            ctx.fill();
            
            // 白色边框
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 如果有多次同房，显示数字
            if (day.intercourse > 1) {
              ctx.fillStyle = '#fff';
              ctx.font = '7px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(day.intercourse.toString(), x, markY + 6);
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
     * 绘制日期标签 - 显示所有日期，格式为 MMDD
     */
    drawDateLabels(ctx, padding, chartWidth, height) {
      const dataLength = this.data.chartData.length;
      
      ctx.fillStyle = '#666';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      
      // 计算每个日期的间距
      const dateSpacing = chartWidth / Math.max(1, dataLength - 1);
      const minSpacing = 18; // 进一步减小最小间距，显示更多日期
      
      // 如果日期太密集，则隔几个显示一个
      let step = 1;
      if (dateSpacing < minSpacing && dataLength > 20) {
        step = Math.max(1, Math.floor(dataLength / 20)); // 最多显示20个日期标签
      }
      
      // 绘制日期标签
      const displayedIndices = new Set();
      
      // 优先显示关键日期（有数据的日期）
      for (let i = 0; i < dataLength; i += step) {
        const day = this.data.chartData[i];
        if (day && day.date) {
          const x = padding.left + (i / Math.max(1, dataLength - 1)) * chartWidth;
          const y = height - 15;
          
          // 格式化日期为 MMDD 格式
          const date = new Date(day.date);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const dayNum = String(date.getDate()).padStart(2, '0');
          const dateStr = month + dayNum;
          
          ctx.fillText(dateStr, x, y);
          displayedIndices.add(i);
        }
      }
      
      // 确保显示第一个和最后一个日期
      if (!displayedIndices.has(0)) {
        const firstDay = this.data.chartData[0];
        if (firstDay && firstDay.date) {
          const x = padding.left;
          const y = height - 15;
          const date = new Date(firstDay.date);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const dayNum = String(date.getDate()).padStart(2, '0');
          const dateStr = month + dayNum;
          ctx.fillText(dateStr, x, y);
        }
      }
      
      if (dataLength > 1 && !displayedIndices.has(dataLength - 1)) {
        const lastDay = this.data.chartData[dataLength - 1];
        if (lastDay && lastDay.date) {
          const x = padding.left + chartWidth;
          const y = height - 15;
          const date = new Date(lastDay.date);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const dayNum = String(date.getDate()).padStart(2, '0');
          const dateStr = month + dayNum;
          ctx.fillText(dateStr, x, y);
        }
      }
    }
  }
});