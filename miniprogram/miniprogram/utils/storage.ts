/**
 * 本地存储管理工具类
 * 封装微信小程序的本地存储API，提供类型安全的存储操作
 */

import { STORAGE_KEYS } from '../types/index';

export class StorageManager {
  /**
   * 存储数据
   * @param key 存储键名
   * @param data 要存储的数据
   */
  static setItem<T>(key: string, data: T): Promise<void> {
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
   * @param key 存储键名
   * @param defaultValue 默认值
   */
  static getItem<T>(key: string, defaultValue?: T): Promise<T | undefined> {
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
   * @param key 存储键名
   */
  static removeItem(key: string): Promise<void> {
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
  static clear(): Promise<void> {
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
  static getStorageInfo(): Promise<wx.GetStorageInfoSuccessCallbackResult> {
    return new Promise((resolve, reject) => {
      wx.getStorageInfo({
        success: (res) => resolve(res),
        fail: (error) => reject(error),
      });
    });
  }
}

// 业务相关的存储操作封装
export class FertilityStorage {
  /**
   * 保存用户设置
   */
  static async saveUserSettings(settings: any): Promise<void> {
    return StorageManager.setItem(STORAGE_KEYS.USER_SETTINGS, settings);
  }

  /**
   * 获取用户设置
   */
  static async getUserSettings(): Promise<any> {
    return StorageManager.getItem(STORAGE_KEYS.USER_SETTINGS);
  }

  /**
   * 保存日记录数据
   */
  static async saveDayRecords(records: any): Promise<void> {
    return StorageManager.setItem(STORAGE_KEYS.DAY_RECORDS, records);
  }

  /**
   * 获取日记录数据
   */
  static async getDayRecords(): Promise<any> {
    return StorageManager.getItem(STORAGE_KEYS.DAY_RECORDS, {});
  }

  /**
   * 保存周期数据
   */
  static async saveCycles(cycles: any): Promise<void> {
    return StorageManager.setItem(STORAGE_KEYS.CYCLES, cycles);
  }

  /**
   * 获取周期数据
   */
  static async getCycles(): Promise<any> {
    return StorageManager.getItem(STORAGE_KEYS.CYCLES, []);
  }

  /**
   * 保存统计数据
   */
  static async saveStatistics(statistics: any): Promise<void> {
    return StorageManager.setItem(STORAGE_KEYS.STATISTICS, statistics);
  }

  /**
   * 获取统计数据
   */
  static async getStatistics(): Promise<any> {
    return StorageManager.getItem(STORAGE_KEYS.STATISTICS);
  }
}