/**
 * 性能监控工具
 * 提供页面加载时间、渲染性能和用户体验指标监控
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = true;
  }

  /**
   * 开始性能监控
   */
  startMonitoring(pageName) {
    if (!this.isEnabled) return;
    
    const startTime = Date.now();
    this.metrics.set(`${pageName}_start`, startTime);
    
    // 监控页面加载时间
    this.monitorPageLoad(pageName);
    
    // 监控渲染性能
    this.monitorRenderPerformance(pageName);
  }

  /**
   * 结束性能监控
   */
  endMonitoring(pageName) {
    if (!this.isEnabled) return;
    
    const endTime = Date.now();
    const startTime = this.metrics.get(`${pageName}_start`);
    
    if (startTime) {
      const loadTime = endTime - startTime;
      this.metrics.set(`${pageName}_load_time`, loadTime);
      
      // 记录性能数据
      this.recordPerformance(pageName, {
        loadTime,
        timestamp: endTime
      });
      
      console.log(`页面 ${pageName} 加载时间: ${loadTime}ms`);
    }
  }

  /**
   * 监控页面加载时间
   */
  monitorPageLoad(pageName) {
    // 监控首屏渲染时间
    wx.nextTick(() => {
      const firstPaintTime = Date.now();
      const startTime = this.metrics.get(`${pageName}_start`);
      if (startTime) {
        const firstPaint = firstPaintTime - startTime;
        this.metrics.set(`${pageName}_first_paint`, firstPaint);
        console.log(`页面 ${pageName} 首屏渲染时间: ${firstPaint}ms`);
      }
    });
  }

  /**
   * 监控渲染性能
   */
  monitorRenderPerformance(pageName) {
    if (!wx.getPerformance) return;
    
    try {
      const performance = wx.getPerformance();
      
      // 监控FPS
      if (performance.createObserver) {
        const observer = performance.createObserver((entryList) => {
          const entries = entryList.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'render') {
              this.recordRenderMetric(pageName, entry);
            }
          });
        });
        
        observer.observe({ entryTypes: ['render'] });
        this.observers.push(observer);
      }
    } catch (error) {
      console.error('渲染性能监控失败:', error);
    }
  }

  /**
   * 记录渲染指标
   */
  recordRenderMetric(pageName, entry) {
    const fps = 1000 / entry.duration;
    const key = `${pageName}_fps`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const fpsArray = this.metrics.get(key);
    fpsArray.push(fps);
    
    // 只保留最近50个FPS数据
    if (fpsArray.length > 50) {
      fpsArray.shift();
    }
    
    // 计算平均FPS
    const avgFps = fpsArray.reduce((sum, val) => sum + val, 0) / fpsArray.length;
    
    if (avgFps < 30) {
      console.warn(`页面 ${pageName} FPS过低: ${avgFps.toFixed(2)}`);
    }
  }

  /**
   * 记录用户操作性能
   */
  recordUserAction(actionName, startTime, endTime) {
    if (!this.isEnabled) return;
    
    const duration = endTime - startTime;
    const key = `action_${actionName}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const actionArray = this.metrics.get(key);
    actionArray.push(duration);
    
    // 只保留最近20个操作数据
    if (actionArray.length > 20) {
      actionArray.shift();
    }
    
    console.log(`用户操作 ${actionName} 耗时: ${duration}ms`);
    
    // 如果操作耗时过长，发出警告
    if (duration > 1000) {
      console.warn(`用户操作 ${actionName} 响应时间过长: ${duration}ms`);
    }
  }

  /**
   * 记录性能数据到本地存储
   */
  recordPerformance(pageName, data) {
    try {
      const key = 'performance_data';
      let performanceData = wx.getStorageSync(key) || {};
      
      if (!performanceData[pageName]) {
        performanceData[pageName] = [];
      }
      
      performanceData[pageName].push(data);
      
      // 只保留最近100条记录
      if (performanceData[pageName].length > 100) {
        performanceData[pageName] = performanceData[pageName].slice(-100);
      }
      
      wx.setStorageSync(key, performanceData);
    } catch (error) {
      console.error('性能数据记录失败:', error);
    }
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport() {
    try {
      const performanceData = wx.getStorageSync('performance_data') || {};
      const report = {};
      
      Object.keys(performanceData).forEach(pageName => {
        const pageData = performanceData[pageName];
        if (pageData.length > 0) {
          const loadTimes = pageData.map(d => d.loadTime).filter(t => t);
          
          report[pageName] = {
            totalSamples: pageData.length,
            averageLoadTime: loadTimes.length > 0 ? 
              (loadTimes.reduce((sum, t) => sum + t, 0) / loadTimes.length).toFixed(2) : 0,
            minLoadTime: loadTimes.length > 0 ? Math.min(...loadTimes) : 0,
            maxLoadTime: loadTimes.length > 0 ? Math.max(...loadTimes) : 0
          };
        }
      });
      
      return report;
    } catch (error) {
      console.error('获取性能报告失败:', error);
      return {};
    }
  }

  /**
   * 清理性能数据
   */
  clearPerformanceData() {
    try {
      wx.removeStorageSync('performance_data');
      this.metrics.clear();
      console.log('性能数据已清理');
    } catch (error) {
      console.error('清理性能数据失败:', error);
    }
  }

  /**
   * 停止所有监控
   */
  stopAllMonitoring() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect();
      } catch (error) {
        console.error('停止性能监控失败:', error);
      }
    });
    this.observers = [];
    this.isEnabled = false;
  }

  /**
   * 启用/禁用监控
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopAllMonitoring();
    }
  }
}

// 创建全局实例
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;