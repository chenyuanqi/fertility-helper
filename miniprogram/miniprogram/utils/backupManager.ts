/**
 * 数据备份与恢复管理器
 * 提供数据备份、恢复、导入导出功能
 */

import { StorageManager, FertilityStorage } from './storage';
import { DateUtils } from './date';
import { DataValidator } from './dataValidator';
import {
  BackupData,
  DataVersion,
  UserSettings,
  DayRecord,
  MenstrualCycle,
  StatisticsData,
  DataOperationResult,
  STORAGE_KEYS
} from '../types/index';

export interface BackupOptions {
  includeUserSettings?: boolean;
  includeDayRecords?: boolean;
  includeCycles?: boolean;
  includeStatistics?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  compress?: boolean;
}

export interface RestoreOptions {
  overwrite?: boolean;
  validateData?: boolean;
  repairData?: boolean;
  createBackupBeforeRestore?: boolean;
}

export class BackupManager {
  private static instance: BackupManager;

  /**
   * 获取单例实例
   */
  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * 创建完整备份
   */
  async createFullBackup(options: BackupOptions = {}): Promise<DataOperationResult<BackupData>> {
    try {
      const {
        includeUserSettings = true,
        includeDayRecords = true,
        includeCycles = true,
        includeStatistics = true,
        dateRange,
        compress = false
      } = options;

      const backupData: Partial<BackupData> = {
        version: '1.0.0',
        timestamp: DateUtils.formatISO(new Date())
      };

      // 备份用户设置
      if (includeUserSettings) {
        const userSettings = await FertilityStorage.getUserSettings();
        if (userSettings) {
          backupData.userSettings = userSettings;
        }
      }

      // 备份日记录
      if (includeDayRecords) {
        let dayRecords = await FertilityStorage.getDayRecords();
        
        // 如果指定了日期范围，过滤数据
        if (dateRange && dayRecords) {
          const filteredRecords: { [date: string]: DayRecord } = {};
          Object.entries(dayRecords).forEach(([date, record]) => {
            if (date >= dateRange.start && date <= dateRange.end) {
              filteredRecords[date] = record;
            }
          });
          dayRecords = filteredRecords;
        }
        
        if (dayRecords) {
          backupData.dayRecords = dayRecords;
        }
      }

      // 备份周期数据
      if (includeCycles) {
        const cycles = await FertilityStorage.getCycles();
        if (cycles) {
          backupData.cycles = cycles;
        }
      }

      // 备份统计数据
      if (includeStatistics) {
        const statistics = await FertilityStorage.getStatistics();
        if (statistics) {
          backupData.statistics = statistics;
        }
      }

      // 数据压缩（简单的JSON压缩）
      if (compress) {
        // 这里可以实现数据压缩逻辑
        // 例如移除不必要的字段、压缩字符串等
        this.compressBackupData(backupData);
      }

      // 保存备份到本地
      await StorageManager.setItem(STORAGE_KEYS.BACKUP_DATA, backupData);

      return {
        success: true,
        data: backupData as BackupData
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BACKUP_ERROR',
          message: '创建备份失败',
          details: error
        }
      };
    }
  }

  /**
   * 恢复数据
   */
  async restoreFromBackup(backupData: BackupData, options: RestoreOptions = {}): Promise<DataOperationResult<{
    restored: {
      userSettings: boolean;
      dayRecords: number;
      cycles: number;
      statistics: boolean;
    };
    warnings: string[];
  }>> {
    try {
      const {
        overwrite = false,
        validateData = true,
        repairData = true,
        createBackupBeforeRestore = true
      } = options;

      const restored = {
        userSettings: false,
        dayRecords: 0,
        cycles: 0,
        statistics: false
      };
      const warnings: string[] = [];

      // 恢复前创建当前数据备份
      if (createBackupBeforeRestore) {
        const currentBackup = await this.createFullBackup();
        if (currentBackup.success) {
          await StorageManager.setItem(`${STORAGE_KEYS.BACKUP_DATA}_before_restore_${Date.now()}`, currentBackup.data);
        }
      }

      // 数据验证
      if (validateData) {
        const validation = DataValidator.validateBatchData({
          dayRecords: backupData.dayRecords,
          userSettings: backupData.userSettings,
          cycles: backupData.cycles
        });

        if (!validation.isValid) {
          if (repairData && validation.fixedData) {
            // 使用修复后的数据
            if (validation.fixedData.dayRecords) {
              backupData.dayRecords = validation.fixedData.dayRecords;
            }
            if (validation.fixedData.userSettings) {
              backupData.userSettings = validation.fixedData.userSettings;
            }
            warnings.push('部分数据已自动修复');
          } else {
            return {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: '备份数据验证失败',
                details: validation.errors
              }
            };
          }
        }

        if (validation.warnings.length > 0) {
          warnings.push(...validation.warnings.map(w => w.message));
        }
      }

      // 恢复用户设置
      if (backupData.userSettings) {
        if (overwrite) {
          await FertilityStorage.saveUserSettings(backupData.userSettings);
          restored.userSettings = true;
        } else {
          const currentSettings = await FertilityStorage.getUserSettings();
          if (!currentSettings) {
            await FertilityStorage.saveUserSettings(backupData.userSettings);
            restored.userSettings = true;
          } else {
            warnings.push('用户设置已存在，跳过恢复');
          }
        }
      }

      // 恢复日记录
      if (backupData.dayRecords) {
        const currentRecords = await FertilityStorage.getDayRecords();
        let mergedRecords = { ...currentRecords };

        if (overwrite) {
          mergedRecords = { ...backupData.dayRecords };
          restored.dayRecords = Object.keys(backupData.dayRecords).length;
        } else {
          // 合并数据，不覆盖已存在的记录
          Object.entries(backupData.dayRecords).forEach(([date, record]) => {
            if (!mergedRecords[date]) {
              mergedRecords[date] = record;
              restored.dayRecords++;
            }
          });
        }

        await FertilityStorage.saveDayRecords(mergedRecords);
      }

      // 恢复周期数据
      if (backupData.cycles) {
        const currentCycles = await FertilityStorage.getCycles();
        let mergedCycles = [...currentCycles];

        if (overwrite) {
          mergedCycles = [...backupData.cycles];
          restored.cycles = backupData.cycles.length;
        } else {
          // 合并周期数据，避免重复
          backupData.cycles.forEach(backupCycle => {
            const exists = mergedCycles.some(cycle => 
              cycle.startDate === backupCycle.startDate && 
              cycle.endDate === backupCycle.endDate
            );
            if (!exists) {
              mergedCycles.push(backupCycle);
              restored.cycles++;
            }
          });
        }

        await FertilityStorage.saveCycles(mergedCycles);
      }

      // 恢复统计数据
      if (backupData.statistics) {
        if (overwrite) {
          await FertilityStorage.saveStatistics(backupData.statistics);
          restored.statistics = true;
        } else {
          const currentStats = await FertilityStorage.getStatistics();
          if (!currentStats) {
            await FertilityStorage.saveStatistics(backupData.statistics);
            restored.statistics = true;
          } else {
            warnings.push('统计数据已存在，跳过恢复');
          }
        }
      }

      return {
        success: true,
        data: {
          restored,
          warnings
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RESTORE_ERROR',
          message: '恢复数据失败',
          details: error
        }
      };
    }
  }

  /**
   * 导出数据为JSON字符串
   */
  async exportToJSON(options: BackupOptions = {}): Promise<DataOperationResult<string>> {
    try {
      const backupResult = await this.createFullBackup(options);
      
      if (!backupResult.success) {
        return backupResult;
      }

      const jsonString = JSON.stringify(backupResult.data, null, 2);
      
      return {
        success: true,
        data: jsonString
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: '导出JSON失败',
          details: error
        }
      };
    }
  }

  /**
   * 从JSON字符串导入数据
   */
  async importFromJSON(jsonString: string, options: RestoreOptions = {}): Promise<DataOperationResult<{
    restored: {
      userSettings: boolean;
      dayRecords: number;
      cycles: number;
      statistics: boolean;
    };
    warnings: string[];
  }>> {
    try {
      const backupData: BackupData = JSON.parse(jsonString);
      
      // 验证备份数据结构
      if (!backupData.version || !backupData.timestamp) {
        return {
          success: false,
          error: {
            code: 'INVALID_BACKUP',
            message: '无效的备份数据格式'
          }
        };
      }

      return await this.restoreFromBackup(backupData, options);
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'IMPORT_ERROR',
          message: '导入JSON失败',
          details: error
        }
      };
    }
  }

  /**
   * 获取备份历史
   */
  async getBackupHistory(): Promise<DataOperationResult<{
    current?: BackupData;
    history: { key: string; timestamp: string; size: number }[];
  }>> {
    try {
      const current = await StorageManager.getItem(STORAGE_KEYS.BACKUP_DATA);
      const history: { key: string; timestamp: string; size: number }[] = [];

      // 获取存储信息
      const storageInfo = await StorageManager.getStorageInfo();
      
      // 查找所有备份相关的键
      storageInfo.keys.forEach(key => {
        if (key.startsWith(STORAGE_KEYS.BACKUP_DATA) && key !== STORAGE_KEYS.BACKUP_DATA) {
          // 从键名中提取时间戳
          const timestampMatch = key.match(/_(\d+)$/);
          if (timestampMatch) {
            history.push({
              key,
              timestamp: new Date(parseInt(timestampMatch[1])).toISOString(),
              size: 0 // 小程序无法直接获取数据大小
            });
          }
        }
      });

      // 按时间戳排序
      history.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return {
        success: true,
        data: {
          current,
          history
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'HISTORY_ERROR',
          message: '获取备份历史失败',
          details: error
        }
      };
    }
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupKey?: string): Promise<DataOperationResult<boolean>> {
    try {
      const keyToDelete = backupKey || STORAGE_KEYS.BACKUP_DATA;
      await StorageManager.removeItem(keyToDelete);
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: '删除备份失败',
          details: error
        }
      };
    }
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups(keepCount: number = 5): Promise<DataOperationResult<number>> {
    try {
      const historyResult = await this.getBackupHistory();
      
      if (!historyResult.success) {
        return historyResult;
      }

      const { history } = historyResult.data!;
      
      if (history.length <= keepCount) {
        return {
          success: true,
          data: 0
        };
      }

      // 删除多余的备份
      const toDelete = history.slice(keepCount);
      let deletedCount = 0;

      for (const backup of toDelete) {
        const deleteResult = await this.deleteBackup(backup.key);
        if (deleteResult.success) {
          deletedCount++;
        }
      }

      return {
        success: true,
        data: deletedCount
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CLEANUP_ERROR',
          message: '清理旧备份失败',
          details: error
        }
      };
    }
  }

  /**
   * 压缩备份数据
   */
  private compressBackupData(data: Partial<BackupData>): void {
    // 移除不必要的字段
    if (data.dayRecords) {
      Object.values(data.dayRecords).forEach(record => {
        // 移除空的备注字段
        if (record.temperature?.note === '') {
          delete record.temperature.note;
        }
        if (record.menstrual?.note === '') {
          delete record.menstrual.note;
        }
        if (record.intercourse) {
          record.intercourse.forEach(intercourse => {
            if (intercourse.note === '') {
              delete intercourse.note;
            }
          });
        }
      });
    }

    // 可以添加更多压缩逻辑
    // 例如：字符串压缩、数据去重等
  }

  /**
   * 验证备份完整性
   */
  async validateBackup(backupData: BackupData): Promise<DataOperationResult<{
    isValid: boolean;
    issues: string[];
    statistics: {
      userSettings: boolean;
      dayRecordsCount: number;
      cyclesCount: number;
      statisticsExists: boolean;
    };
  }>> {
    try {
      const issues: string[] = [];
      
      // 检查版本信息
      if (!backupData.version) {
        issues.push('缺少版本信息');
      }
      
      if (!backupData.timestamp) {
        issues.push('缺少时间戳');
      }

      // 检查数据完整性
      const statistics = {
        userSettings: !!backupData.userSettings,
        dayRecordsCount: backupData.dayRecords ? Object.keys(backupData.dayRecords).length : 0,
        cyclesCount: backupData.cycles ? backupData.cycles.length : 0,
        statisticsExists: !!backupData.statistics
      };

      // 数据验证
      if (backupData.dayRecords || backupData.userSettings || backupData.cycles) {
        const validation = DataValidator.validateBatchData({
          dayRecords: backupData.dayRecords,
          userSettings: backupData.userSettings,
          cycles: backupData.cycles
        });

        if (!validation.isValid) {
          issues.push(...validation.errors.map(err => `${err.field}: ${err.message}`));
        }
      }

      return {
        success: true,
        data: {
          isValid: issues.length === 0,
          issues,
          statistics
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '验证备份失败',
          details: error
        }
      };
    }
  }
}