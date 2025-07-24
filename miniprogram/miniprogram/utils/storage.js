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
    return StorageManager.setItem(STORAGE_KEYS.USER_SETTINGS, settings);
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
    return StorageManager.setItem(STORAGE_KEYS.CYCLES, cycles);
  }

  /**
   * 获取周期数据
   */
  static async getCycles() {
    return StorageManager.getItem(STORAGE_KEYS.CYCLES, []);
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