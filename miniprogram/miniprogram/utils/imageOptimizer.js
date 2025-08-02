/**
 * 图片资源优化工具
 * 提供图片懒加载、预加载和缓存管理功能
 */

class ImageOptimizer {
  constructor() {
    this.imageCache = new Map();
    this.preloadQueue = [];
    this.isPreloading = false;
  }

  /**
   * 图片懒加载
   * @param {string} src 图片路径
   * @param {Function} callback 加载完成回调
   */
  lazyLoad(src, callback) {
    if (this.imageCache.has(src)) {
      callback && callback(null, this.imageCache.get(src));
      return;
    }

    wx.getImageInfo({
      src: src,
      success: (res) => {
        this.imageCache.set(src, res);
        callback && callback(null, res);
      },
      fail: (err) => {
        console.error('图片加载失败:', src, err);
        callback && callback(err);
      }
    });
  }

  /**
   * 批量预加载图片
   * @param {Array} imageList 图片路径数组
   */
  preloadImages(imageList) {
    this.preloadQueue = [...imageList];
    if (!this.isPreloading) {
      this._processPreloadQueue();
    }
  }

  /**
   * 处理预加载队列
   */
  _processPreloadQueue() {
    if (this.preloadQueue.length === 0) {
      this.isPreloading = false;
      return;
    }

    this.isPreloading = true;
    const src = this.preloadQueue.shift();
    
    this.lazyLoad(src, () => {
      // 继续处理下一个
      setTimeout(() => {
        this._processPreloadQueue();
      }, 50); // 避免过于频繁的请求
    });
  }

  /**
   * 清理图片缓存
   */
  clearCache() {
    this.imageCache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize() {
    return this.imageCache.size;
  }
}

// 创建全局实例
const imageOptimizer = new ImageOptimizer();

// 预加载核心图标
const coreIcons = [
  '/assets/icons/success.png',
  '/assets/icons/warning.png',
  '/assets/icons/error.png',
  '/assets/icons/info.png'
];

imageOptimizer.preloadImages(coreIcons);

module.exports = imageOptimizer;