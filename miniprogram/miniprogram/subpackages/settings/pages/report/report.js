// pages/report/report.js
const reportGenerator = require('../../../../utils/reportGenerator');

Page({
  data: {
    reportContent: '',
    reportType: 'text',
    loading: false,
    hasReport: false,
    visual: null
  },

  onLoad(options) {
    // 如果有传入的报告类型，直接生成
    if (options.type) {
      this.setData({ reportType: options.type });
      this.generateReport();
    }
  },

  // 生成报告
  async generateReport() {
    this.setData({ loading: true });
    
    try {
      // visual 模式：拿 json，提炼为卡片数据
      if (this.data.reportType === 'visual') {
        const jsonReport = await reportGenerator.generateCycleReport({ cycleCount: 5, format: 'json' });
        const visual = this.buildVisualFromJson(jsonReport);
        this.setData({ visual, hasReport: true, loading: false });
      } else {
        const report = await reportGenerator.generateCycleReport({
          cycleCount: 3,
          format: this.data.reportType
        });
        this.setData({
          reportContent: this.data.reportType === 'text' ? report : JSON.stringify(report, null, 2),
          hasReport: true,
          loading: false
        });
      }
      // 生成图表（visual）
      if (this.data.reportType === 'visual') {
        setTimeout(() => { this.drawCharts(); }, 50);
      }
      
    } catch (error) {
      console.error('生成报告失败:', error);
      this.setData({ loading: false });
      
      wx.showModal({
        title: '生成失败',
        content: error.message || '报告生成失败，请检查是否有足够的数据记录',
        showCancel: false
      });
    }
  },

  drawCharts() {
    try {
      const charts = this.data.visual && this.data.visual.charts ? this.data.visual.charts : {};
      const tempData = charts.temperatureData || [];
      const barData = (this.data.visual && this.data.visual.cards && this.data.visual.cards[3] && this.data.visual.cards[3].items) ? this.data.visual.cards[3].items : [];
      // 折线：体温
      const query = wx.createSelectorQuery();
      query.select('#chartCanvas').fields({ node: true, size: true }).select('#barCanvas').fields({ node: true, size: true }).exec((res) => {
        const lineCanvasInfo = res && res[0];
        const barCanvasInfo = res && res[1];
        if (lineCanvasInfo && lineCanvasInfo.node) {
          this.drawTemperatureLine(lineCanvasInfo.node, lineCanvasInfo.width, lineCanvasInfo.height, tempData);
        }
        if (barCanvasInfo && barCanvasInfo.node) {
          this.drawCycleBar(barCanvasInfo.node, barCanvasInfo.width, barCanvasInfo.height, barData);
        }
      });
    } catch (e) {
      console.warn('绘制图表失败', e);
    }
  },

  drawTemperatureLine(canvas, width, height, tempData) {
    const ctx = canvas.getContext('2d');
    const dpr = wx.getSystemInfoSync().pixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    // 轴
    const padding = 28; const x0 = padding; const y0 = height - padding; const x1 = width - padding; const y1 = padding;
    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
    if (!tempData.length) return;
    const temps = tempData.map(t => t.temperature);
    const minT = Math.min.apply(null, temps);
    const maxT = Math.max.apply(null, temps);
    const range = Math.max(0.5, maxT - minT);
    const toX = (i) => x0 + (i * (x1 - x0)) / Math.max(1, tempData.length - 1);
    const toY = (v) => y0 - ((v - minT) * (y0 - y1)) / range;
    // 网格
    ctx.strokeStyle = '#f3f4f6';
    for (let i = 1; i <= 4; i++) { const y = y1 + (i * (y0 - y1)) / 5; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
    // 折线
    ctx.strokeStyle = '#ff6b9d'; ctx.lineWidth = 2; ctx.beginPath(); tempData.forEach((p, i) => { const x = toX(i); const y = toY(p.temperature); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke();
    // 点
    ctx.fillStyle = '#ff6b9d'; tempData.forEach((p, i) => { const x = toX(i); const y = toY(p.temperature); ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); });
    // y 轴刻度
    ctx.fillStyle = '#9ca3af'; ctx.font = '10px sans-serif';
    const steps = 4; for (let i = 0; i <= steps; i++) { const val = (minT + (i * range) / steps).toFixed(1); const y = toY(Number(val)); ctx.fillText(val, 2, y + 3); }
  },

  drawCycleBar(canvas, width, height, cycleItems) {
    // 从“周期分析”卡片中提取范围与平均长度，如果缺少详细明细，则绘制简化条
    const ctx = canvas.getContext('2d');
    const dpr = wx.getSystemInfoSync().pixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr; ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const padding = 28; const x0 = padding; const y0 = height - padding; const x1 = width - padding; const y1 = padding;
    ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    // 简化：画三根柱（最小/平均/最大）若可推断
    let min = null, avg = null, max = null;
    try {
      const rangeItem = cycleItems.find(i => i.label === '范围');
      if (rangeItem && /^(\d+)-(\d+)天$/.test(rangeItem.value)) {
        const m = rangeItem.value.match(/(\d+)-(\d+)天/);
        min = parseInt(m[1], 10); max = parseInt(m[2], 10);
      }
      const avgItem = cycleItems.find(i => i.label === '平均长度');
      if (avgItem && /(\d+) 天/.test(avgItem.value)) { avg = parseInt(avgItem.value, 10); }
    } catch (_) {}
    const bars = [];
    if (min != null) bars.push({ label: '最短', value: min, color: '#93c5fd' });
    if (avg != null) bars.push({ label: '平均', value: avg, color: '#60a5fa' });
    if (max != null) bars.push({ label: '最长', value: max, color: '#3b82f6' });
    if (!bars.length) return;
    const maxVal = Math.max.apply(null, bars.map(b => b.value));
    const bw = 28; const gap = 22; const totalW = bars.length * bw + (bars.length - 1) * gap; const startX = x0 + ((x1 - x0) - totalW) / 2;
    ctx.font = '10px sans-serif'; ctx.fillStyle = '#9ca3af';
    bars.forEach((b, i) => {
      const h = Math.max(4, (b.value / maxVal) * (y0 - y1));
      const x = startX + i * (bw + gap); const y = y0 - h; 
      ctx.fillStyle = b.color; ctx.fillRect(x, y, bw, h);
      ctx.fillStyle = '#374151'; ctx.fillText(String(b.value), x + bw / 2 - 8, y - 6);
      ctx.fillStyle = '#6b7280'; ctx.fillText(b.label, x + bw / 2 - 10, y0 + 12);
    });
  },

  // 从 json 报告构建可视化卡片数据
  buildVisualFromJson(jsonReport) {
    const summary = jsonReport.summary || {};
    const temp = jsonReport.temperatureAnalysis || {};
    const fertility = jsonReport.fertilityAnalysis || {};
    const cycles = jsonReport.cycleAnalysis || {};
    const quality = jsonReport.dataQuality || {};
    const charts = jsonReport.charts || {};
    return {
      period: jsonReport.reportPeriod || '',
      charts,
      cards: [
        {
          title: '概览',
          items: [
            { label: '记录天数', value: String(summary.totalRecordDays || 0) },
            { label: '平均周期', value: `${summary.averageCycleLength || '-'} 天` },
            { label: '测温记录率', value: `${summary.temperatureRecordRate || 0}%` },
            { label: '平均体温', value: `${summary.averageTemperature || '-'} °C` },
            { label: '月经天数', value: String(summary.menstrualDays || 0) },
            { label: '同房频率(每月)', value: String(summary.intercourseFrequency || 0) }
          ]
        },
        {
          title: '体温分析',
          items: [
            { label: '测温率', value: `${temp.recordRate || 0}%` },
            { label: '平均体温', value: `${temp.averageTemperature || '-'} °C` },
            { label: '范围', value: temp.temperatureRange || '-' },
            { label: '双相特征', value: temp.biphasicPattern || '-' },
            { label: '趋势', value: temp.temperatureTrend || '-' },
            { label: '质量', value: temp.qualityAssessment || '-' }
          ]
        },
        {
          title: '生育力',
          items: [
            { label: '当前状态', value: fertility.currentStatus || '-' },
            { label: '置信度', value: fertility.confidence || '-' },
            { label: '下次排卵日', value: fertility.nextOvulation || '-' },
            { label: '易孕窗口', value: fertility.fertilityWindow || '-' }
          ],
          recommendations: fertility.recommendations || []
        },
        {
          title: '周期分析',
          items: [
            { label: '平均长度', value: cycles.averageLength ? `${cycles.averageLength} 天` : '-' },
            { label: '范围', value: cycles.lengthRange || '-' },
            { label: '波动', value: typeof cycles.variability === 'number' ? `${cycles.variability} 天` : '-' },
            { label: '规律性', value: cycles.regularityAssessment || '-' }
          ]
        },
        {
          title: '数据质量',
          items: [
            { label: '总体评价', value: quality.overall || quality.summary || '—' }
          ]
        }
      ]
    };
  },

  // 切换报告类型
  switchReportType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ reportType: type });
    
    if (this.data.hasReport) {
      this.generateReport();
    }
  },

  // 复制报告
  copyReport() {
    wx.setClipboardData({
      data: this.data.reportContent,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'error'
        });
      }
    });
  },

  // 分享报告
  shareReport() {
    const that = this;
    
    wx.showActionSheet({
      itemList: ['分享文件', '复制到剪贴板', '保存到相册'],
      success: function(res) {
        switch(res.tapIndex) {
          case 0:
            that.shareAsFile();
            break;
          case 1:
            that.copyReport();
            break;
          case 2:
            that.saveToAlbum();
            break;
        }
      }
    });
  },

  // 分享为文件
  shareAsFile() {
    try {
      const fs = wx.getFileSystemManager();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `备小孕周期报告-${timestamp}.txt`;
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      
      fs.writeFile({
        filePath,
        data: this.data.reportContent,
        encoding: 'utf8',
        success: () => {
          wx.shareFileMessage({
            filePath: filePath,
            fileName: fileName,
            success: () => {
              wx.showToast({
                title: '分享成功',
                icon: 'success'
              });
            },
            fail: (err) => {
              console.error('文件分享失败:', err);
              wx.showModal({
                title: '分享失败',
                content: '文件分享失败，已为您复制到剪贴板',
                showCancel: false,
                success: () => {
                  this.copyReport();
                }
              });
            }
          });
        },
        fail: (err) => {
          console.error('文件保存失败:', err);
          wx.showModal({
            title: '保存失败',
            content: '文件保存失败，已为您复制到剪贴板',
            showCancel: false,
            success: () => {
              this.copyReport();
            }
          });
        }
      });
    } catch (error) {
      console.error('分享报告失败:', error);
      wx.showModal({
        title: '分享失败',
        content: '分享功能异常，已为您复制到剪贴板',
        showCancel: false,
        success: () => {
          this.copyReport();
        }
      });
    }
  },

  // 保存到相册（生成图片）
  saveToAlbum() {
    wx.showLoading({
      title: '正在生成图片...'
    });

    // 创建canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#reportCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          this.generateReportImage(res[0]);
        } else {
          // 如果没有canvas，使用简化方式
          this.generateSimpleImage();
        }
      });
  },

  // 生成报告图片
  generateReportImage(canvasInfo) {
    const canvas = canvasInfo.node;
    const ctx = canvas.getContext('2d');
    
    // 设置canvas尺寸
    const dpr = wx.getSystemInfoSync().pixelRatio;
    canvas.width = canvasInfo.width * dpr;
    canvas.height = canvasInfo.height * dpr;
    ctx.scale(dpr, dpr);
    
    // 设置背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasInfo.width, canvasInfo.height);
    
    // 设置文字样式
    ctx.fillStyle = '#333333';
    ctx.font = '14px sans-serif';
    
    // 绘制标题
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('备小孕 - 周期分析报告', 20, 40);
    
    // 绘制报告内容（简化版）
    ctx.font = '12px sans-serif';
    const lines = this.data.reportContent.split('\n').slice(0, 30); // 只显示前30行
    let y = 80;
    
    lines.forEach((line, index) => {
      if (y < canvasInfo.height - 40) {
        ctx.fillText(line.substring(0, 50), 20, y); // 限制每行字符数
        y += 20;
      }
    });
    
    // 添加底部信息
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#999999';
    ctx.fillText(`生成时间: ${new Date().toLocaleString()}`, 20, canvasInfo.height - 20);
    
    // 保存图片
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: (res) => {
        wx.hideLoading();
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.showToast({
              title: '已保存到相册',
              icon: 'success'
            });
          },
          fail: () => {
            wx.showModal({
              title: '保存失败',
              content: '保存到相册失败，请检查相册权限',
              showCancel: false
            });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showModal({
          title: '生成失败',
          content: '图片生成失败，已为您复制到剪贴板',
          showCancel: false,
          success: () => {
            this.copyReport();
          }
        });
      }
    });
  },

  // 生成简化图片（当没有canvas时）
  generateSimpleImage() {
    wx.hideLoading();
    wx.showModal({
      title: '功能提示',
      content: '图片保存功能暂不可用，已为您复制报告内容到剪贴板',
      showCancel: false,
      success: () => {
        this.copyReport();
      }
    });
  }
});