/**
 * 性能优化配置
 * 统一管理性能相关的配置参数
 */

const PerformanceConfig = {
  // 缓存配置
  cache: {
    // 数据缓存过期时间（毫秒）
    dataExpiry: 5 * 60 * 1000, // 5分钟
    // 图片缓存最大数量
    maxImageCache: 50,
    // 最大缓存大小（字节）
    maxCacheSize: 10 * 1024 * 1024, // 10MB
  },

  // 内存管理配置
  memory: {
    // 内存警告阈值（字节）
    warningThreshold: 50 * 1024 * 1024, // 50MB
    // 内存检查间隔（毫秒）
    checkInterval: 30 * 1000, // 30秒
    // 是否启用内存监控
    enableMonitoring: true,
  },

  // 性能监控配置
  monitoring: {
    // 是否启用性能监控
    enabled: true,
    // FPS监控样本数量
    fpsSampleSize: 50,
    // 用户操作监控样本数量
    actionSampleSize: 20,
    // 性能数据保留数量
    maxPerformanceRecords: 100,
  },

  // 数据加载配置
  dataLoading: {
    // 分页大小
    pageSize: 30,
    // 预加载延迟时间（毫秒）
    preloadDelay: 2000,
    // 最大并发加载数量
    maxConcurrentLoads: 3,
  },

  // 图片优化配置
  image: {
    // 预加载延迟（毫秒）
    preloadDelay: 50,
    // 是否启用懒加载
    enableLazyLoad: true,
    // 图片质量（0-100）
    quality: 80,
  },

  // 用户体验配置
  ux: {
    // 最大可接受的加载时间（毫秒）
    maxLoadTime: 3000,
    // 最大可接受的操作响应时间（毫秒）
    maxActionTime: 1000,
    // 最小可接受的FPS
    minFps: 30,
  },

  // 调试配置
  debug: {
    // 是否启用性能日志
    enablePerformanceLog: true,
    // 是否启用内存日志
    enableMemoryLog: true,
    // 是否启用缓存日志
    enableCacheLog: false,
  }
};

module.exports = PerformanceConfig;