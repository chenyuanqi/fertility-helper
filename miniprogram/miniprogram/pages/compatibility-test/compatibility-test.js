/**
 * 兼容性测试页面
 * 用于在小程序中运行兼容性测试
 */

const CompatibilityTestRunner = require('../../tests/runCompatibilityTests');
const compatibilityChecker = require('../../utils/compatibilityChecker');

Page({
  data: {
    testStatus: 'ready', // ready, running, completed, failed
    testResults: null,
    compatibilityReport: null,
    currentTest: '',
    progress: 0,
    startTime: null,
    endTime: null
  },

  onLoad: function() {
    console.log('兼容性测试页面加载');
    this.initPage();
  },

  /**
   * 初始化页面
   */
  async initPage() {
    try {
      // 获取基础兼容性信息
      const basicInfo = await compatibilityChecker.runFullCompatibilityCheck();
      this.setData({
        compatibilityReport: basicInfo
      });
    } catch (error) {
      console.error('获取兼容性信息失败:', error);
    }
  },

  /**
   * 开始兼容性测试
   */
  async startCompatibilityTest() {
    if (this.data.testStatus === 'running') {
      return;
    }

    this.setData({
      testStatus: 'running',
      testResults: null,
      currentTest: '准备测试环境...',
      progress: 0,
      startTime: new Date()
    });

    try {
      const testRunner = new CompatibilityTestRunner();
      
      // 模拟测试进度更新
      this.simulateTestProgress();
      
      // 运行所有测试
      const results = await testRunner.runAllTests();
      
      this.setData({
        testStatus: 'completed',
        testResults: results,
        currentTest: '测试完成',
        progress: 100,
        endTime: new Date()
      });

      // 显示测试完成提示
      wx.showToast({
        title: results.success ? '测试通过' : '发现问题',
        icon: results.success ? 'success' : 'none',
        duration: 2000
      });

    } catch (error) {
      console.error('兼容性测试失败:', error);
      
      this.setData({
        testStatus: 'failed',
        currentTest: `测试失败: ${error.message}`,
        endTime: new Date()
      });

      wx.showToast({
        title: '测试失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 模拟测试进度
   */
  simulateTestProgress() {
    const testSteps = [
      '检查系统兼容性...',
      '测试API可用性...',
      '验证功能兼容性...',
      '检测性能表现...',
      '测试视觉适配...',
      '验证交互响应...',
      '生成测试报告...'
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < testSteps.length && this.data.testStatus === 'running') {
        this.setData({
          currentTest: testSteps[currentStep],
          progress: Math.round(((currentStep + 1) / testSteps.length) * 90) // 90% 为测试进度，10% 为报告生成
        });
        currentStep++;
      } else {
        clearInterval(progressInterval);
      }
    }, 800);
  },

  /**
   * 查看详细报告
   */
  viewDetailedReport() {
    if (!this.data.testResults) {
      wx.showToast({
        title: '暂无测试结果',
        icon: 'none'
      });
      return;
    }

    // 生成报告文本
    const report = this.generateReportText();
    
    // 复制到剪贴板
    wx.setClipboardData({
      data: report,
      success: () => {
        wx.showToast({
          title: '报告已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showModal({
          title: '测试报告',
          content: report.substring(0, 500) + '...',
          showCancel: false
        });
      }
    });
  },

  /**
   * 生成报告文本
   */
  generateReportText() {
    const { testResults, compatibilityReport } = this.data;
    
    let report = '# 备小孕小程序兼容性测试报告\n\n';
    report += `测试时间: ${new Date().toLocaleString()}\n`;
    report += `测试设备: ${compatibilityReport?.systemInfo?.model || 'Unknown'}\n`;
    report += `操作系统: ${compatibilityReport?.systemInfo?.system || 'Unknown'}\n`;
    report += `微信版本: ${compatibilityReport?.systemInfo?.version || 'Unknown'}\n`;
    report += `基础库版本: ${compatibilityReport?.systemInfo?.SDKVersion || 'Unknown'}\n\n`;

    if (testResults) {
      report += '## 测试结果概览\n';
      report += `总体评分: ${testResults.summary.overallGrade} (${testResults.summary.successRate}%)\n`;
      report += `测试总数: ${testResults.summary.totalTests}\n`;
      report += `通过测试: ${testResults.summary.passedTests}\n`;
      report += `失败测试: ${testResults.summary.failedTests}\n`;
      report += `测试耗时: ${testResults.summary.duration}\n\n`;

      report += '## 分类测试结果\n';
      testResults.categoryStats.forEach(category => {
        report += `### ${this.getCategoryName(category.category)}\n`;
        report += `通过: ${category.passed}/${category.total}\n`;
        if (category.failed > 0) {
          report += `失败: ${category.failed}\n`;
        }
        report += '\n';
      });

      if (testResults.summary.failedTests > 0) {
        report += '## 失败测试详情\n';
        const failedTests = testResults.detailedResults.filter(r => r.status === 'failed');
        failedTests.forEach(test => {
          report += `- ${test.name}: ${test.error}\n`;
        });
        report += '\n';
      }
    }

    if (compatibilityReport?.overallCompatibility) {
      report += '## 兼容性评估\n';
      report += `兼容性评分: ${compatibilityReport.overallCompatibility.score}/100\n`;
      report += `兼容性等级: ${compatibilityReport.overallCompatibility.level}\n`;
      
      if (compatibilityReport.overallCompatibility.issues.length > 0) {
        report += '\n### 发现的问题\n';
        compatibilityReport.overallCompatibility.issues.forEach(issue => {
          report += `- ${issue}\n`;
        });
      }

      if (compatibilityReport.overallCompatibility.recommendations.length > 0) {
        report += '\n### 改进建议\n';
        compatibilityReport.overallCompatibility.recommendations.forEach(rec => {
          report += `- ${rec}\n`;
        });
      }
    }

    return report;
  },

  /**
   * 获取分类名称
   */
  getCategoryName(category) {
    const names = {
      basic: '基础兼容性',
      functional: '功能兼容性',
      performance: '性能兼容性',
      visual: '视觉兼容性',
      interaction: '交互兼容性'
    };
    return names[category] || category;
  },

  /**
   * 重新测试
   */
  retryTest() {
    this.setData({
      testStatus: 'ready',
      testResults: null,
      currentTest: '',
      progress: 0
    });
  },

  /**
   * 分享测试结果
   */
  shareTestResults() {
    if (!this.data.testResults) {
      wx.showToast({
        title: '暂无测试结果',
        icon: 'none'
      });
      return;
    }

    const report = this.generateReportText();
    
    wx.showActionSheet({
      itemList: ['复制到剪贴板', '保存为文件'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制到剪贴板
          wx.setClipboardData({
            data: report,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        } else if (res.tapIndex === 1) {
          // 保存为文件（模拟）
          wx.showToast({
            title: '报告已生成',
            icon: 'success'
          });
        }
      }
    });
  }
});