/**
 * 三合一图表组件
 * 包含体温折线图、经量背景区块、同房图标叠加
 */

Component({
  properties: {
    // 图表数据
    chartData: {
      type: Array,
      value: []
    },
    // 图表宽度
    width: {
      type: Number,
      value: 350
    },
    // 图表高度
    height: {
      type: Number,
      value: 300
    },
    // 显示模式：all, temperature, minimal
    viewMode: {
      type: String,
      value: 'all'
    }
  },

  data: {
    canvasId: '',
    processedData: [],
    isReady: false,
    displayIndexes: [] // 用于显示X轴标签的索引
  },

  lifetimes: {
    attached() {
      this.setData({
        canvasId: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    },
    ready() {
      this.processChartData();
      this.setData({ isReady: true });
    }
  },

  observers: {
    'chartData': function(newData) {
      if (newData && newData.length > 0) {
        this.processChartData();
      }
    }
  },

  methods: {
    /**
     * 处理图表数据
     */
    processChartData() {
      const data = this.data.chartData;
      if (!data || data.length === 0) {
        this.setData({ 
          processedData: [],
          displayIndexes: []
        });
        return;
      }

      const processedData = data.map((item, index) => {
        const processed = {
          ...item,
          index,
          hasTemperature: !!(item.temperature && item.temperature.temperature),
          hasMenstrual: !!(item.menstrual && item.menstrual.flow !== 'none'),
          hasIntercourse: !!(item.intercourse && item.intercourse.length > 0 && 
                           item.intercourse.some(record => record.type !== 'none'))
        };

        // 计算显示位置（百分比）
        if (processed.hasTemperature) {
          const temp = item.temperature.temperature;
          // 体温范围 35.5-37.5°C
          processed.temperaturePercent = ((temp - 35.5) / 2.0) * 100;
          processed.isHighTemp = temp >= 36.8;
        }

        if (processed.hasMenstrual) {
          const flowMap = { light: 1, medium: 2, heavy: 3 };
          processed.menstrualLevel = flowMap[item.menstrual.flow] || 0;
        }

        if (processed.hasIntercourse) {
          processed.intercourseCount = item.intercourse.filter(record => record.type !== 'none').length;
        }

        return processed;
      });

      // 计算要显示X轴标签的索引
      const maxLabels = 5;
      const labelStep = Math.max(1, Math.floor(data.length / maxLabels));
      const displayIndexes = [];
      for (let i = 0; i < data.length; i += labelStep) {
        displayIndexes.push(i);
      }

      this.setData({ 
        processedData,
        displayIndexes
      });
    },

    /**
     * 格式化日期显示
     */
    formatDateForDisplay(dateStr) {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    },

    /**
     * 处理点击事件
     */
    onPointClick(e) {
      const index = parseInt(e.currentTarget.dataset.index);
      const data = this.data.processedData[index];
      
      if (data) {
        this.triggerEvent('pointClick', {
          data: this.data.chartData[index],
          position: { index }
        });
      }
    }
  }
});