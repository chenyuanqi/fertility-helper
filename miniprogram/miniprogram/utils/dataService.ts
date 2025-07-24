/**
 * 数据服务类
 * 提供高级的数据操作接口，包括批量操作、数据分析等
 */

import { DataManager } from './dataManager';
import { DateUtils } from './date';
import {
  DayRecord,
  TemperatureRecord,
  MenstrualRecord,
  IntercourseRecord,
  SymptomRecord,
  MenstrualCycle,
  UserSettings,
  StatisticsData,
  QueryOptions,
  DataOperationResult,
  ChartDataPoint
} from '../types/index';

export class DataService {
  private dataManager: DataManager;

  constructor() {
    this.dataManager = DataManager.getInstance();
  }

  /**
   * 批量保存记录
   */
  async batchSaveRecords(records: {
    temperature?: Omit<TemperatureRecord, 'id' | 'createdAt' | 'updatedAt'>[];
    menstrual?: Omit<MenstrualRecord, 'id' | 'createdAt' | 'updatedAt'>[];
    intercourse?: Omit<IntercourseRecord, 'id' | 'createdAt' | 'updatedAt'>[];
    symptoms?: Omit<SymptomRecord, 'id' | 'createdAt' | 'updatedAt'>[];
  }): Promise<DataOperationResult<{
    temperature: number;
    menstrual: number;
    intercourse: number;
    symptoms: number;
  }>> {
    try {
      const results = {
        temperature: 0,
        menstrual: 0,
        intercourse: 0,
        symptoms: 0,
      };

      // 批量保存体温记录
      if (records.temperature) {
        for (const record of records.temperature) {
          const result = await this.dataManager.saveTemperatureRecord(record);
          if (result.success) {
            results.temperature++;
          }
        }
      }

      // 批量保存月经记录
      if (records.menstrual) {
        for (const record of records.menstrual) {
          const result = await this.dataManager.saveMenstrualRecord(record);
          if (result.success) {
            results.menstrual++;
          }
        }
      }

      // 批量保存同房记录
      if (records.intercourse) {
        for (const record of records.intercourse) {
          const result = await this.dataManager.saveIntercourseRecord(record);
          if (result.success) {
            results.intercourse++;
          }
        }
      }

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'BATCH_SAVE_ERROR',
          message: '批量保存失败',
          details: error,
        },
      };
    }
  }

  /**
   * 获取图表数据
   */
  async getChartData(startDate: string, endDate: string): Promise<DataOperationResult<ChartDataPoint[]>> {
    try {
      const result = await this.dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (!result.success) {
        return result;
      }

      const dayRecords = result.data || [];
      const dateRange = DateUtils.getDateRange(startDate, endDate);
      
      const chartData: ChartDataPoint[] = dateRange.map(date => {
        const dayRecord = dayRecords.find(record => record.date === date);
        
        const dataPoint: ChartDataPoint = {
          date,
          hasIntercourse: !!(dayRecord?.intercourse && dayRecord.intercourse.length > 0),
        };

        // 添加体温数据
        if (dayRecord?.temperature) {
          dataPoint.temperature = dayRecord.temperature.temperature;
        }

        // 添加月经数据
        if (dayRecord?.menstrual) {
          dataPoint.menstrualFlow = dayRecord.menstrual.flow;
        }

        // 添加备注
        if (dayRecord?.temperature?.note || dayRecord?.menstrual?.note) {
          dataPoint.note = [
            dayRecord.temperature?.note,
            dayRecord.menstrual?.note,
          ].filter(Boolean).join('; ');
        }

        return dataPoint;
      });

      return {
        success: true,
        data: chartData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CHART_DATA_ERROR',
          message: '获取图表数据失败',
          details: error,
        },
      };
    }
  }

  /**
   * 获取月度数据摘要
   */
  async getMonthSummary(year: number, month: number): Promise<DataOperationResult<{
    totalDays: number;
    recordedDays: number;
    temperatureRecords: number;
    menstrualDays: number;
    intercourseCount: number;
    averageTemperature: number;
    cycleInfo?: {
      cycleDay: number;
      phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
    };
  }>> {
    try {
      const startDate = DateUtils.formatDate(new Date(year, month - 1, 1));
      const endDate = DateUtils.formatDate(new Date(year, month, 0));
      
      const result = await this.dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (!result.success) {
        return result;
      }

      const dayRecords = result.data || [];
      const daysInMonth = new Date(year, month, 0).getDate();
      
      let temperatureRecords = 0;
      let menstrualDays = 0;
      let intercourseCount = 0;
      let temperatureSum = 0;
      let temperatureCount = 0;

      dayRecords.forEach(record => {
        if (record.temperature) {
          temperatureRecords++;
          temperatureSum += record.temperature.temperature;
          temperatureCount++;
        }
        
        if (record.menstrual) {
          menstrualDays++;
        }
        
        if (record.intercourse) {
          intercourseCount += record.intercourse.length;
        }
      });

      const summary = {
        totalDays: daysInMonth,
        recordedDays: dayRecords.length,
        temperatureRecords,
        menstrualDays,
        intercourseCount,
        averageTemperature: temperatureCount > 0 ? Math.round((temperatureSum / temperatureCount) * 100) / 100 : 0,
      };

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MONTH_SUMMARY_ERROR',
          message: '获取月度摘要失败',
          details: error,
        },
      };
    }
  }

  /**
   * 搜索记录
   */
  async searchRecords(query: {
    keyword?: string;
    dateRange?: { start: string; end: string };
    hasTemperature?: boolean;
    hasMenstrual?: boolean;
    hasIntercourse?: boolean;
    temperatureRange?: { min: number; max: number };
    menstrualFlow?: ('light' | 'medium' | 'heavy')[];
  }): Promise<DataOperationResult<DayRecord[]>> {
    try {
      const startDate = query.dateRange?.start || DateUtils.subtractDays(DateUtils.getToday(), 365);
      const endDate = query.dateRange?.end || DateUtils.getToday();
      
      const result = await this.dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (!result.success) {
        return result;
      }

      let records = result.data || [];

      // 关键词搜索
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        records = records.filter(record => {
          const searchText = [
            record.temperature?.note,
            record.menstrual?.note,
            record.symptoms?.note,
            ...(record.intercourse?.map(i => i.note) || []),
          ].filter(Boolean).join(' ').toLowerCase();
          
          return searchText.includes(keyword);
        });
      }

      // 按类型过滤
      if (query.hasTemperature !== undefined) {
        records = records.filter(record => !!record.temperature === query.hasTemperature);
      }

      if (query.hasMenstrual !== undefined) {
        records = records.filter(record => !!record.menstrual === query.hasMenstrual);
      }

      if (query.hasIntercourse !== undefined) {
        records = records.filter(record => !!(record.intercourse && record.intercourse.length > 0) === query.hasIntercourse);
      }

      // 体温范围过滤
      if (query.temperatureRange) {
        const { min, max } = query.temperatureRange;
        records = records.filter(record => {
          if (!record.temperature) return false;
          const temp = record.temperature.temperature;
          return temp >= min && temp <= max;
        });
      }

      // 经量过滤
      if (query.menstrualFlow && query.menstrualFlow.length > 0) {
        records = records.filter(record => {
          if (!record.menstrual) return false;
          return query.menstrualFlow!.includes(record.menstrual.flow);
        });
      }

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: '搜索记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 获取最近的记录
   */
  async getRecentRecords(limit: number = 10): Promise<DataOperationResult<DayRecord[]>> {
    try {
      const endDate = DateUtils.getToday();
      const startDate = DateUtils.subtractDays(endDate, 30); // 最近30天
      
      const result = await this.dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (!result.success) {
        return result;
      }

      const records = (result.data || [])
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, limit);

      return {
        success: true,
        data: records,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'RECENT_RECORDS_ERROR',
          message: '获取最近记录失败',
          details: error,
        },
      };
    }
  }

  /**
   * 数据完整性检查
   */
  async checkDataIntegrity(): Promise<DataOperationResult<{
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    issues: string[];
  }>> {
    try {
      const startDate = DateUtils.subtractDays(DateUtils.getToday(), 365);
      const endDate = DateUtils.getToday();
      
      const result = await this.dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (!result.success) {
        return result;
      }

      const records = result.data || [];
      const issues: string[] = [];
      let validRecords = 0;
      let invalidRecords = 0;

      records.forEach(record => {
        let isValid = true;

        // 检查体温记录
        if (record.temperature) {
          const temp = record.temperature.temperature;
          if (temp < 35 || temp > 42) {
            issues.push(`${record.date}: 体温异常 (${temp}°C)`);
            isValid = false;
          }
        }

        // 检查日期格式
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
          issues.push(`${record.date}: 日期格式错误`);
          isValid = false;
        }

        // 检查未来日期
        if (record.date > DateUtils.getToday()) {
          issues.push(`${record.date}: 不能是未来日期`);
          isValid = false;
        }

        if (isValid) {
          validRecords++;
        } else {
          invalidRecords++;
        }
      });

      return {
        success: true,
        data: {
          totalRecords: records.length,
          validRecords,
          invalidRecords,
          issues,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTEGRITY_CHECK_ERROR',
          message: '数据完整性检查失败',
          details: error,
        },
      };
    }
  }

  /**
   * 导出数据
   */
  async exportData(options: {
    format: 'json' | 'csv';
    dateRange?: { start: string; end: string };
    includeTypes?: ('temperature' | 'menstrual' | 'intercourse' | 'symptoms')[];
  }): Promise<DataOperationResult<string>> {
    try {
      const startDate = options.dateRange?.start || DateUtils.subtractDays(DateUtils.getToday(), 365);
      const endDate = options.dateRange?.end || DateUtils.getToday();
      
      const result = await this.dataManager.getDayRecordsInRange(startDate, endDate);
      
      if (!result.success) {
        return result;
      }

      const records = result.data || [];
      const includeTypes = options.includeTypes || ['temperature', 'menstrual', 'intercourse', 'symptoms'];

      if (options.format === 'json') {
        const exportData = records.map(record => {
          const filtered: any = { date: record.date };
          
          if (includeTypes.includes('temperature') && record.temperature) {
            filtered.temperature = record.temperature;
          }
          
          if (includeTypes.includes('menstrual') && record.menstrual) {
            filtered.menstrual = record.menstrual;
          }
          
          if (includeTypes.includes('intercourse') && record.intercourse) {
            filtered.intercourse = record.intercourse;
          }
          
          if (includeTypes.includes('symptoms') && record.symptoms) {
            filtered.symptoms = record.symptoms;
          }
          
          return filtered;
        });

        return {
          success: true,
          data: JSON.stringify(exportData, null, 2),
        };
      } else if (options.format === 'csv') {
        // CSV格式导出
        const headers = ['日期'];
        if (includeTypes.includes('temperature')) {
          headers.push('体温', '体温时间', '体温备注');
        }
        if (includeTypes.includes('menstrual')) {
          headers.push('经量', '经期开始', '经期结束', '经期备注');
        }
        if (includeTypes.includes('intercourse')) {
          headers.push('同房次数', '同房备注');
        }

        const csvRows = [headers.join(',')];
        
        records.forEach(record => {
          const row: string[] = [record.date];
          
          if (includeTypes.includes('temperature')) {
            row.push(
              record.temperature?.temperature?.toString() || '',
              record.temperature?.time || '',
              record.temperature?.note || ''
            );
          }
          
          if (includeTypes.includes('menstrual')) {
            row.push(
              record.menstrual?.flow || '',
              record.menstrual?.isStart ? '是' : '',
              record.menstrual?.isEnd ? '是' : '',
              record.menstrual?.note || ''
            );
          }
          
          if (includeTypes.includes('intercourse')) {
            row.push(
              record.intercourse?.length?.toString() || '0',
              record.intercourse?.map(i => i.note).filter(Boolean).join('; ') || ''
            );
          }
          
          csvRows.push(row.map(cell => `"${cell}"`).join(','));
        });

        return {
          success: true,
          data: csvRows.join('\n'),
        };
      }

      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: '不支持的导出格式',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: '导出数据失败',
          details: error,
        },
      };
    }
  }
}