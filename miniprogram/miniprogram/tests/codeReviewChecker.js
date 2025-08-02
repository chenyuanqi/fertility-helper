/**
 * 代码审查自动化检查工具
 * 自动检查代码质量、性能、安全性等问题
 */

const fs = require('fs');
const path = require('path');

class CodeReviewChecker {
  constructor() {
    this.issues = [];
    this.stats = {
      totalFiles: 0,
      totalLines: 0,
      jsFiles: 0,
      wxmlFiles: 0,
      wxssFiles: 0,
      jsonFiles: 0
    };
  }

  /**
   * 执行完整的代码审查
   */
  async runFullReview() {
    console.log('🔍 开始代码审查...');
    
    try {
      // 1. 文件结构检查
      await this.checkFileStructure();
      
      // 2. JavaScript代码检查
      await this.checkJavaScriptCode();
      
      // 3. 模板文件检查
      await this.checkTemplateFiles();
      
      // 4. 样式文件检查
      await this.checkStyleFiles();
      
      // 5. 配置文件检查
      await this.checkConfigFiles();
      
      // 6. 性能检查
      await this.checkPerformance();
      
      // 7. 安全性检查
      await this.checkSecurity();
      
      // 生成审查报告
      const report = this.generateReport();
      console.log('✅ 代码审查完成!');
      
      return report;
      
    } catch (error) {
      console.error('❌ 代码审查失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查文件结构
   */
  async checkFileStructure() {
    console.log('📁 检查文件结构...');
    
    const requiredDirs = [
      'pages',
      'components', 
      'utils',
      'tests'
    ];
    
    const requiredFiles = [
      'app.js',
      'app.json',
      'app.wxss'
    ];
    
    // 检查必需目录
    for (const dir of requiredDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        this.addIssue('严重', '文件结构', `缺少必需目录: ${dir}`, dirPath);
      }
    }
    
    // 检查必需文件
    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        this.addIssue('严重', '文件结构', `缺少必需文件: ${file}`, filePath);
      }
    }
    
    // 统计文件信息
    this.collectFileStats();
  }

  /**
   * 检查JavaScript代码
   */
  async checkJavaScriptCode() {
    console.log('📝 检查JavaScript代码...');
    
    const jsFiles = this.findFiles('.js');
    
    for (const filePath of jsFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查代码质量
        this.checkCodeQuality(filePath, content);
        
        // 检查函数复杂度
        this.checkFunctionComplexity(filePath, content);
        
        // 检查错误处理
        this.checkErrorHandling(filePath, content);
        
        // 检查性能问题
        this.checkPerformanceIssues(filePath, content);
        
      } catch (error) {
        this.addIssue('重要', 'JavaScript', `文件读取失败: ${error.message}`, filePath);
      }
    }
  }

  /**
   * 检查代码质量
   */
  checkCodeQuality(filePath, content) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 检查长行
      if (line.length > 120) {
        this.addIssue('一般', '代码质量', `行过长 (${line.length} 字符)`, filePath, lineNum);
      }
      
      // 检查TODO注释
      if (line.includes('TODO') || line.includes('FIXME')) {
        this.addIssue('一般', '代码质量', '存在TODO或FIXME注释', filePath, lineNum);
      }
      
      // 检查console.log
      if (line.includes('console.log') && !line.includes('//')) {
        this.addIssue('一般', '代码质量', '存在调试用的console.log', filePath, lineNum);
      }
      
      // 检查硬编码
      if (line.match(/['"][^'"]{20,}['"]/)) {
        this.addIssue('一般', '代码质量', '可能存在硬编码字符串', filePath, lineNum);
      }
    });
  }

  /**
   * 检查函数复杂度
   */
  checkFunctionComplexity(filePath, content) {
    // 简单的函数复杂度检查
    const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g) || [];
    
    functionMatches.forEach(func => {
      const lines = func.split('\n').length;
      if (lines > 50) {
        this.addIssue('重要', '代码质量', `函数过长 (${lines} 行)`, filePath);
      }
      
      // 检查嵌套层级
      const braceCount = (func.match(/\{/g) || []).length;
      if (braceCount > 5) {
        this.addIssue('重要', '代码质量', `函数嵌套过深 (${braceCount} 层)`, filePath);
      }
    });
  }

  /**
   * 检查错误处理
   */
  checkErrorHandling(filePath, content) {
    // 检查try-catch使用
    const tryCount = (content.match(/try\s*\{/g) || []).length;
    const catchCount = (content.match(/catch\s*\(/g) || []).length;
    
    if (tryCount !== catchCount) {
      this.addIssue('重要', '错误处理', 'try-catch不匹配', filePath);
    }
    
    // 检查Promise错误处理
    const promiseCount = (content.match(/\.then\(/g) || []).length;
    const catchPromiseCount = (content.match(/\.catch\(/g) || []).length;
    
    if (promiseCount > 0 && catchPromiseCount === 0) {
      this.addIssue('重要', '错误处理', 'Promise缺少错误处理', filePath);
    }
    
    // 检查wx API错误处理
    const wxApiMatches = content.match(/wx\.\w+\(\{[^}]*\}/g) || [];
    wxApiMatches.forEach(api => {
      if (!api.includes('fail:') && !api.includes('fail(')) {
        this.addIssue('一般', '错误处理', '微信API缺少fail回调', filePath);
      }
    });
  }

  /**
   * 检查性能问题
   */
  checkPerformanceIssues(filePath, content) {
    // 检查频繁的setData调用
    const setDataCount = (content.match(/setData\(/g) || []).length;
    if (setDataCount > 10) {
      this.addIssue('重要', '性能', `setData调用过于频繁 (${setDataCount} 次)`, filePath);
    }
    
    // 检查大数据量处理
    const forLoopMatches = content.match(/for\s*\([^)]*\)\s*\{/g) || [];
    forLoopMatches.forEach(loop => {
      if (loop.includes('length') && !loop.includes('cache')) {
        this.addIssue('一般', '性能', '循环中重复计算length', filePath);
      }
    });
    
    // 检查内存泄漏风险
    if (content.includes('setInterval') && !content.includes('clearInterval')) {
      this.addIssue('重要', '性能', '可能存在内存泄漏 (setInterval未清理)', filePath);
    }
  }

  /**
   * 检查模板文件
   */
  async checkTemplateFiles() {
    console.log('📄 检查模板文件...');
    
    const wxmlFiles = this.findFiles('.wxml');
    
    for (const filePath of wxmlFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查模板结构
        this.checkTemplateStructure(filePath, content);
        
        // 检查数据绑定
        this.checkDataBinding(filePath, content);
        
      } catch (error) {
        this.addIssue('重要', '模板文件', `文件读取失败: ${error.message}`, filePath);
      }
    }
  }

  /**
   * 检查模板结构
   */
  checkTemplateStructure(filePath, content) {
    // 检查标签闭合
    const openTags = content.match(/<\w+[^>]*>/g) || [];
    const closeTags = content.match(/<\/\w+>/g) || [];
    
    if (openTags.length !== closeTags.length) {
      this.addIssue('严重', '模板结构', '标签未正确闭合', filePath);
    }
    
    // 检查嵌套层级
    const maxNesting = this.calculateNesting(content);
    if (maxNesting > 8) {
      this.addIssue('一般', '模板结构', `嵌套层级过深 (${maxNesting} 层)`, filePath);
    }
  }

  /**
   * 检查数据绑定
   */
  checkDataBinding(filePath, content) {
    // 检查双向绑定
    const bindingMatches = content.match(/\{\{[^}]+\}\}/g) || [];
    
    bindingMatches.forEach(binding => {
      // 检查复杂表达式
      if (binding.includes('?') && binding.includes(':')) {
        this.addIssue('一般', '数据绑定', '模板中存在复杂表达式', filePath);
      }
      
      // 检查函数调用
      if (binding.includes('(') && binding.includes(')')) {
        this.addIssue('一般', '数据绑定', '模板中调用函数', filePath);
      }
    });
  }

  /**
   * 检查样式文件
   */
  async checkStyleFiles() {
    console.log('🎨 检查样式文件...');
    
    const wxssFiles = this.findFiles('.wxss');
    
    for (const filePath of wxssFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查样式规范
        this.checkStyleRules(filePath, content);
        
        // 检查性能问题
        this.checkStylePerformance(filePath, content);
        
      } catch (error) {
        this.addIssue('重要', '样式文件', `文件读取失败: ${error.message}`, filePath);
      }
    }
  }

  /**
   * 检查样式规范
   */
  checkStyleRules(filePath, content) {
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNum = index + 1;
      
      // 检查重要性声明
      if (line.includes('!important')) {
        this.addIssue('一般', '样式规范', '使用了!important', filePath, lineNum);
      }
      
      // 检查固定尺寸
      if (line.match(/:\s*\d+px/)) {
        this.addIssue('一般', '样式规范', '使用了固定像素值，建议使用rpx', filePath, lineNum);
      }
    });
  }

  /**
   * 检查样式性能
   */
  checkStylePerformance(filePath, content) {
    // 检查选择器复杂度
    const selectors = content.match(/[^{}]+\{/g) || [];
    
    selectors.forEach(selector => {
      const complexity = (selector.match(/\s/g) || []).length;
      if (complexity > 4) {
        this.addIssue('一般', '样式性能', `选择器过于复杂: ${selector.trim()}`, filePath);
      }
    });
  }

  /**
   * 检查配置文件
   */
  async checkConfigFiles() {
    console.log('⚙️ 检查配置文件...');
    
    const configFiles = ['app.json', 'project.config.json'];
    
    for (const fileName of configFiles) {
      const filePath = path.join(process.cwd(), fileName);
      
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const config = JSON.parse(content);
          
          this.checkConfigContent(filePath, config);
          
        } catch (error) {
          this.addIssue('严重', '配置文件', `JSON格式错误: ${error.message}`, filePath);
        }
      }
    }
  }

  /**
   * 检查配置内容
   */
  checkConfigContent(filePath, config) {
    if (filePath.includes('app.json')) {
      // 检查页面配置
      if (!config.pages || config.pages.length === 0) {
        this.addIssue('严重', '配置文件', '缺少页面配置', filePath);
      }
      
      // 检查tabBar配置
      if (config.tabBar && config.tabBar.list) {
        config.tabBar.list.forEach((tab, index) => {
          if (!tab.pagePath || !tab.text) {
            this.addIssue('重要', '配置文件', `tabBar第${index + 1}项配置不完整`, filePath);
          }
        });
      }
    }
  }

  /**
   * 检查性能
   */
  async checkPerformance() {
    console.log('🚀 检查性能...');
    
    // 检查文件大小
    this.checkFileSize();
    
    // 检查分包配置
    this.checkSubpackages();
  }

  /**
   * 检查文件大小
   */
  checkFileSize() {
    const allFiles = this.findFiles('');
    
    allFiles.forEach(filePath => {
      const stats = fs.statSync(filePath);
      const sizeKB = stats.size / 1024;
      
      if (sizeKB > 500) {
        this.addIssue('重要', '性能', `文件过大 (${sizeKB.toFixed(2)}KB)`, filePath);
      }
    });
  }

  /**
   * 检查分包配置
   */
  checkSubpackages() {
    const appJsonPath = path.join(process.cwd(), 'app.json');
    
    if (fs.existsSync(appJsonPath)) {
      try {
        const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        
        if (appConfig.subPackages && appConfig.subPackages.length > 0) {
          // 检查分包大小
          appConfig.subPackages.forEach(subpackage => {
            const subpackagePath = path.join(process.cwd(), subpackage.root);
            if (fs.existsSync(subpackagePath)) {
              const size = this.calculateDirectorySize(subpackagePath);
              if (size > 2 * 1024 * 1024) { // 2MB
                this.addIssue('重要', '性能', `分包过大 (${(size / 1024 / 1024).toFixed(2)}MB)`, subpackage.root);
              }
            }
          });
        }
      } catch (error) {
        this.addIssue('一般', '性能', `分包配置检查失败: ${error.message}`, appJsonPath);
      }
    }
  }

  /**
   * 检查安全性
   */
  async checkSecurity() {
    console.log('🔒 检查安全性...');
    
    const jsFiles = this.findFiles('.js');
    
    for (const filePath of jsFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 检查敏感信息
        this.checkSensitiveInfo(filePath, content);
        
        // 检查输入验证
        this.checkInputValidation(filePath, content);
        
      } catch (error) {
        this.addIssue('重要', '安全性', `文件读取失败: ${error.message}`, filePath);
      }
    }
  }

  /**
   * 检查敏感信息
   */
  checkSensitiveInfo(filePath, content) {
    const sensitivePatterns = [
      /password\s*[:=]\s*['"][^'"]+['"]/i,
      /secret\s*[:=]\s*['"][^'"]+['"]/i,
      /token\s*[:=]\s*['"][^'"]+['"]/i,
      /key\s*[:=]\s*['"][^'"]+['"]/i
    ];
    
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        this.addIssue('严重', '安全性', '可能包含敏感信息', filePath);
      }
    });
  }

  /**
   * 检查输入验证
   */
  checkInputValidation(filePath, content) {
    // 检查用户输入处理
    if (content.includes('input') || content.includes('textarea')) {
      if (!content.includes('validate') && !content.includes('check')) {
        this.addIssue('重要', '安全性', '缺少输入验证', filePath);
      }
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 添加问题
   */
  addIssue(severity, category, description, filePath, lineNumber = null) {
    this.issues.push({
      severity,
      category,
      description,
      filePath: path.relative(process.cwd(), filePath),
      lineNumber,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 查找文件
   */
  findFiles(extension, dir = process.cwd()) {
    const files = [];
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(itemPath);
        } else if (stat.isFile() && (extension === '' || item.endsWith(extension))) {
          files.push(itemPath);
        }
      });
    };
    
    scan(dir);
    return files;
  }

  /**
   * 收集文件统计信息
   */
  collectFileStats() {
    const allFiles = this.findFiles('');
    
    this.stats.totalFiles = allFiles.length;
    
    allFiles.forEach(filePath => {
      const ext = path.extname(filePath);
      
      switch (ext) {
        case '.js':
          this.stats.jsFiles++;
          break;
        case '.wxml':
          this.stats.wxmlFiles++;
          break;
        case '.wxss':
          this.stats.wxssFiles++;
          break;
        case '.json':
          this.stats.jsonFiles++;
          break;
      }
      
      // 统计代码行数
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        this.stats.totalLines += content.split('\n').length;
      } catch (error) {
        // 忽略二进制文件
      }
    });
  }

  /**
  /**
   * 计算嵌套层级
   */
  calculateNesting(content) {
    let maxNesting = 0;
    let currentNesting = 0;
    
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '<' && content[i + 1] !== '/') {
        currentNesting++;
        maxNesting = Math.max(maxNesting, currentNesting);
      } else if (content[i] === '<' && content[i + 1] === '/') {
        currentNesting--;
      }
    }
    
    return maxNesting;
  }

  /**
   * 计算目录大小
   */
  calculateDirectorySize(dirPath) {
    let totalSize = 0;
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          scan(itemPath);
        } else {
          totalSize += stat.size;
        }
      });
    };
    
    if (fs.existsSync(dirPath)) {
      scan(dirPath);
    }
    
    return totalSize;
  }

  /**
   * 生成审查报告
   */
  generateReport() {
    const severityStats = {
      '严重': this.issues.filter(issue => issue.severity === '严重').length,
      '重要': this.issues.filter(issue => issue.severity === '重要').length,
      '一般': this.issues.filter(issue => issue.severity === '一般').length,
      '建议': this.issues.filter(issue => issue.severity === '建议').length
    };

    const categoryStats = {};
    this.issues.forEach(issue => {
      categoryStats[issue.category] = (categoryStats[issue.category] || 0) + 1;
    });

    // 计算总体评分
    const totalIssues = this.issues.length;
    const criticalIssues = severityStats['严重'];
    const importantIssues = severityStats['重要'];
    
    let score = 100;
    score -= criticalIssues * 20;  // 严重问题扣20分
    score -= importantIssues * 10; // 重要问题扣10分
    score -= severityStats['一般'] * 5;  // 一般问题扣5分
    score -= severityStats['建议'] * 2;  // 建议扣2分
    
    score = Math.max(0, score); // 最低0分

    // 确定等级
    let grade = 'D';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';

    // 发布建议
    let releaseRecommendation = '可以发布';
    if (criticalIssues > 0) {
      releaseRecommendation = '修复严重问题后发布';
    } else if (importantIssues > 5) {
      releaseRecommendation = '建议修复重要问题后发布';
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: this.stats.totalFiles,
        totalLines: this.stats.totalLines,
        totalIssues: totalIssues,
        score: score,
        grade: grade,
        releaseRecommendation: releaseRecommendation
      },
      statistics: {
        fileStats: this.stats,
        severityStats: severityStats,
        categoryStats: categoryStats
      },
      issues: this.issues.sort((a, b) => {
        const severityOrder = { '严重': 0, '重要': 1, '一般': 2, '建议': 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      recommendations: this.generateRecommendations(severityStats, categoryStats)
    };
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(severityStats, categoryStats) {
    const recommendations = [];

    // 基于严重程度的建议
    if (severityStats['严重'] > 0) {
      recommendations.push({
        priority: 'P0',
        category: '严重问题',
        description: `发现 ${severityStats['严重']} 个严重问题，必须立即修复`,
        action: '立即修复所有严重问题，这些问题会影响应用的基本功能'
      });
    }

    if (severityStats['重要'] > 3) {
      recommendations.push({
        priority: 'P1',
        category: '重要问题',
        description: `发现 ${severityStats['重要']} 个重要问题，建议优先修复`,
        action: '优先修复重要问题，这些问题会影响用户体验'
      });
    }

    // 基于问题类别的建议
    const topCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    topCategories.forEach(([category, count]) => {
      if (count > 2) {
        recommendations.push({
          priority: 'P2',
          category: category,
          description: `${category} 类问题较多 (${count} 个)`,
          action: `重点关注 ${category} 相关的代码质量和规范`
        });
      }
    });

    // 通用建议
    if (this.stats.totalLines > 10000) {
      recommendations.push({
        priority: 'P3',
        category: '代码规模',
        description: '代码规模较大，建议加强模块化管理',
        action: '考虑进一步拆分模块，提高代码的可维护性'
      });
    }

    return recommendations;
  }
}

// 导出模块
module.exports = CodeReviewChecker;

// 如果直接运行此文件，执行代码审查
if (require.main === module) {
  const checker = new CodeReviewChecker();
  
  checker.runFullReview().then(report => {
    console.log('\n📊 代码审查报告:');
    console.log(`总体评分: ${report.summary.score}/100 (${report.summary.grade}级)`);
    console.log(`发布建议: ${report.summary.releaseRecommendation}`);
    console.log(`\n问题统计:`);
    console.log(`- 严重问题: ${report.statistics.severityStats['严重']} 个`);
    console.log(`- 重要问题: ${report.statistics.severityStats['重要']} 个`);
    console.log(`- 一般问题: ${report.statistics.severityStats['一般']} 个`);
    console.log(`- 建议优化: ${report.statistics.severityStats['建议']} 个`);
    
    if (report.issues.length > 0) {
      console.log(`\n🔍 发现的问题:`);
      report.issues.slice(0, 10).forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.category}: ${issue.description}`);
        console.log(`   文件: ${issue.filePath}${issue.lineNumber ? `:${issue.lineNumber}` : ''}`);
      });
      
      if (report.issues.length > 10) {
        console.log(`   ... 还有 ${report.issues.length - 10} 个问题`);
      }
    }
    
    console.log(`\n💡 改进建议:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.description}`);
      console.log(`   建议: ${rec.action}`);
    });
    
  }).catch(error => {
    console.error('代码审查失败:', error);
  });
}
