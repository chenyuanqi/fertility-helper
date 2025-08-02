/**
 * 代码审查执行脚本
 * 在小程序环境中运行代码审查
 */

const CodeReviewChecker = require('./codeReviewChecker');

class MiniProgramCodeReview {
  constructor() {
    this.checker = new CodeReviewChecker();
    this.reviewResults = null;
  }

  /**
   * 执行代码审查
   */
  async executeReview() {
    console.log('🚀 开始执行代码审查...');
    
    try {
      // 执行完整的代码审查
      this.reviewResults = await this.checker.runFullReview();
      
      // 生成详细报告
      const detailedReport = this.generateDetailedReport();
      
      console.log('✅ 代码审查完成!');
      return {
        success: true,
        summary: this.reviewResults.summary,
        detailedReport: detailedReport,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ 代码审查失败:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 生成详细报告
   */
  generateDetailedReport() {
    if (!this.reviewResults) {
      return null;
    }

    const { summary, statistics, issues, recommendations } = this.reviewResults;

    return {
      // 总体概况
      overview: {
        score: summary.score,
        grade: summary.grade,
        totalFiles: summary.totalFiles,
        totalLines: summary.totalLines,
        totalIssues: summary.totalIssues,
        releaseRecommendation: summary.releaseRecommendation
      },

      // 问题分析
      issueAnalysis: {
        severityBreakdown: statistics.severityStats,
        categoryBreakdown: statistics.categoryStats,
        topIssues: issues.slice(0, 10).map(issue => ({
          severity: issue.severity,
          category: issue.category,
          description: issue.description,
          file: issue.filePath,
          line: issue.lineNumber
        }))
      },

      // 文件统计
      fileStatistics: {
        totalFiles: statistics.fileStats.totalFiles,
        jsFiles: statistics.fileStats.jsFiles,
        wxmlFiles: statistics.fileStats.wxmlFiles,
        wxssFiles: statistics.fileStats.wxssFiles,
        jsonFiles: statistics.fileStats.jsonFiles,
        totalLines: statistics.fileStats.totalLines
      },

      // 改进建议
      improvements: recommendations.map(rec => ({
        priority: rec.priority,
        category: rec.category,
        description: rec.description,
        action: rec.action
      })),

      // 质量评估
      qualityAssessment: this.generateQualityAssessment(summary, statistics),

      // 发布准备状态
      releaseReadiness: this.assessReleaseReadiness(summary, statistics)
    };
  }

  /**
   * 生成质量评估
   */
  generateQualityAssessment(summary, statistics) {
    const { score } = summary;
    const { severityStats } = statistics;

    let codeQuality = 'excellent';
    if (score < 70) codeQuality = 'poor';
    else if (score < 80) codeQuality = 'fair';
    else if (score < 90) codeQuality = 'good';

    let maintainability = 'high';
    if (severityStats['严重'] > 0 || severityStats['重要'] > 5) {
      maintainability = 'low';
    } else if (severityStats['重要'] > 2) {
      maintainability = 'medium';
    }

    let security = 'secure';
    const securityIssues = this.reviewResults.issues.filter(
      issue => issue.category === '安全性'
    ).length;
    if (securityIssues > 0) {
      security = securityIssues > 2 ? 'vulnerable' : 'needs_attention';
    }

    return {
      overall: codeQuality,
      maintainability: maintainability,
      security: security,
      performance: this.assessPerformance(statistics),
      testability: this.assessTestability(statistics)
    };
  }

  /**
   * 评估性能
   */
  assessPerformance(statistics) {
    const performanceIssues = this.reviewResults.issues.filter(
      issue => issue.category === '性能'
    ).length;

    if (performanceIssues === 0) return 'excellent';
    if (performanceIssues <= 2) return 'good';
    if (performanceIssues <= 5) return 'fair';
    return 'poor';
  }

  /**
   * 评估可测试性
   */
  assessTestability(statistics) {
    const errorHandlingIssues = this.reviewResults.issues.filter(
      issue => issue.category === '错误处理'
    ).length;

    const codeQualityIssues = this.reviewResults.issues.filter(
      issue => issue.category === '代码质量'
    ).length;

    const totalIssues = errorHandlingIssues + codeQualityIssues;

    if (totalIssues === 0) return 'high';
    if (totalIssues <= 3) return 'medium';
    return 'low';
  }

  /**
   * 评估发布准备状态
   */
  assessReleaseReadiness(summary, statistics) {
    const { score } = summary;
    const { severityStats } = statistics;

    let readiness = 'ready';
    let blockers = [];
    let warnings = [];
    let recommendations = [];

    // 检查阻塞问题
    if (severityStats['严重'] > 0) {
      readiness = 'blocked';
      blockers.push(`${severityStats['严重']} 个严重问题需要修复`);
    }

    // 检查警告
    if (severityStats['重要'] > 5) {
      if (readiness === 'ready') readiness = 'caution';
      warnings.push(`${severityStats['重要']} 个重要问题建议修复`);
    }

    // 检查建议
    if (score < 80) {
      recommendations.push('建议提升代码质量评分至80分以上');
    }

    if (severityStats['一般'] > 10) {
      recommendations.push('建议修复一般性问题以提升代码质量');
    }

    return {
      status: readiness,
      score: score,
      blockers: blockers,
      warnings: warnings,
      recommendations: recommendations,
      estimatedFixTime: this.estimateFixTime(severityStats)
    };
  }

  /**
   * 估算修复时间
   */
  estimateFixTime(severityStats) {
    let hours = 0;
    
    hours += severityStats['严重'] * 4;  // 严重问题平均4小时
    hours += severityStats['重要'] * 2;  // 重要问题平均2小时
    hours += severityStats['一般'] * 0.5; // 一般问题平均0.5小时
    hours += severityStats['建议'] * 0.25; // 建议平均0.25小时

    if (hours < 1) return '< 1小时';
    if (hours < 8) return `约 ${Math.ceil(hours)} 小时`;
    
    const days = Math.ceil(hours / 8);
    return `约 ${days} 个工作日`;
  }

  /**
   * 生成文本报告
   */
  generateTextReport() {
    if (!this.reviewResults) {
      return '代码审查尚未执行';
    }

    const { summary, statistics, recommendations } = this.reviewResults;
    const report = [];

    report.push('# 代码审查报告');
    report.push('');
    report.push(`**审查时间**: ${new Date().toLocaleString()}`);
    report.push(`**总体评分**: ${summary.score}/100 (${summary.grade}级)`);
    report.push(`**发布建议**: ${summary.releaseRecommendation}`);
    report.push('');

    report.push('## 📊 统计概览');
    report.push(`- 总文件数: ${summary.totalFiles}`);
    report.push(`- 总代码行数: ${summary.totalLines}`);
    report.push(`- 发现问题: ${summary.totalIssues} 个`);
    report.push('');

    report.push('## 🔍 问题分布');
    report.push(`- 严重问题: ${statistics.severityStats['严重']} 个`);
    report.push(`- 重要问题: ${statistics.severityStats['重要']} 个`);
    report.push(`- 一般问题: ${statistics.severityStats['一般']} 个`);
    report.push(`- 建议优化: ${statistics.severityStats['建议']} 个`);
    report.push('');

    if (recommendations.length > 0) {
      report.push('## 💡 改进建议');
      recommendations.forEach((rec, index) => {
        report.push(`${index + 1}. **[${rec.priority}] ${rec.category}**`);
        report.push(`   ${rec.description}`);
        report.push(`   *建议: ${rec.action}*`);
        report.push('');
      });
    }

    report.push('## 📋 发布检查清单');
    report.push('- [ ] 修复所有严重问题');
    report.push('- [ ] 修复重要的性能问题');
    report.push('- [ ] 完善错误处理机制');
    report.push('- [ ] 优化代码注释和文档');
    report.push('- [ ] 进行最终测试验证');

    return report.join('\n');
  }

  /**
   * 获取审查结果摘要
   */
  getSummary() {
    if (!this.reviewResults) {
      return null;
    }

    return {
      score: this.reviewResults.summary.score,
      grade: this.reviewResults.summary.grade,
      totalIssues: this.reviewResults.summary.totalIssues,
      releaseRecommendation: this.reviewResults.summary.releaseRecommendation,
      criticalIssues: this.reviewResults.statistics.severityStats['严重'],
      importantIssues: this.reviewResults.statistics.severityStats['重要']
    };
  }
}

module.exports = MiniProgramCodeReview;