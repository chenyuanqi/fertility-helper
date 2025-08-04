# 备小孕小程序 - 性能监控指南

## 📊 监控体系概览

### 🎯 监控目标

#### 用户体验监控
```
关键指标：
• 小程序启动时间 < 3秒
• 页面切换响应 < 1秒  
• 数据保存响应 < 2秒
• 图表渲染时间 < 2秒
• 用户操作无卡顿感
```

#### 功能可用性监控
```
可用性指标：
• 功能成功率 > 99%
• 数据保存成功率 > 99.5%
• 图表加载成功率 > 98%
• 预测算法执行成功率 > 99%
• 用户流程完成率 > 95%
```

#### 稳定性监控
```
稳定性指标：
• 崩溃率 < 0.1%
• 内存使用 < 100MB
• CPU使用率 < 30%
• 网络请求成功率 > 98%
• 本地存储读写成功率 > 99.9%
```

## 🛠️ 监控工具配置

### 微信官方监控工具

#### 1. 小程序数据助手
```
配置内容：
✅ 用户访问数据
  - 日活跃用户数 (DAU)
  - 新增用户数
  - 访问次数和时长
  - 页面访问分布

✅ 性能数据
  - 启动耗时分布
  - 页面切换耗时
  - 网络请求耗时
  - 内存使用情况

✅ 错误监控
  - JavaScript错误统计
  - 网络错误统计
  - 接口调用异常

配置步骤：
1. 登录微信公众平台
2. 进入小程序后台
3. 选择"数据分析"
4. 配置关键指标监控
5. 设置告警阈值
```

#### 2. 实时日志系统
```
日志配置：
console.log() - 一般信息记录
console.warn() - 警告信息记录  
console.error() - 错误信息记录

实现示例：
// utils/logger.js
class Logger {
  static info(message, data = {}) {
    console.log(`[INFO] ${message}`, data);
    // 记录到本地日志
    this.recordLog('info', message, data);
  }
  
  static warn(message, data = {}) {
    console.warn(`[WARN] ${message}`, data);
    this.recordLog('warn', message, data);
  }
  
  static error(message, error = {}) {
    console.error(`[ERROR] ${message}`, error);
    this.recordLog('error', message, error);
    // 关键错误上报
    this.reportError(message, error);
  }
  
  static recordLog(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      page: getCurrentPages().pop().route
    };
    
    // 保存到本地存储（限制数量）
    const logs = wx.getStorageSync('app_logs') || [];
    logs.unshift(logEntry);
    if (logs.length > 100) logs.pop(); // 保留最新100条
    wx.setStorageSync('app_logs', logs);
  }
}
```

### 自定义性能监控

#### 3. 页面性能监控
```javascript
// utils/performanceMonitor.js
class PerformanceMonitor {
  static startPageLoad(pageName) {
    const startTime = Date.now();
    wx.setStorageSync(`page_start_${pageName}`, startTime);
    Logger.info(`页面开始加载: ${pageName}`);
  }
  
  static endPageLoad(pageName) {
    const startTime = wx.getStorageSync(`page_start_${pageName}`);
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    Logger.info(`页面加载完成: ${pageName}`, { loadTime });
    
    // 记录性能指标
    this.recordPerformance('page_load', pageName, loadTime);
    
    // 超时告警
    if (loadTime > 3000) {
      Logger.warn(`页面加载超时: ${pageName}`, { loadTime });
    }
    
    wx.removeStorageSync(`page_start_${pageName}`);
  }
  
  static recordPerformance(type, name, value) {
    const metrics = wx.getStorageSync('performance_metrics') || {};
    
    if (!metrics[type]) {
      metrics[type] = {};
    }
    
    if (!metrics[type][name]) {
      metrics[type][name] = {
        count: 0,
        total: 0,
        avg: 0,
        max: 0,
        min: Infinity
      };
    }
    
    const metric = metrics[type][name];
    metric.count++;
    metric.total += value;
    metric.avg = metric.total / metric.count;
    metric.max = Math.max(metric.max, value);
    metric.min = Math.min(metric.min, value);
    
    wx.setStorageSync('performance_metrics', metrics);
  }
  
  static getMetrics() {
    return wx.getStorageSync('performance_metrics') || {};
  }
}

// 在页面中使用
Page({
  onLoad() {
    PerformanceMonitor.startPageLoad('index');
  },
  
  onReady() {
    PerformanceMonitor.endPageLoad('index');
  }
});
```

#### 4. 数据操作监控
```javascript
// utils/dataMonitor.js
class DataMonitor {
  static monitorDataSave(operation, data) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      // 执行数据保存操作
      try {
        const result = this.executeDataOperation(operation, data);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 记录成功的操作
        Logger.info(`数据操作成功: ${operation}`, { 
          duration, 
          dataSize: JSON.stringify(data).length 
        });
        
        PerformanceMonitor.recordPerformance('data_operation', operation, duration);
        
        // 检查性能告警
        if (duration > 2000) {
          Logger.warn(`数据操作缓慢: ${operation}`, { duration });
        }
        
        resolve(result);
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        Logger.error(`数据操作失败: ${operation}`, { 
          error: error.message, 
          duration 
        });
        
        reject(error);
      }
    });
  }
  
  static executeDataOperation(operation, data) {
    switch (operation) {
      case 'save_temperature':
        return this.saveTemperature(data);
      case 'save_menstrual':
        return this.saveMenstrual(data);
      case 'load_chart_data':
        return this.loadChartData(data);
      default:
        throw new Error(`未知的数据操作: ${operation}`);
    }
  }
}
```

## 📈 关键指标监控

### 用户行为指标

#### 1. 页面访问监控
```javascript
// utils/userBehaviorMonitor.js
class UserBehaviorMonitor {
  static trackPageView(pageName, params = {}) {
    const viewData = {
      page: pageName,
      timestamp: new Date().toISOString(),
      params,
      userAgent: wx.getSystemInfoSync(),
      source: this.getPageSource()
    };
    
    Logger.info(`页面访问: ${pageName}`, viewData);
    this.recordUserBehavior('page_view', viewData);
  }
  
  static trackUserAction(action, target, details = {}) {
    const actionData = {
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
      page: getCurrentPages().pop().route
    };
    
    Logger.info(`用户操作: ${action}`, actionData);
    this.recordUserBehavior('user_action', actionData);
  }
  
  static recordUserBehavior(type, data) {
    const behaviors = wx.getStorageSync('user_behaviors') || [];
    behaviors.unshift({ type, data });
    
    // 保留最新200条记录
    if (behaviors.length > 200) {
      behaviors.splice(200);
    }
    
    wx.setStorageSync('user_behaviors', behaviors);
  }
  
  static getPageSource() {
    const pages = getCurrentPages();
    return pages.length > 1 ? pages[pages.length - 2].route : 'direct';
  }
}

// 在页面中使用
Page({
  onShow() {
    UserBehaviorMonitor.trackPageView('index');
  },
  
  onTemperatureInput() {
    UserBehaviorMonitor.trackUserAction('input', 'temperature_keyboard');
  }
});
```

#### 2. 功能使用统计
```javascript
// utils/featureMonitor.js
class FeatureMonitor {
  static trackFeatureUsage(feature, success = true, details = {}) {
    const usageData = {
      feature,
      success,
      details,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };
    
    Logger.info(`功能使用: ${feature}`, usageData);
    
    // 更新功能使用统计
    this.updateFeatureStats(feature, success);
  }
  
  static updateFeatureStats(feature, success) {
    const stats = wx.getStorageSync('feature_stats') || {};
    
    if (!stats[feature]) {
      stats[feature] = {
        totalCount: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0
      };
    }
    
    stats[feature].totalCount++;
    if (success) {
      stats[feature].successCount++;
    } else {
      stats[feature].failureCount++;
    }
    
    stats[feature].successRate = 
      (stats[feature].successCount / stats[feature].totalCount * 100).toFixed(2);
    
    wx.setStorageSync('feature_stats', stats);
    
    // 成功率告警
    if (stats[feature].successRate < 95 && stats[feature].totalCount > 10) {
      Logger.warn(`功能成功率较低: ${feature}`, stats[feature]);
    }
  }
  
  static getSessionId() {
    let sessionId = wx.getStorageSync('session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36);
      wx.setStorageSync('session_id', sessionId);
    }
    return sessionId;
  }
}
```

### 技术性能指标

#### 3. 内存使用监控
```javascript
// utils/memoryMonitor.js
class MemoryMonitor {
  static startMonitoring() {
    // 每30秒检查一次内存使用
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);
  }
  
  static checkMemoryUsage() {
    wx.getPerformance().then(performance => {
      const memoryInfo = performance.memory;
      
      Logger.info('内存使用情况', {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
      });
      
      // 内存使用率计算
      const memoryUsageRate = 
        (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit * 100).toFixed(2);
      
      // 内存告警
      if (memoryUsageRate > 80) {
        Logger.warn('内存使用率过高', {
          usageRate: memoryUsageRate + '%',
          usedMemory: memoryInfo.usedJSHeapSize
        });
        
        // 触发内存清理
        this.triggerMemoryCleanup();
      }
      
      // 记录内存使用趋势
      this.recordMemoryTrend(memoryUsageRate);
    }).catch(error => {
      Logger.error('获取内存信息失败', error);
    });
  }
  
  static triggerMemoryCleanup() {
    Logger.info('开始内存清理');
    
    // 清理缓存数据
    try {
      this.clearCache();
      Logger.info('内存清理完成');
    } catch (error) {
      Logger.error('内存清理失败', error);
    }
  }
  
  static clearCache() {
    // 清理非必要的缓存数据
    const keysToClean = ['temp_chart_data', 'cached_analysis', 'old_logs'];
    keysToClean.forEach(key => {
      wx.removeStorageSync(key);
    });
  }
  
  static recordMemoryTrend(usageRate) {
    const trends = wx.getStorageSync('memory_trends') || [];
    trends.unshift({
      timestamp: new Date().toISOString(),
      usageRate: parseFloat(usageRate)
    });
    
    // 保留最新50条记录
    if (trends.length > 50) {
      trends.splice(50);
    }
    
    wx.setStorageSync('memory_trends', trends);
  }
}
```

#### 4. 错误监控和上报
```javascript
// utils/errorMonitor.js
class ErrorMonitor {
  static init() {
    // 监听全局错误
    App.onError = (error) => {
      this.handleGlobalError(error);
    };
    
    // 监听Promise未捕获的错误
    App.onUnhandledRejection = (res) => {
      this.handleUnhandledRejection(res);
    };
  }
  
  static handleGlobalError(error) {
    const errorInfo = {
      message: error.message || error,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      page: getCurrentPages().pop()?.route,
      systemInfo: wx.getSystemInfoSync()
    };
    
    Logger.error('全局错误', errorInfo);
    this.reportError('global_error', errorInfo);
  }
  
  static handleUnhandledRejection(res) {
    const errorInfo = {
      reason: res.reason,
      promise: res.promise,
      timestamp: new Date().toISOString(),
      page: getCurrentPages().pop()?.route
    };
    
    Logger.error('未处理的Promise拒绝', errorInfo);
    this.reportError('unhandled_rejection', errorInfo);
  }
  
  static reportError(type, errorInfo) {
    // 记录错误统计
    this.updateErrorStats(type);
    
    // 严重错误立即上报
    if (this.isCriticalError(type, errorInfo)) {
      this.sendImmediateAlert(errorInfo);
    }
  }
  
  static updateErrorStats(type) {
    const stats = wx.getStorageSync('error_stats') || {};
    
    if (!stats[type]) {
      stats[type] = {
        count: 0,
        lastOccurrence: null
      };
    }
    
    stats[type].count++;
    stats[type].lastOccurrence = new Date().toISOString();
    
    wx.setStorageSync('error_stats', stats);
  }
  
  static isCriticalError(type, errorInfo) {
    // 定义关键错误类型
    const criticalTypes = ['global_error', 'data_corruption', 'security_issue'];
    return criticalTypes.includes(type);
  }
  
  static sendImmediateAlert(errorInfo) {
    // 在实际应用中，这里可以发送到错误监控服务
    Logger.error('关键错误告警', errorInfo);
    
    // 本地记录关键错误
    const criticalErrors = wx.getStorageSync('critical_errors') || [];
    criticalErrors.unshift({
      ...errorInfo,
      reported: true
    });
    
    // 保留最新10条关键错误
    if (criticalErrors.length > 10) {
      criticalErrors.splice(10);
    }
    
    wx.setStorageSync('critical_errors', criticalErrors);
  }
}
```

## 📱 用户体验监控

### 响应时间监控

#### 5. 操作响应监控
```javascript
// utils/responseMonitor.js
class ResponseMonitor {
  static trackOperation(operationName, operationFn) {
    const startTime = Date.now();
    
    return Promise.resolve(operationFn()).then(result => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.recordResponse(operationName, duration, true);
      
      // 响应时间告警
      if (duration > this.getThreshold(operationName)) {
        Logger.warn(`操作响应缓慢: ${operationName}`, { duration });
      }
      
      return result;
    }).catch(error => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.recordResponse(operationName, duration, false);
      Logger.error(`操作执行失败: ${operationName}`, { error, duration });
      
      throw error;
    });
  }
  
  static recordResponse(operation, duration, success) {
    const responses = wx.getStorageSync('response_times') || {};
    
    if (!responses[operation]) {
      responses[operation] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0,
        minTime: Infinity,
        successCount: 0,
        failureCount: 0
      };
    }
    
    const resp = responses[operation];
    resp.count++;
    resp.totalTime += duration;
    resp.avgTime = resp.totalTime / resp.count;
    resp.maxTime = Math.max(resp.maxTime, duration);
    resp.minTime = Math.min(resp.minTime, duration);
    
    if (success) {
      resp.successCount++;
    } else {
      resp.failureCount++;
    }
    
    wx.setStorageSync('response_times', responses);
  }
  
  static getThreshold(operation) {
    const thresholds = {
      'save_temperature': 2000,
      'load_chart': 3000,
      'generate_report': 5000,
      'page_navigation': 1000
    };
    
    return thresholds[operation] || 2000;
  }
}

// 使用示例
const saveTemperature = (data) => {
  return ResponseMonitor.trackOperation('save_temperature', () => {
    return dataManager.saveTemperatureRecord(data);
  });
};
```

### 用户满意度监控

#### 6. 用户反馈收集
```javascript
// utils/feedbackMonitor.js
class FeedbackMonitor {
  static collectFeedback(type, rating, comment = '') {
    const feedback = {
      type,
      rating, // 1-5星评分
      comment,
      timestamp: new Date().toISOString(),
      version: this.getAppVersion(),
      systemInfo: wx.getSystemInfoSync()
    };
    
    Logger.info('用户反馈收集', feedback);
    this.saveFeedback(feedback);
    
    // 负面反馈告警
    if (rating <= 2) {
      Logger.warn('收到负面反馈', feedback);
    }
  }
  
  static saveFeedback(feedback) {
    const feedbacks = wx.getStorageSync('user_feedbacks') || [];
    feedbacks.unshift(feedback);
    
    // 保留最新100条反馈
    if (feedbacks.length > 100) {
      feedbacks.splice(100);
    }
    
    wx.setStorageSync('user_feedbacks', feedbacks);
    this.updateSatisfactionStats(feedback);
  }
  
  static updateSatisfactionStats(feedback) {
    const stats = wx.getStorageSync('satisfaction_stats') || {
      totalFeedbacks: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
    
    stats.totalFeedbacks++;
    stats.ratingDistribution[feedback.rating]++;
    
    // 计算平均评分
    let totalScore = 0;
    for (let rating = 1; rating <= 5; rating++) {
      totalScore += rating * stats.ratingDistribution[rating];
    }
    stats.averageRating = (totalScore / stats.totalFeedbacks).toFixed(2);
    
    wx.setStorageSync('satisfaction_stats', stats);
    
    // 满意度告警
    if (stats.averageRating < 3.5 && stats.totalFeedbacks > 10) {
      Logger.warn('用户满意度较低', stats);
    }
  }
  
  static getAppVersion() {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.version;
  }
}
```

## 📊 监控数据分析

### 数据聚合和报告

#### 7. 监控报告生成
```javascript
// utils/monitoringReport.js
class MonitoringReport {
  static generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    
    const report = {
      date: today,
      performance: this.getPerformanceMetrics(),
      userBehavior: this.getUserBehaviorMetrics(),
      errors: this.getErrorMetrics(),
      satisfaction: this.getSatisfactionMetrics(),
      recommendations: []
    };
    
    // 生成建议
    report.recommendations = this.generateRecommendations(report);
    
    Logger.info('日报生成', report);
    this.saveReport('daily', report);
    
    return report;
  }
  
  static getPerformanceMetrics() {
    const metrics = PerformanceMonitor.getMetrics();
    const memoryTrends = wx.getStorageSync('memory_trends') || [];
    const responseTimes = wx.getStorageSync('response_times') || {};
    
    return {
      pageLoadTimes: metrics.page_load || {},
      dataOperationTimes: metrics.data_operation || {},
      memoryUsage: memoryTrends.slice(0, 24), // 最近24小时
      responseTimes: responseTimes
    };
  }
  
  static getUserBehaviorMetrics() {
    const behaviors = wx.getStorageSync('user_behaviors') || [];
    const featureStats = wx.getStorageSync('feature_stats') || {};
    
    // 统计页面访问
    const pageViews = behaviors
      .filter(b => b.type === 'page_view')
      .reduce((acc, b) => {
        const page = b.data.page;
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {});
    
    // 统计用户操作
    const userActions = behaviors
      .filter(b => b.type === 'user_action')
      .reduce((acc, b) => {
        const action = b.data.action;
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {});
    
    return {
      pageViews,
      userActions,
      featureUsage: featureStats
    };
  }
  
  static getErrorMetrics() {
    const errorStats = wx.getStorageSync('error_stats') || {};
    const criticalErrors = wx.getStorageSync('critical_errors') || [];
    
    return {
      errorCounts: errorStats,
      criticalErrors: criticalErrors.slice(0, 5), // 最近5个关键错误
      totalErrors: Object.values(errorStats).reduce((sum, stat) => sum + stat.count, 0)
    };
  }
  
  static getSatisfactionMetrics() {
    return wx.getStorageSync('satisfaction_stats') || {
      totalFeedbacks: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  static generateRecommendations(report) {
    const recommendations = [];
    
    // 性能建议
    if (report.performance.pageLoadTimes.index?.avg > 3000) {
      recommendations.push({
        type: 'performance',
        level: 'warning',
        message: '首页加载时间过长，建议优化'
      });
    }
    
    // 错误建议
    if (report.errors.totalErrors > 10) {
      recommendations.push({
        type: 'error',
        level: 'critical',
        message: '错误数量较多，需要重点关注'
      });
    }
    
    // 满意度建议
    if (report.satisfaction.averageRating < 4.0) {
      recommendations.push({
        type: 'satisfaction',
        level: 'warning',
        message: '用户满意度有待提升'
      });
    }
    
    return recommendations;
  }
  
  static saveReport(type, report) {
    const reports = wx.getStorageSync(`${type}_reports`) || [];
    reports.unshift(report);
    
    // 保留最近30份报告
    if (reports.length > 30) {
      reports.splice(30);
    }
    
    wx.setStorageSync(`${type}_reports`, reports);
  }
}
```

## 🚨 告警机制

### 告警配置

#### 8. 告警阈值设置
```javascript
// utils/alertManager.js
class AlertManager {
  static init() {
    this.alertThresholds = {
      performance: {
        pageLoadTime: 3000,
        responseTime: 2000,
        memoryUsage: 80, // 百分比
        errorRate: 5 // 百分比
      },
      user: {
        crashRate: 0.1, // 百分比
        satisfactionRating: 3.5,
        featureSuccessRate: 95 // 百分比
      },
      system: {
        storageUsage: 90, // 百分比
        criticalErrors: 3 // 数量
      }
    };
    
    // 启动定期检查
    this.startPeriodicChecks();
  }
  
  static startPeriodicChecks() {
    // 每5分钟检查一次
    setInterval(() => {
      this.checkAllThresholds();
    }, 5 * 60 * 1000);
  }
  
  static checkAllThresholds() {
    this.checkPerformanceThresholds();
    this.checkUserThresholds();
    this.checkSystemThresholds();
  }
  
  static checkPerformanceThresholds() {
    const metrics = PerformanceMonitor.getMetrics();
    
    // 检查页面加载时间
    Object.entries(metrics.page_load || {}).forEach(([page, stats]) => {
      if (stats.avg > this.alertThresholds.performance.pageLoadTime) {
        this.triggerAlert('performance', 'page_load_slow', {
          page,
          avgTime: stats.avg,
          threshold: this.alertThresholds.performance.pageLoadTime
        });
      }
    });
    
    // 检查内存使用
    const memoryTrends = wx.getStorageSync('memory_trends') || [];
    if (memoryTrends.length > 0) {
      const latestMemory = memoryTrends[0];
      if (latestMemory.usageRate > this.alertThresholds.performance.memoryUsage) {
        this.triggerAlert('performance', 'memory_high', {
          usageRate: latestMemory.usageRate,
          threshold: this.alertThresholds.performance.memoryUsage
        });
      }
    }
  }
  
  static triggerAlert(category, type, details) {
    const alert = {
      id: this.generateAlertId(),
      category,
      type,
      details,
      timestamp: new Date().toISOString(),
      level: this.getAlertLevel(category, type),
      resolved: false
    };
    
    Logger.warn(`告警触发: ${category}.${type}`, alert);
    this.saveAlert(alert);
    
    // 关键告警立即处理
    if (alert.level === 'critical') {
      this.handleCriticalAlert(alert);
    }
  }
  
  static generateAlertId() {
    return 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  static getAlertLevel(category, type) {
    const levelMap = {
      'performance.memory_high': 'critical',
      'performance.page_load_slow': 'warning',
      'user.crash_rate_high': 'critical',
      'system.critical_errors': 'critical'
    };
    
    return levelMap[`${category}.${type}`] || 'info';
  }
  
  static saveAlert(alert) {
    const alerts = wx.getStorageSync('system_alerts') || [];
    alerts.unshift(alert);
    
    // 保留最新100条告警
    if (alerts.length > 100) {
      alerts.splice(100);
    }
    
    wx.setStorageSync('system_alerts', alerts);
  }
  
  static handleCriticalAlert(alert) {
    // 关键告警的处理逻辑
    Logger.error('关键告警处理', alert);
    
    // 可以在这里实现自动修复逻辑
    switch (alert.type) {
      case 'memory_high':
        MemoryMonitor.triggerMemoryCleanup();
        break;
      case 'critical_errors':
        this.triggerEmergencyMode();
        break;
    }
  }
  
  static triggerEmergencyMode() {
    Logger.warn('进入紧急模式');
    
    // 禁用非关键功能
    wx.setStorageSync('emergency_mode', true);
    
    // 清理缓存
    MemoryMonitor.triggerMemoryCleanup();
    
    // 重置错误计数
    wx.removeStorageSync('error_stats');
  }
}
```

## 📱 监控仪表板

### 实时监控界面

#### 9. 管理员监控页面
```javascript
// pages/admin/monitor.js
Page({
  data: {
    realTimeMetrics: {},
    alerts: [],
    reports: [],
    refreshInterval: null
  },
  
  onLoad() {
    this.loadMonitoringData();
    this.startRealTimeUpdates();
  },
  
  onUnload() {
    if (this.data.refreshInterval) {
      clearInterval(this.data.refreshInterval);
    }
  },
  
  loadMonitoringData() {
    // 加载性能指标
    const performanceMetrics = PerformanceMonitor.getMetrics();
    const memoryTrends = wx.getStorageSync('memory_trends') || [];
    const systemAlerts = wx.getStorageSync('system_alerts') || [];
    const dailyReports = wx.getStorageSync('daily_reports') || [];
    
    this.setData({
      realTimeMetrics: {
        performance: performanceMetrics,
        memory: memoryTrends.slice(0, 10),
        errors: wx.getStorageSync('error_stats') || {},
        satisfaction: wx.getStorageSync('satisfaction_stats') || {}
      },
      alerts: systemAlerts.slice(0, 20),
      reports: dailyReports.slice(0, 7)
    });
  },
  
  startRealTimeUpdates() {
    // 每30秒更新一次
    const refreshInterval = setInterval(() => {
      this.loadMonitoringData();
    }, 30000);
    
    this.setData({ refreshInterval });
  },
  
  onGenerateReport() {
    wx.showLoading({ title: '生成报告中...' });
    
    try {
      const report = MonitoringReport.generateDailyReport();
      wx.hideLoading();
      
      wx.showModal({
        title: '报告生成成功',
        content: `性能指标: ${Object.keys(report.performance).length}项\n错误数量: ${report.errors.totalErrors}\n建议: ${report.recommendations.length}条`,
        showCancel: false
      });
      
      this.loadMonitoringData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '生成失败',
        icon: 'error'
      });
    }
  },
  
  onClearAlerts() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有告警记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('system_alerts');
          this.loadMonitoringData();
          wx.showToast({ title: '已清空' });
        }
      }
    });
  },
  
  onExportLogs() {
    const logs = wx.getStorageSync('app_logs') || [];
    const alerts = wx.getStorageSync('system_alerts') || [];
    const reports = wx.getStorageSync('daily_reports') || [];
    
    const exportData = {
      exportTime: new Date().toISOString(),
      logs: logs.slice(0, 100),
      alerts: alerts.slice(0, 50),
      reports: reports.slice(0, 10)
    };
    
    // 导出到剪贴板
    wx.setClipboardData({
      data: JSON.stringify(exportData, null, 2),
      success: () => {
        wx.showToast({ title: '已复制到剪贴板' });
      }
    });
  }
});
```

## 🔧 监控系统初始化

### 应用启动时初始化
```javascript
// app.js
App({
  onLaunch() {
    this.initMonitoring();
  },
  
  initMonitoring() {
    // 初始化各个监控模块
    ErrorMonitor.init();
    AlertManager.init();
    MemoryMonitor.startMonitoring();
    
    // 记录应用启动
    Logger.info('应用启动', {
      version: this.getVersion(),
      systemInfo: wx.getSystemInfoSync(),
      timestamp: new Date().toISOString()
    });
    
    // 检查紧急模式
    const emergencyMode = wx.getStorageSync('emergency_mode');
    if (emergencyMode) {
      Logger.warn('应用在紧急模式下启动');
      this.handleEmergencyMode();
    }
    
    // 清理过期数据
    this.cleanupOldData();
  },
  
  handleEmergencyMode() {
    // 紧急模式下的处理逻辑
    wx.showModal({
      title: '系统提示',
      content: '应用正在紧急模式运行，部分功能可能受限',
      showCancel: false
    });
  },
  
  cleanupOldData() {
    // 清理7天前的日志
    const logs = wx.getStorageSync('app_logs') || [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const filteredLogs = logs.filter(log => {
      return new Date(log.timestamp) > sevenDaysAgo;
    });
    
    if (filteredLogs.length !== logs.length) {
      wx.setStorageSync('app_logs', filteredLogs);
      Logger.info('清理过期日志', { 
        removed: logs.length - filteredLogs.length 
      });
    }
  },
  
  getVersion() {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.version;
  }
});
```

---

*本性能监控指南提供了完整的监控体系实施方案*  
*最后更新时间：2024年1月*

**全面的性能监控是产品稳定运行的重要保障！** 📊