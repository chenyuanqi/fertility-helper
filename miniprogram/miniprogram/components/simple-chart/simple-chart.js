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
    'chartData, viewMode': function(chartData, viewMode) {
      console.log('=== simple-chart 数据更新 ===');
      console.log('图表数据长度:', chartData ? chartData.length : 0);
      console.log('显示模式:', viewMode);
      
      if (chartData && chartData.length > 0) {
        const sampleData = chartData.slice(0, 3);
        console.log('前3条数据样本:', sampleData);
      }
      
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
      
      // 调整padding，为图例留出空间
      const padding = { top: 40, right: 20, bottom: 50, left: 50 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      
      // 计算体温范围
      this.calculateTemperatureRange();
      const { min: minTemp, max: maxTemp } = this.data.temperatureRange;
      
      // 绘制背景网格
      this.drawGrid(ctx, padding, chartWidth, chartHeight, minTemp, maxTemp);
      
      // 绘制经量背景（基于 padCount）
      this.drawMenstruationBackground(ctx, padding, chartWidth, chartHeight);

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
      
      // 调试日志
      console.log('=== 图表数据调试 ===');
      console.log('总数据点数:', dataLength);
      
      // 统计各类数据
      let tempCount = 0, menstrualCount = 0, intercourseCount = 0;
      this.data.chartData.forEach((day, index) => {
        if (day.temperature) tempCount++;
        if (this.hasMenstrualData(day)) {
          menstrualCount++;
          console.log(`第${index + 1}天有月经数据:`, day.menstrual);
        }
        if (this.hasIntercourseData(day)) {
          intercourseCount++;
          console.log(`第${index + 1}天有同房数据:`, day.intercourse);
        }
      });
      
      console.log(`数据统计 - 体温:${tempCount}, 月经:${menstrualCount}, 同房:${intercourseCount}`);
      console.log('=== 图表数据调试结束 ===');
      
      // 收集体温点坐标用于连线
      const temperaturePoints = [];
      
      // 先绘制体温连线
      this.data.chartData.forEach((day, index) => {
        const x = padding.left + (index / Math.max(1, dataLength - 1)) * chartWidth;
        
        if (day.temperature) {
          const y = padding.top + chartHeight - ((day.temperature - minTemp) / tempRange) * chartHeight;
          temperaturePoints.push({ x, y, temp: day.temperature });
        }
      });
      
      // 绘制体温连线
      if (temperaturePoints.length > 1) {
        ctx.strokeStyle = '#4a90e2'; // 与体温指标颜色保持一致 - 蓝色
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
      
      // 然后绘制数据点（新的设计）
      this.data.chartData.forEach((day, index) => {
        const x = padding.left + (index / Math.max(1, dataLength - 1)) * chartWidth;
        
        // 收集当天的所有指标
        const indicators = [];
        
        // 体温指标 - 使用蓝色
        if (day.temperature) {
          const y = padding.top + chartHeight - ((day.temperature - minTemp) / tempRange) * chartHeight;
          indicators.push({
            type: 'temperature',
            x: x,
            y: y,
            color: '#4a90e2', // 蓝色
            value: day.temperature
          });
        }
        
      // 月经指标 - 保持红色（基于padCount）
      if (this.data.viewMode === 'all' && this.hasMenstrualData(day)) {
          const y = day.temperature ? 
            padding.top + chartHeight - ((day.temperature - minTemp) / tempRange) * chartHeight :
            padding.top + chartHeight * 0.5;
          indicators.push({
            type: 'menstrual',
            x: x,
            y: y,
            color: '#dc143c', // 保持深红色
            value: this.getMenstrualValue(day)
          });
        }
        
        // 同房指标 - 使用紫色
        if (this.data.viewMode === 'all' && this.hasIntercourseData(day)) {
          const y = day.temperature ? 
            padding.top + chartHeight - ((day.temperature - minTemp) / tempRange) * chartHeight :
            padding.top + chartHeight * 0.5;
          indicators.push({
            type: 'intercourse',
            x: x,
            y: y,
            color: '#8e44ad', // 紫色
            value: this.getIntercourseValue(day)
          });
        }
        
        // 根据指标数量绘制不同的显示方式
        if (indicators.length === 0) {
          return;
        } else if (indicators.length === 1) {
          // 单个指标，直接绘制圆点
          const indicator = indicators[0];
          this.drawSingleIndicator(ctx, indicator);
        } else {
          // 多个指标，绘制组合圆圈
          this.drawMultipleIndicators(ctx, indicators);
        }
      });
    },

    /**
     * 绘制单个指标
     */
    drawSingleIndicator(ctx, indicator) {
      ctx.fillStyle = indicator.color;
      ctx.beginPath();
      ctx.arc(indicator.x, indicator.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      
      // 白色边框
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    },

    /**
     * 绘制多个指标的组合显示
     */
    drawMultipleIndicators(ctx, indicators) {
      const centerX = indicators[0].x;
      const centerY = indicators[0].y;
      
      // 绘制外圈
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
      ctx.stroke();
      
      // 根据指标数量安排小圆点位置
      const radius = 6;
      const angleStep = (2 * Math.PI) / indicators.length;
      
      indicators.forEach((indicator, index) => {
        let offsetX, offsetY;
        
        if (indicators.length === 2) {
          // 两个指标，左右排列
          offsetX = index === 0 ? -4 : 4;
          offsetY = 0;
        } else if (indicators.length === 3) {
          // 三个指标，三角形排列
          const angle = index * angleStep - Math.PI / 2;
          offsetX = Math.cos(angle) * radius;
          offsetY = Math.sin(angle) * radius;
        } else {
          // 更多指标，圆形排列
          const angle = index * angleStep - Math.PI / 2;
          offsetX = Math.cos(angle) * radius;
          offsetY = Math.sin(angle) * radius;
        }
        
        // 绘制小圆点
        ctx.fillStyle = indicator.color;
        ctx.beginPath();
        ctx.arc(centerX + offsetX, centerY + offsetY, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // 白色边框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    },

    /**
     * 检查是否有月经数据
     */
    hasMenstrualData(day) {
      return day.menstrual &&
             typeof day.menstrual === 'object' &&
             typeof day.menstrual.padCount === 'number' &&
             day.menstrual.padCount > 0;
    },

    /**
     * 获取月经数据值
     */
    getMenstrualValue(day) {
      if (this.hasMenstrualData(day)) {
        const c = Number(day.menstrual.padCount || 0);
        if (c === 1) return 'light';
        if (c === 2) return 'medium';
        return 'heavy';
      }
      return null;
    },

    /**
     * 绘制经量背景（按 padCount 深浅）
     */
    drawMenstruationBackground(ctx, padding, chartWidth, chartHeight) {
      const dataLength = this.data.chartData.length;
      const colWidth = chartWidth / Math.max(1, dataLength - 1);
      for (let i = 0; i < dataLength; i++) {
        const day = this.data.chartData[i];
        if (!day || !this.hasMenstrualData(day)) continue;
        const x = padding.left + (i / Math.max(1, dataLength - 1)) * chartWidth - colWidth / 2;
        const intensity = Number(day.menstrual.padCount || 0);
        const alpha = Math.min(0.12 + intensity * 0.06, 0.35); // 由浅到深
        ctx.fillStyle = `rgba(255, 107, 157, ${alpha})`;
        ctx.fillRect(x, padding.top, colWidth, chartHeight);
      }
    },

    /**
     * 检查是否有同房数据
     */
    hasIntercourseData(day) {
      return day.intercourse && 
             Array.isArray(day.intercourse) && 
             day.intercourse.length > 0;
    },

    /**
     * 获取同房数据值
     */
    getIntercourseValue(day) {
      if (this.hasIntercourseData(day)) {
        return day.intercourse.length;
      }
      return 0;
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