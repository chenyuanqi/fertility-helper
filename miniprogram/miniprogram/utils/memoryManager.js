/**
 * 内存管理工具
 * 提供内存监控、清理和优化功能
 */

class MemoryManager {
  constructor() {
    this.memoryWarningThreshold = 50 * 1024 * 1024; // 50MB
    this.cleanupCallbacks = [];
    this.isMonitoring = false;
    
    // 监听内存警告
    wx.onMemoryWarning && wx.onMemoryWarning((res) => {
      console.warn('内存警告:', res.level);
      this.handleMemoryWarning(res.level);
    });
  }

  /**
   * 开始内存监控
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // 每30秒检查一次
  }

  /**
   * 停止内存监控
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
  }

  /**
   * 检查内存使用情况
   */
  checkMemoryUsage() {
    if (!wx.getPerformance) return;
    
    try {
      const performance = wx.getPerformance();
      const memInfo = performance.getMemoryInfo && performance.getMemoryInfo();
      
      if (memInfo && memInfo.usedJSHeapSize > this.memoryWarningThreshold) {
        console.warn('内存使用过高:', memInfo);
        this.performCleanup('high_usage');
      }
    } catch (error) {
      console.error('内存检查失败:', error);
    }
  }

  /**
   * 处理内存警告
   */
  handleMemoryWarning(level) {
    switch (level) {
      case 5: // TRIM_MEMORY_RUNNING_CRITICAL
        this.performCleanup('critical');
        break;
      case 10: // TRIM_MEMORY_RUNNING_LOW
        this.performCleanup('low');
        break;
      case 15: // TRIM_MEMORY_RUNNING_MODERATE
        this.performCleanup('moderate');
        break;
      default:
        this.performCleanup('warning');
    }
  }

  /**
   * 执行内存清理
   */
  performCleanup(level) {
    console.log(`执行内存清理 - 级别: ${level}`);
    
    // 执行注册的清理回调
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback(level);
      } catch (error) {
        console.error('清理回调执行失败:', error);
      }
    });

    // 强制垃圾回收（如果支持）
    if (typeof gc === 'function') {
      gc();
    }
  }

  /**
   * 注册清理回调
   */
  registerCleanupCallback(callback) {
    if (typeof callback === 'function') {
      this.cleanupCallbacks.push(callback);
    }
  }

  /**
   * 移除清理回调
   */
  unregisterCleanupCallback(callback) {
    const index = this.cleanupCallbacks.indexOf(callback);
    if (index > -1) {
      this.cleanupCallbacks.splice(index, 1);
    }
  }

  /**
   * 获取内存信息
   */
  getMemoryInfo() {
    if (!wx.getPerformance) {
      return { supported: false };
    }

    try {
      const performance = wx.getPerformance();
      const memInfo = performance.getMemoryInfo && performance.getMemoryInfo();
      
      return {
        supported: true,
        ...memInfo
      };
    } catch (error) {
      console.error('获取内存信息失败:', error);
      return { supported: false, error: error.message };
    }
  }
}

// 创建全局实例
const memoryManager = new MemoryManager();

// 注册核心清理功能
memoryManager.registerCleanupCallback((level) => {
  // 清理图片缓存
  const imageOptimizer = require('./imageOptimizer');
  if (level === 'critical' || level === 'low') {
    imageOptimizer.clearCache();
    console.log('已清理图片缓存');
  }
});

memoryManager.registerCleanupCallback((level) => {
  // 清理数据缓存
  const dataLoader = require('./dataLoader');
  if (level === 'critical') {
    dataLoader.clearCache();
    console.log('已清理数据缓存');
  } else if (level === 'low' || level === 'moderate') {
    dataLoader.cleanExpiredCache();
    console.log('已清理过期数据缓存');
  }
});

// 自动开始监控
memoryManager.startMonitoring();

module.exports = memoryManager;