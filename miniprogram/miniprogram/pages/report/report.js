// pages/report/report.js
const reportGenerator = require('../../utils/reportGenerator');

Page({
  data: {
    reportContent: '',
    reportType: 'text',
    loading: false,
    hasReport: false
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
      const report = await reportGenerator.generateCycleReport({
        cycleCount: 3,
        format: this.data.reportType
      });
      
      this.setData({
        reportContent: this.data.reportType === 'text' ? report : JSON.stringify(report, null, 2),
        hasReport: true,
        loading: false
      });
      
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
    try {
      const fs = wx.getFileSystemManager();
      const fileName = `备小孕周期报告-${new Date().toISOString().split('T')[0]}.txt`;
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
            fail: () => {
              // 分享失败，复制到剪贴板
              this.copyReport();
            }
          });
        },
        fail: () => {
          // 文件保存失败，直接复制
          this.copyReport();
        }
      });
    } catch (error) {
      console.error('分享报告失败:', error);
      this.copyReport();
    }
  }
});