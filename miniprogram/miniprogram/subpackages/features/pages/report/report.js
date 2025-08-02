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