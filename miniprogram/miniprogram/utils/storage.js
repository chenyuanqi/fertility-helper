/**
 * 本地存储管理工具类
 * 封装微信小程序的本地存储API，提供类型安全的存储操作
 */

// 本地存储键名常量
const STORAGE_KEYS = {
  USER_SETTINGS: 'fertility_user_settings',
  DAY_RECORDS: 'fertility_day_records',
  CYCLES: 'fertility_cycles',
  STATISTICS: 'fertility_statistics',
  APP_VERSION: 'fertility_app_version',
  BACKUP_DATA: 'fertility_backup_data',
  LAST_SYNC: 'fertility_last_sync',
};

class StorageManager {
  /**
   * 存储数据
   * @param {string} key 存储键名
   * @param {any} data 要存储的数据
   */
  static setItem(key, data) {
    return new Promise((resolve, reject) => {
      try {
        wx.setStorage({
          key,
          data,
          success: () => resolve(),
          fail: (error) => reject(error),
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取数据
   * @param {string} key 存储键名
   * @param {any} defaultValue 默认值
   */
  static getItem(key, defaultValue) {
    return new Promise((resolve) => {
      try {
        wx.getStorage({
          key,
          success: (res) => resolve(res.data),
          fail: () => resolve(defaultValue),
        });
      } catch (error) {
        resolve(defaultValue);
      }
    });
  }

  /**
   * 删除数据
   * @param {string} key 存储键名
   */
  static removeItem(key) {
    return new Promise((resolve, reject) => {
      wx.removeStorage({
        key,
        success: () => resolve(),
        fail: (error) => reject(error),
      });
    });
  }

  /**
   * 清空所有存储
   */
  static clear() {
    return new Promise((resolve, reject) => {
      wx.clearStorage({
        success: () => resolve(),
        fail: (error) => reject(error),
      });
    });
  }

  /**
   * 获取存储信息
   */
  static getStorageInfo() {
    return new Promise((resolve, reject) => {
      wx.getStorageInfo({
        success: (res) => resolve(res),
        fail: (error) => reject(error),
      });
    });
  }
}

// 业务相关的存储操作封装
class FertilityStorage {
  /**
   * 保存用户设置
   */
  static async saveUserSettings(settings) {
    try {
      // 先同步写入，确保其他使用 getStorageSync 的页面（如日历）能立即读到最新值
      try { wx.setStorageSync(STORAGE_KEYS.USER_SETTINGS, settings); } catch (_) {}
      // 再异步备份写入
      await StorageManager.setItem(STORAGE_KEYS.USER_SETTINGS, settings);
      return true;
    } catch (error) {
      console.error('saveUserSettings 保存失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户设置
   */
  static async getUserSettings() {
    return StorageManager.getItem(STORAGE_KEYS.USER_SETTINGS);
  }

  /**
   * 保存日记录数据
   */
  static async saveDayRecords(records) {
    return StorageManager.setItem(STORAGE_KEYS.DAY_RECORDS, records);
  }

  /**
   * 获取日记录数据
   */
  static async getDayRecords() {
    return StorageManager.getItem(STORAGE_KEYS.DAY_RECORDS, {});
  }

  /**
   * 保存周期数据
   */
  static async saveCycles(cycles) {
    console.log('=== FertilityStorage.saveCycles 开始保存周期数据 ===');
    console.log('要保存的数据:', cycles);
    console.log('数据数量:', cycles ? cycles.length : 0);
    
    try {
      // 数据验证
      if (!Array.isArray(cycles)) {
        throw new Error('周期数据必须是数组格式');
      }
      
      // 使用同步存储确保数据立即写入
      wx.setStorageSync(STORAGE_KEYS.CYCLES, cycles);
      console.log('同步存储完成');
      
      // 再次使用异步存储作为备份
      await StorageManager.setItem(STORAGE_KEYS.CYCLES, cycles);
      console.log('异步存储完成');
      
      // 验证数据是否保存成功
      const savedData = await StorageManager.getItem(STORAGE_KEYS.CYCLES, []);
      console.log('保存后验证数据:', savedData);
      console.log('验证数据数量:', savedData ? savedData.length : 0);
      
      if (!savedData || savedData.length !== cycles.length) {
        console.error('数据长度不匹配:', {
          original: cycles.length,
          saved: savedData ? savedData.length : 0
        });
        throw new Error('数据保存验证失败：长度不匹配');
      }
      
      // 验证关键字段
      for (let i = 0; i < cycles.length; i++) {
        const original = cycles[i];
        const saved = savedData[i];
        
        if (!saved || saved.startDate !== original.startDate || saved.id !== original.id) {
          console.error('数据内容不匹配:', {
            index: i,
            original: original,
            saved: saved
          });
          throw new Error(`数据保存验证失败：第${i}项内容不匹配`);
        }
      }
      
      console.log('=== FertilityStorage.saveCycles 保存成功 ===');
      return true;
    } catch (error) {
      console.error('=== FertilityStorage.saveCycles 保存失败 ===');
      console.error('错误详情:', error);
      throw error;
    }
  }

  /**
   * 获取周期数据
   */
  static async getCycles() {
    try {
      const cycles = await StorageManager.getItem(STORAGE_KEYS.CYCLES, []);
      console.log('FertilityStorage.getCycles 获取周期数据:', cycles);
      return cycles;
    } catch (error) {
      console.error('FertilityStorage.getCycles 获取失败:', error);
      return [];
    }
  }

  /**
   * 保存统计数据
   */
  static async saveStatistics(statistics) {
    return StorageManager.setItem(STORAGE_KEYS.STATISTICS, statistics);
  }

  /**
   * 获取统计数据
   */
  static async getStatistics() {
    return StorageManager.getItem(STORAGE_KEYS.STATISTICS);
  }
}

module.exports = {
  StorageManager,
  FertilityStorage,
  STORAGE_KEYS
};