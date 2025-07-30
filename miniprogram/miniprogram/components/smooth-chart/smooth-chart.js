Component({
  properties: {
    chartData: {
      type: Array,
      value: []
    },
    width: {
      type: Number,
      value: 350
    },
    height: {
      type: Number,
      value: 200
    },
    isFullscreen: {
      type: Boolean,
      value: false
    },
    viewMode: {
      type: String,
      value: 'all' // 'all' 或 'temperature'
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        canvasId: `smooth_chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    },
    ready() {
      setTimeout(() => {
        this.drawChart();
      }, 100);
    }
  },

  observers: {
    'chartData, viewMode, isFullscreen': function(newData, newMode, isFullscreen) {
      console.log('数据或模式变化:', { data: newData?.length, mode: newMode, fullscreen: isFullscreen });
      if (newData && newData.length > 0) {
        // 清除之前的定时器，避免重复绘制
        if (this.drawTimer) {
          clearTimeout(this.drawTimer);
        }
        // 全屏模式需要更长的延迟
        const delay = isFullscreen ? 300 : 100;
        this.drawTimer = setTimeout(() => {
          this.drawChart();
        }, delay);
      }
    }
  },

  methods: {
    drawChart() {
      console.log('开始绘制图表，数据:', this.data.chartData?.length, '个点');
      const query = wx.createSelectorQuery().in(this);
      query.select('#smoothChart').fields({ node: true, size: true }).exec((res) => {
        console.log('Canvas查询结果:', res);
        if (res[0] && res[0].node) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          const dpr = wx.getSystemInfoSync().pixelRatio;
          const canvasWidth = res[0].width;
          const canvasHeight = res[0].height;
          
          console.log('Canvas尺寸:', { width: canvasWidth, height: canvasHeight, dpr });
          
          canvas.width = canvasWidth * dpr;
          canvas.height = canvasHeight * dpr;
          ctx.scale(dpr, dpr);
          
          // 强制清空画布
          ctx.clearRect(0, 0, res[0].width, res[0].height);
          // 填充白色背景确保完全清空
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, res[0].width, res[0].height);
          
          // 绘制背景网格
          this.drawGrid(ctx, res[0].width, res[0].height);
          
          // 绘制数据
          this.drawTemperatureLine(ctx, res[0].width, res[0].height);
          this.drawDataPoints(ctx, res[0].width, res[0].height);
        }
      });
    },

    drawGrid(ctx, width, height) {
      const padding = 40;
      const chartWidth = width - 2 * padding;
      const chartHeight = height - 2 * padding;
      
      // 计算实际温度范围
      const { minTemp, maxTemp } = this.getTemperatureRange();
      
      // 根据是否全屏调整网格线样式
      ctx.strokeStyle = this.data.isFullscreen ? '#f5f5f5' : '#f0f0f0';
      ctx.lineWidth = this.data.isFullscreen ? 0.5 : 1;
      ctx.setLineDash(this.data.isFullscreen ? [1, 1] : [2, 2]);
      
      // 动态生成温度刻度
      const tempStep = (maxTemp - minTemp) / 4;
      const tempRange = [];
      for (let i = 0; i <= 4; i++) {
        tempRange.push(maxTemp - (i * tempStep));
      }
      
      // 绘制水平网格线（体温刻度）
      tempRange.forEach((temp, index) => {
        const y = padding + (chartHeight * index) / 4;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      
      console.log('温度连接线绘制完成');
        
        // 绘制温度标签 - 根据是否全屏调整字体
        const tempLabelFont = this.data.isFullscreen ? '11px sans-serif' : '12px sans-serif';
        ctx.fillStyle = '#666';
        ctx.font = tempLabelFont;
        ctx.textAlign = 'right';
        ctx.fillText(`${temp.toFixed(1)}°C`, padding - 5, y + 4);
      });
      
      // 绘制日期标签 - 改进的日期显示逻辑
      const dataLength = this.data.chartData.length;
      if (dataLength > 0) {
        const maxLabels = this.data.isFullscreen ? 8 : 5;
        const step = Math.max(1, Math.floor(dataLength / (maxLabels - 1)));
        
        // 根据是否全屏调整日期标签字体
        const dateLabelFont = this.data.isFullscreen ? '12px sans-serif' : '10px sans-serif';
        ctx.fillStyle = '#666';
        ctx.font = dateLabelFont;
        ctx.textAlign = 'center';
        
        console.log('绘制日期标签，数据长度:', dataLength, '步长:', step, '最大标签数:', maxLabels);
        
        // 绘制起始日期
        if (this.data.chartData[0] && this.data.chartData[0].date) {
          const firstDate = new Date(this.data.chartData[0].date);
          const firstDateStr = `${firstDate.getMonth() + 1}/${firstDate.getDate()}`;
          ctx.fillText(firstDateStr, padding, height - 10);
          console.log('绘制起始日期:', firstDateStr);
        }
        
        // 绘制中间的日期标签
        for (let i = step; i < dataLength - step; i += step) {
          const item = this.data.chartData[i];
          if (item && item.date) {
            const date = new Date(item.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            const x = padding + (i / (dataLength - 1)) * chartWidth;
            ctx.fillText(dateStr, x, height - 10);
            console.log(`绘制中间日期 ${i}:`, dateStr, 'x:', x);
          }
        }
        
        // 绘制结束日期
        if (dataLength > 1 && this.data.chartData[dataLength - 1] && this.data.chartData[dataLength - 1].date) {
          const lastDate = new Date(this.data.chartData[dataLength - 1].date);
          const lastDateStr = `${lastDate.getMonth() + 1}/${lastDate.getDate()}`;
          const x = padding + chartWidth;
          ctx.fillText(lastDateStr, x, height - 10);
          console.log('绘制结束日期:', lastDateStr, 'x:', x);
        }
        
        console.log('日期标签绘制完成');
      }
      
      ctx.setLineDash([]);
    },

    getTemperatureRange() {
      // 获取所有体温数据
      const temperatures = this.data.chartData
        .filter(item => item.temperature && item.temperature.temperature)
        .map(item => item.temperature.temperature);
      
      if (temperatures.length === 0) {
        return { minTemp: 36.0, maxTemp: 37.5 };
      }
      
      const minTemp = Math.min(...temperatures);
      const maxTemp = Math.max(...temperatures);
      
      // 添加一些边距，确保数据点不会贴边
      const margin = (maxTemp - minTemp) * 0.1 || 0.5;
      
      return {
        minTemp: Math.max(35.0, minTemp - margin),
        maxTemp: Math.min(40.0, maxTemp + margin)
      };
    },

    drawTemperatureLine(ctx, width, height) {
      const padding = 40;
      const chartWidth = width - 2 * padding;
      const chartHeight = height - 2 * padding;
      
      // 获取温度范围
      const { minTemp, maxTemp } = this.getTemperatureRange();
      const tempRange = maxTemp - minTemp;
      
      // 获取有体温数据的点
      const temperatureData = this.data.chartData
        .map((item, index) => ({
          ...item,
          index,
          hasTemp: !!(item.temperature && item.temperature.temperature)
        }))
        .filter(item => item.hasTemp);
      
      console.log('温度数据处理结果:', {
        总数据点: this.data.chartData.length,
        有温度的点: temperatureData.length,
        温度数据: temperatureData.map(d => ({ date: d.date, temp: d.temperature.temperature }))
      });
      
      if (temperatureData.length < 2) {
        console.log('温度数据点不足，跳过连线绘制，当前数据点:', temperatureData.length);
        return;
      }
      
      console.log('开始绘制温度连接线，数据点数量:', temperatureData.length);
      
      // 计算坐标点
      const points = temperatureData.map(item => {
        const x = padding + (item.index / (this.data.chartData.length - 1)) * chartWidth;
        const temp = item.temperature.temperature;
        const y = padding + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
        return { x, y, temp };
      });
      
      // 启用抗锯齿
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // 绘制平滑曲线 - 根据是否全屏调整线条粗细
      ctx.beginPath();
      ctx.strokeStyle = '#ff6b9d';
      ctx.lineWidth = this.data.isFullscreen ? 3 : 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      console.log('设置温度线样式:', {
        color: '#ff6b9d',
        width: this.data.isFullscreen ? 3 : 3,
        isFullscreen: this.data.isFullscreen
      });
      
      if (points.length === 2) {
        // 两点直线连接
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
      } else {
        // 多点平滑曲线
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length - 1; i++) {
          const current = points[i];
          const next = points[i + 1];
          const prev = points[i - 1];
          
          // 计算控制点
          const cp1x = current.x - (next.x - prev.x) * 0.1;
          const cp1y = current.y - (next.y - prev.y) * 0.1;
          const cp2x = current.x + (next.x - prev.x) * 0.1;
          const cp2y = current.y + (next.y - prev.y) * 0.1;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, current.x, current.y);
        }
        
        // 连接到最后一点
        const lastPoint = points[points.length - 1];
        const secondLastPoint = points[points.length - 2];
        ctx.quadraticCurveTo(
          secondLastPoint.x + (lastPoint.x - secondLastPoint.x) * 0.5,
          secondLastPoint.y + (lastPoint.y - secondLastPoint.y) * 0.5,
          lastPoint.x,
          lastPoint.y
        );
      }
      
      ctx.stroke();
    },

    drawDataPoints(ctx, width, height) {
      const padding = 40;
      const chartWidth = width - 2 * padding;
      const chartHeight = height - 2 * padding;
      
      // 获取温度范围
      const { minTemp, maxTemp } = this.getTemperatureRange();
      const tempRange = maxTemp - minTemp;
      
      console.log('=== 图表渲染调试 ===');
      console.log('接收到的图表数据:', this.data.chartData);
      console.log('当前显示模式:', this.data.viewMode);
      
      this.data.chartData.forEach((item, index) => {
        const x = padding + (index / (this.data.chartData.length - 1)) * chartWidth;
        
        console.log(`渲染第${index}天 (${item.date}):`, {
          temperature: item.temperature,
          menstrual: item.menstrual,
          intercourse: item.intercourse
        });
        
        // 绘制体温点
        if (item.temperature && item.temperature.temperature) {
          const temp = item.temperature.temperature;
          const y = padding + chartHeight - ((temp - minTemp) / tempRange) * chartHeight;
          
          console.log(`${item.date} 绘制体温点: ${temp}°C`);
          
          // 基础体温点 - 根据是否全屏调整大小
          const pointRadius = this.data.isFullscreen ? 6 : 8;
          const borderWidth = this.data.isFullscreen ? 1.5 : 2;
          
          ctx.fillStyle = '#ff6b9d';
          ctx.beginPath();
          ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
          ctx.fill();
          
          // 白色边框
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = borderWidth;
          ctx.stroke();
          
          // 根据显示模式决定是否显示月经和同房标记
          if (this.data.viewMode === 'all') {
            // 在体温点上叠加月经标记
            if (item.menstrual && item.menstrual.flow && item.menstrual.flow !== 'none') {
              console.log(`${item.date} 绘制月经标记:`, item.menstrual);
              ctx.fillStyle = '#ff4757';
              ctx.beginPath();
              ctx.arc(x - 6, y - 6, 4, 0, 2 * Math.PI);
              ctx.fill();
              
              // 白色边框
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              ctx.stroke();
            }
            
            // 在体温点上叠加同房标记 - 精确验证
            if (item.intercourse && item.intercourse.length > 0) {
              console.log(`${item.date} 检查同房标记:`, item.intercourse);
              
              // 检查是否有实际的同房行为
              let hasValidIntercourse = false;
              
              for (let record of item.intercourse) {
                if (record && 
                    record.type && 
                    record.type !== 'none' && 
                    record.type !== '' && 
                    record.type !== 'no') {
                  hasValidIntercourse = true;
                  break;
                }
              }
              
              if (hasValidIntercourse) {
                console.log(`${item.date} 显示同房标记`);
                ctx.fillStyle = '#5352ed';
                ctx.beginPath();
                ctx.arc(x + 6, y - 6, 4, 0, 2 * Math.PI);
                ctx.fill();
                
                // 白色边框
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.stroke();
              } else {
                console.log(`${item.date} 同房记录无实际行为，不显示:`, item.intercourse);
              }
            }
          }
          
          // 体温标签 - 根据是否全屏调整字体大小
          const fontSize = this.data.isFullscreen ? '12px' : '10px';
          const labelOffset = this.data.isFullscreen ? -18 : -15;
          
          ctx.fillStyle = '#ff6b9d';
          ctx.font = `${fontSize} sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(`${temp.toFixed(1)}°C`, x, y + labelOffset);
        } else {
          // 根据显示模式决定是否显示其他标记
          if (this.data.viewMode === 'all') {
            // 没有体温数据但有其他记录时，在底部显示标记
            let hasOtherData = false;
            const baseY = padding + chartHeight - 20;
            
            // 绘制月经标记
            if (item.menstrual && item.menstrual.flow && item.menstrual.flow !== 'none') {
              console.log(`${item.date} 无体温，绘制月经标记:`, item.menstrual);
              ctx.fillStyle = '#ff4757';
              ctx.fillRect(x - 8, baseY, 16, 8);
              
              ctx.fillStyle = '#fff';
              ctx.font = '10px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('🩸', x, baseY + 6);
              hasOtherData = true;
            }
            
            // 绘制同房标记 - 精确验证
            if (item.intercourse && item.intercourse.length > 0) {
              console.log(`${item.date} 无体温，检查同房标记:`, item.intercourse);
              
              // 检查是否有实际的同房行为
              let hasValidIntercourse = false;
              
              for (let record of item.intercourse) {
                if (record && 
                    record.type && 
                    record.type !== 'none' && 
                    record.type !== '' && 
                    record.type !== 'no') {
                  hasValidIntercourse = true;
                  break;
                }
              }
              
              if (hasValidIntercourse) {
                console.log(`${item.date} 无体温，显示同房标记`);
                const markY = hasOtherData ? baseY - 15 : baseY;
                ctx.fillStyle = '#5352ed';
                ctx.beginPath();
                ctx.arc(x, markY, 8, 0, 2 * Math.PI);
                ctx.fill();
                
                ctx.fillStyle = '#fff';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('💕', x, markY + 3);
              } else {
                console.log(`${item.date} 无体温，同房记录无实际行为，不显示:`, item.intercourse);
              }
            }
          }
        }
      });
      
      console.log('=== 图表渲染调试结束 ===');
    },

    onCanvasClick(e) {
      // 处理点击事件
      this.triggerEvent('chartClick', e.detail);
    }
  }
});