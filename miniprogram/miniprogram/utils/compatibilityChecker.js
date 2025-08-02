/**
 * 兼容性检查工具
 * 用于检测设备、微信版本、API等兼容性
 */

class CompatibilityChecker {
  constructor() {
    this.systemInfo = null;
    this.supportInfo = {
      minWechatVersion: '7.0.0',
      minBaseLibVersion: '2.10.0',
      recommendWechatVersion: '8.0.0',
      recommendBaseLibVersion: '2.20.0'
    };
    
    this.init();
  }

  /**
   * 初始化兼容性检查器
   */
  async init() {
    try {
      this.systemInfo = await this.getSystemInfo();
      console.log('兼容性检查器初始化完成:', this.systemInfo);
    } catch (error) {
      console.error('兼容性检查器初始化失败:', error);
    }
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    return new Promise((resolve, reject) => {
      wx.getSystemInfo({
        success: (res) => {
          resolve(res);
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }

  /**
   * 检查微信版本兼容性
   */
  checkWechatVersion() {
    if (!this.systemInfo) {
      return { compatible: false, reason: '无法获取系统信息' };
    }

    const currentVersion = this.systemInfo.version;
    const minVersion = this.supportInfo.minWechatVersion;
    const recommendVersion = this.supportInfo.recommendWechatVersion;

    const isCompatible = this.compareVersion(currentVersion, minVersion) >= 0;
    const isRecommended = this.compareVersion(currentVersion, recommendVersion) >= 0;

    return {
      compatible: isCompatible,
      recommended: isRecommended,
      currentVersion,
      minVersion,
      recommendVersion,
      reason: isCompatible ? '版本兼容' : `需要微信版本 ${minVersion} 或更高`
    };
  }

  /**
   * 检查基础库版本兼容性
   */
  checkBaseLibVersion() {
    if (!this.systemInfo) {
      return { compatible: false, reason: '无法获取系统信息' };
    }

    const currentVersion = this.systemInfo.SDKVersion;
    const minVersion = this.supportInfo.minBaseLibVersion;
    const recommendVersion = this.supportInfo.recommendBaseLibVersion;

    const isCompatible = this.compareVersion(currentVersion, minVersion) >= 0;
    const isRecommended = this.compareVersion(currentVersion, recommendVersion) >= 0;

    return {
      compatible: isCompatible,
      recommended: isRecommended,
      currentVersion,
      minVersion,
      recommendVersion,
      reason: isCompatible ? '基础库兼容' : `需要基础库版本 ${minVersion} 或更高`
    };
  }

  /**
   * 检查设备性能等级
   */
  checkDevicePerformance() {
    if (!this.systemInfo) {
      return { level: 'unknown', reason: '无法获取系统信息' };
    }

    const { model, system, benchmarkLevel } = this.systemInfo;
    
    // 基于内存和CPU信息判断性能等级
    let performanceLevel = 'medium';
    let recommendations = [];

    // 如果有benchmarkLevel，直接使用
    if (benchmarkLevel !== undefined) {
      if (benchmarkLevel >= 50) {
        performanceLevel = 'high';
      } else if (benchmarkLevel >= 20) {
        performanceLevel = 'medium';
      } else {
        performanceLevel = 'low';
        recommendations.push('建议关闭动画效果以提升性能');
        recommendations.push('建议减少同时显示的数据量');
      }
    } else {
      // 基于设备型号和系统版本推测
      if (model.includes('iPhone')) {
        const iosVersion = this.extractIOSVersion(system);
        if (iosVersion >= 13) {
          performanceLevel = 'high';
        } else if (iosVersion >= 11) {
          performanceLevel = 'medium';
        } else {
          performanceLevel = 'low';
        }
      }
    }

    return {
      level: performanceLevel,
      model,
      system,
      benchmarkLevel,
      recommendations,
      reason: `设备性能等级: ${performanceLevel}`
    };
  }

  /**
   * 检查屏幕适配情况
   */
  checkScreenCompatibility() {
    if (!this.systemInfo) {
      return { compatible: false, reason: '无法获取系统信息' };
    }

    const { windowWidth, windowHeight, pixelRatio, screenWidth, screenHeight } = this.systemInfo;
    
    // 计算屏幕相关信息
    const aspectRatio = windowHeight / windowWidth;
    const dpi = pixelRatio * 160; // 估算DPI
    
    // 判断屏幕类型
    let screenType = 'standard';
    let adaptationLevel = 'good';
    let recommendations = [];

    if (windowWidth <= 320) {
      screenType = 'small';
      adaptationLevel = 'needs-optimization';
      recommendations.push('小屏设备，建议优化布局密度');
      recommendations.push('建议增大触摸区域');
    } else if (windowWidth >= 428) {
      screenType = 'large';
      recommendations.push('大屏设备，可以展示更多内容');
    }

    if (aspectRatio > 2.0) {
      screenType += '-long';
      recommendations.push('长屏设备，注意底部安全区域');
    }

    return {
      compatible: true,
      adaptationLevel,
      screenType,
      windowWidth,
      windowHeight,
      aspectRatio: Math.round(aspectRatio * 100) / 100,
      pixelRatio,
      dpi: Math.round(dpi),
      recommendations,
      reason: `屏幕适配良好 (${windowWidth}×${windowHeight})`
    };
  }

  /**
   * 检查API兼容性
   */
  checkAPICompatibility() {
    const apis = [
      // 基础API
      { name: 'wx.getSystemInfo', required: true },
      { name: 'wx.setStorage', required: true },
      { name: 'wx.getStorage', required: true },
      { name: 'wx.showToast', required: true },
      { name: 'wx.showModal', required: true },
      { name: 'wx.navigateTo', required: true },
      { name: 'wx.switchTab', required: true },
      
      // 高级API
      { name: 'wx.canIUse', required: false },
      { name: 'wx.getUpdateManager', required: false },
      { name: 'wx.onMemoryWarning', required: false },
      { name: 'wx.setKeepScreenOn', required: false },
      { name: 'wx.vibrateShort', required: false },
      { name: 'wx.setClipboardData', required: false },
      { name: 'wx.getClipboardData', required: false }
    ];

    const results = apis.map(api => {
      const available = wx.canIUse ? wx.canIUse(api.name) : (typeof wx[api.name.split('.')[1]] === 'function');
      return {
        name: api.name,
        available,
        required: api.required,
        status: available ? 'supported' : (api.required ? 'missing' : 'optional')
      };
    });

    const missingRequired = results.filter(r => r.required && !r.available);
    const missingOptional = results.filter(r => !r.required && !r.available);

    return {
      compatible: missingRequired.length === 0,
      results,
      missingRequired,
      missingOptional,
      reason: missingRequired.length === 0 ? 'API兼容性良好' : `缺少必需API: ${missingRequired.map(r => r.name).join(', ')}`
    };
  }

  /**
   * 执行完整的兼容性检查
   */
  async runFullCompatibilityCheck() {
    console.log('开始执行完整兼容性检查...');
    
    const results = {
      timestamp: new Date().toISOString(),
      systemInfo: this.systemInfo,
      checks: {}
    };

    try {
      // 微信版本检查
      results.checks.wechatVersion = this.checkWechatVersion();
      
      // 基础库版本检查
      results.checks.baseLibVersion = this.checkBaseLibVersion();
      
      // 设备性能检查
      results.checks.devicePerformance = this.checkDevicePerformance();
      
      // 屏幕适配检查
      results.checks.screenCompatibility = this.checkScreenCompatibility();
      
      // API兼容性检查
      results.checks.apiCompatibility = this.checkAPICompatibility();

      // 计算总体兼容性评分
      results.overallCompatibility = this.calculateOverallCompatibility(results.checks);
      
      console.log('兼容性检查完成:', results);
      return results;
      
    } catch (error) {
      console.error('兼容性检查失败:', error);
      results.error = error.message;
      return results;
    }
  }

  /**
   * 计算总体兼容性评分
   */
  calculateOverallCompatibility(checks) {
    let score = 100;
    let issues = [];
    let recommendations = [];

    // 微信版本检查
    if (!checks.wechatVersion.compatible) {
      score -= 30;
      issues.push('微信版本过低');
    } else if (!checks.wechatVersion.recommended) {
      score -= 10;
      recommendations.push('建议升级微信到最新版本');
    }

    // 基础库版本检查
    if (!checks.baseLibVersion.compatible) {
      score -= 30;
      issues.push('基础库版本过低');
    } else if (!checks.baseLibVersion.recommended) {
      score -= 10;
      recommendations.push('建议升级微信以获得更好体验');
    }

    // 设备性能检查
    if (checks.devicePerformance.level === 'low') {
      score -= 20;
      issues.push('设备性能较低');
      recommendations.push(...checks.devicePerformance.recommendations);
    } else if (checks.devicePerformance.level === 'medium') {
      score -= 5;
    }

    // 屏幕适配检查
    if (checks.screenCompatibility.adaptationLevel === 'needs-optimization') {
      score -= 10;
      recommendations.push(...checks.screenCompatibility.recommendations);
    }

    // API兼容性检查
    if (!checks.apiCompatibility.compatible) {
      score -= 25;
      issues.push('缺少必需API');
    }
    if (checks.apiCompatibility.missingOptional.length > 0) {
      score -= 5;
      recommendations.push('部分高级功能不可用');
    }

    // 确定兼容性等级
    let level = 'excellent';
    if (score < 60) {
      level = 'poor';
    } else if (score < 80) {
      level = 'fair';
    } else if (score < 95) {
      level = 'good';
    }

    return {
      score: Math.max(0, score),
      level,
      issues,
      recommendations
    };
  }

  /**
   * 版本比较工具
   */
  compareVersion(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
      const num1 = v1[i] || 0;
      const num2 = v2[i] || 0;
      
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    
    return 0;
  }

  /**
   * 提取iOS版本号
   */
  extractIOSVersion(systemString) {
    const match = systemString.match(/iOS (\d+)/);
    return match ? parseInt(match[1]) : 10;
  }

  /**
   * 生成兼容性报告
   */
  generateCompatibilityReport(results) {
    const report = {
      title: '备小孕小程序兼容性测试报告',
      timestamp: results.timestamp,
      summary: {
        score: results.overallCompatibility.score,
        level: results.overallCompatibility.level,
        issues: results.overallCompatibility.issues,
        recommendations: results.overallCompatibility.recommendations
      },
      deviceInfo: {
        model: results.systemInfo?.model || 'Unknown',
        system: results.systemInfo?.system || 'Unknown',
        wechatVersion: results.systemInfo?.version || 'Unknown',
        baseLibVersion: results.systemInfo?.SDKVersion || 'Unknown',
        screenSize: `${results.systemInfo?.windowWidth}×${results.systemInfo?.windowHeight}` || 'Unknown'
      },
      detailedResults: results.checks
    };

    return report;
  }
}

// 创建全局实例
const compatibilityChecker = new CompatibilityChecker();

module.exports = compatibilityChecker;