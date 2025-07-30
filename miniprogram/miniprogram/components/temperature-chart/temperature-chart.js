import * as echarts from 'echarts-for-weixin/echarts';

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
      value: 300
    }
  },

  data: {
    ec: {
      onInit: null
    }
  },

  lifetimes: {
    ready() {
      this.initChart();
    }
  },

  observers: {
    'chartData': function(newData) {
      if (newData && newData.length > 0) {
        this.updateChart();
      }
    }
  },

  methods: {
    initChart() {
      this.setData({
        ec: {
          onInit: this.initEcharts.bind(this)
        }
      });
    },

    initEcharts(canvas, width, height, dpr) {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      
      this.chart = chart;
      this.updateChart();
      
      return chart;
    },

    updateChart() {
      if (!this.chart || !this.data.chartData.length) {
        return;
      }

      // 处理数据
      const temperatureData = [];
      const dates = [];
      const menstrualData = [];
      const intercourseData = [];

      this.data.chartData.forEach((item, index) => {
        // 日期处理
        const date = new Date(item.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        dates.push(dateStr);

        // 体温数据
        if (item.temperature && item.temperature.temperature) {
          temperatureData.push({
            value: [index, item.temperature.temperature],
            itemStyle: {
              color: '#ff6b9d'
            }
          });
        } else {
          temperatureData.push({
            value: [index, null]
          });
        }

        // 月经数据（用于背景标记）
        if (item.menstrual && item.menstrual.flow !== 'none') {
          menstrualData.push({
            value: [index, 35.8], // 固定在底部位置
            symbolSize: 20,
            itemStyle: {
              color: '#ff4757'
            }
          });
        }

        // 同房数据
        if (item.intercourse && item.intercourse.length > 0) {
          intercourseData.push({
            value: [index, 37.3], // 固定在顶部位置
            symbolSize: 15,
            itemStyle: {
              color: '#5352ed'
            }
          });
        }
      });

      const option = {
        backgroundColor: 'transparent',
        grid: {
          left: '10%',
          right: '10%',
          top: '15%',
          bottom: '20%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          },
          axisLabel: {
            color: '#666',
            fontSize: 12
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#f0f0f0',
              type: 'dashed'
            }
          }
        },
        yAxis: {
          type: 'value',
          min: 35.8,
          max: 37.5,
          interval: 0.2,
          axisLine: {
            lineStyle: {
              color: '#ddd'
            }
          },
          axisLabel: {
            color: '#666',
            fontSize: 12,
            formatter: '{value}°C'
          },
          splitLine: {
            lineStyle: {
              color: '#f0f0f0',
              type: 'dashed'
            }
          }
        },
        series: [
          {
            name: '基础体温',
            type: 'line',
            data: temperatureData,
            smooth: true, // 启用平滑曲线
            smoothMonotone: 'x', // 单调平滑
            lineStyle: {
              color: '#ff6b9d',
              width: 3
            },
            itemStyle: {
              color: '#ff6b9d',
              borderColor: '#fff',
              borderWidth: 2
            },
            symbol: 'circle',
            symbolSize: 8,
            connectNulls: false, // 不连接空值
            label: {
              show: true,
              position: 'top',
              formatter: function(params) {
                return params.value[1] ? params.value[1].toFixed(1) + '°C' : '';
              },
              color: '#ff6b9d',
              fontSize: 10
            }
          },
          {
            name: '月经记录',
            type: 'scatter',
            data: menstrualData,
            symbol: 'rect',
            symbolSize: [15, 8],
            itemStyle: {
              color: '#ff4757'
            },
            label: {
              show: true,
              position: 'bottom',
              formatter: '🩸',
              fontSize: 12
            }
          },
          {
            name: '同房记录',
            type: 'scatter',
            data: intercourseData,
            symbol: 'diamond',
            symbolSize: 12,
            itemStyle: {
              color: '#5352ed'
            },
            label: {
              show: true,
              position: 'top',
              formatter: '💕',
              fontSize: 12
            }
          }
        ],
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(0,0,0,0.8)',
          textStyle: {
            color: '#fff',
            fontSize: 12
          },
          formatter: function(params) {
            let result = params[0].name + '<br/>';
            params.forEach(param => {
              if (param.seriesName === '基础体温' && param.value[1]) {
                result += `🌡️ ${param.seriesName}: ${param.value[1].toFixed(1)}°C<br/>`;
              } else if (param.seriesName === '月经记录') {
                result += `🩸 ${param.seriesName}<br/>`;
              } else if (param.seriesName === '同房记录') {
                result += `💕 ${param.seriesName}<br/>`;
              }
            });
            return result;
          }
        }
      };

      this.chart.setOption(option);
    },

    // 图表点击事件
    onChartClick(e) {
      this.triggerEvent('chartClick', e);
    }
  }
});