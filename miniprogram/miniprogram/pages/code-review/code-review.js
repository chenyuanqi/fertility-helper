/**
 * 代码审查页面
 * 显示代码审查结果和改进建议
 */

const MiniProgramCodeReview = require('../../tests/runCodeReview');

Page({
  data: {
    // 审查状态
    reviewStatus: 'ready', // ready, running, completed, failed
    currentStep: '',
    progress: 0,
    
    // 审查结果
    reviewResults: null,
    summary: null,
    
    // 显示控制
    showDetails: false,
    activeTab: 'overview', // overview, issues, recommendations, files
    
    // 问题列表
    issues: [],
    filteredIssues: [],
    selectedSeverity: 'all',
    
    // 统计数据
    statistics: null,
    
    // 改进建议
    recommendations: []
  },

  onLoad() {
    console.log('代码审查页面加载');
    this.codeReview = new MiniProgramCodeReview();
    this.loadReviewData();
  },

  /**
   * 加载审查数据
   */
  async loadReviewData() {
    // 检查是否有缓存的审查结果
    try {
      const cachedResults = wx.getStorageSync('code_review_results');
      if (cachedResults && this.isRecentResult(cachedResults.timestamp)) {
        this.displayResults(cachedResults);
        return;
      }
    } catch (error) {
      console.log('没有缓存的审查结果');
    }
    
    // 显示开始审查的提示
    this.setData({
      reviewStatus: 'ready'
    });
  },

  /**
   * 检查结果是否是最近的
   */
  isRecentResult(timestamp) {
    const now = new Date().getTime();
    const resultTime = new Date(timestamp).getTime();
    const hoursDiff = (now - resultTime) / (1000 * 60 * 60);
    return hoursDiff < 24; // 24小时内的结果认为是最近的
  },

  /**
   * 开始代码审查
   */
  async startReview() {
    this.setData({
      reviewStatus: 'running',
      progress: 0,
      currentStep: '初始化审查...'
    });

    try {
      // 模拟审查步骤
      const steps = [
        '检查文件结构...',
        '分析JavaScript代码...',
        '检查模板文件...',
        '审查样式文件...',
        '验证配置文件...',
        '评估性能指标...',
        '检查安全性...',
        '生成审查报告...'
      ];

      for (let i = 0; i < steps.length; i++) {
        this.setData({
          currentStep: steps[i],
          progress: Math.round(((i + 1) / steps.length) * 100)
        });
        
        // 模拟处理时间
        await this.delay(500);
      }

      // 执行实际的代码审查
      const results = await this.codeReview.executeReview();
      
      if (results.success) {
        // 缓存结果
        wx.setStorageSync('code_review_results', results);
        
        this.displayResults(results);
        
        wx.showToast({
          title: '审查完成',
          icon: 'success'
        });
      } else {
        throw new Error(results.error);
      }

    } catch (error) {
      console.error('代码审查失败:', error);
      
      this.setData({
        reviewStatus: 'failed'
      });
      
      wx.showModal({
        title: '审查失败',
        content: `代码审查过程中出现错误: ${error.message}`,
        showCancel: false
      });
    }
  },

  /**
   * 显示审查结果
   */
  displayResults(results) {
    const { summary, detailedReport } = results;
    
    this.setData({
      reviewStatus: 'completed',
      reviewResults: results,
      summary: summary,
      statistics: detailedReport.fileStatistics,
      issues: detailedReport.issueAnalysis.topIssues,
      filteredIssues: detailedReport.issueAnalysis.topIssues,
      recommendations: detailedReport.improvements
    });
  },

  /**
   * 延迟函数
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * 切换详情显示
   */
  toggleDetails() {
    this.setData({
      showDetails: !this.data.showDetails
    });
  },

  /**
   * 切换标签页
   */
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  /**
   * 筛选问题
   */
  filterIssues(e) {
    const severity = e.currentTarget.dataset.severity;
    const { issues } = this.data;
    
    let filteredIssues = issues;
    if (severity !== 'all') {
      filteredIssues = issues.filter(issue => issue.severity === severity);
    }
    
    this.setData({
      selectedSeverity: severity,
      filteredIssues: filteredIssues
    });
  },

  /**
   * 查看问题详情
   */
  viewIssueDetail(e) {
    const index = e.currentTarget.dataset.index;
    const issue = this.data.filteredIssues[index];
    
    wx.showModal({
      title: `${issue.severity}问题`,
      content: `类别: ${issue.category}\n描述: ${issue.description}\n文件: ${issue.file}${issue.line ? `\n行号: ${issue.line}` : ''}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 分享审查报告
   */
  shareReport() {
    if (!this.data.reviewResults) {
      wx.showToast({
        title: '没有审查结果',
        icon: 'none'
      });
      return;
    }

    const textReport = this.codeReview.generateTextReport();
    
    wx.showActionSheet({
      itemList: ['复制到剪贴板', '生成文件分享'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 复制到剪贴板
          wx.setClipboardData({
            data: textReport,
            success: () => {
              wx.showToast({
                title: '已复制到剪贴板',
                icon: 'success'
              });
            }
          });
        } else if (res.tapIndex === 1) {
          // 生成文件分享
          this.generateReportFile(textReport);
        }
      }
    });
  },

  /**
   * 生成报告文件
   */
  generateReportFile(content) {
    const fileName = `代码审查报告_${new Date().toISOString().split('T')[0]}.md`;
    
    // 在小程序中，我们可以通过分享功能来"导出"文件
    wx.showModal({
      title: '报告生成',
      content: `报告已生成，文件名: ${fileName}\n\n内容已复制到剪贴板，您可以粘贴到其他应用中保存。`,
      showCancel: false,
      success: () => {
        wx.setClipboardData({
          data: content
        });
      }
    });
  },

  /**
   * 重新审查
   */
  restartReview() {
    // 清除缓存
    wx.removeStorageSync('code_review_results');
    
    // 重置状态
    this.setData({
      reviewStatus: 'ready',
      reviewResults: null,
      summary: null,
      showDetails: false,
      activeTab: 'overview',
      issues: [],
      filteredIssues: [],
      selectedSeverity: 'all',
      statistics: null,
      recommendations: []
    });
  },

  /**
   * 获取评分颜色
   */
  getScoreColor(score) {
    if (score >= 90) return '#4CAF50';
    if (score >= 80) return '#FF9800';
    if (score >= 70) return '#FF5722';
    return '#F44336';
  },

  /**
   * 获取等级描述
   */
  getGradeDescription(grade) {
    const descriptions = {
      'A': '优秀',
      'B': '良好', 
      'C': '一般',
      'D': '需改进'
    };
    return descriptions[grade] || '未知';
  },

  /**
   * 获取严重程度颜色
   */
  getSeverityColor(severity) {
    const colors = {
      '严重': '#F44336',
      '重要': '#FF9800',
      '一般': '#2196F3',
      '建议': '#4CAF50'
    };
    return colors[severity] || '#666';
  },

  /**
   * 页面分享
   */
  onShareAppMessage() {
    return {
      title: '代码审查报告',
      path: '/pages/code-review/code-review'
    };
  }
});