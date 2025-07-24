/**
 * 数据验证和容错处理工具类
 * 提供数据完整性检查、修复和容错处理功能
 */

import { DateUtils } from './date';
import { Validator } from './validator';
import {
  DayRecord,
  TemperatureRecord,
  MenstrualRecord,
  IntercourseRecord,
  SymptomRecord,
  MenstrualCycle,
  UserSettings,
  DataOperationResult
} from '../types/index';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixedData?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export class DataValidator {
  /**
   * 验证体温记录
   */
  static validateTemperatureRecord(record: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData = { ...record };

    // 必填字段检查
    if (!record.date) {
      errors.push({
        field: 'date',
        message: '日期不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      // 日期格式验证
      const dateValidation = Validator.validateDate(record.date);
      if (!dateValidation.valid) {
        errors.push({
          field: 'date',
          message: dateValidation.message || '日期格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    if (!record.time) {
      errors.push({
        field: 'time',
        message: '时间不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      // 时间格式验证
      const timeValidation = Validator.validateTime(record.time);
      if (!timeValidation.valid) {
        errors.push({
          field: 'time',
          message: timeValidation.message || '时间格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    if (record.temperature === undefined || record.temperature === null) {
      errors.push({
        field: 'temperature',
        message: '体温不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      // 体温值验证
      const tempValidation = Validator.validateTemperature(record.temperature);
      if (!tempValidation.valid) {
        errors.push({
          field: 'temperature',
          message: tempValidation.message || '体温值无效',
          severity: 'error',
          code: 'INVALID_VALUE'
        });
      } else {
        // 体温异常警告
        if (record.temperature < 36.0) {
          warnings.push({
            field: 'temperature',
            message: '体温偏低，请确认测量是否正确',
            suggestion: '正常基础体温通常在36.0-37.0°C之间'
          });
        } else if (record.temperature > 37.5) {
          warnings.push({
            field: 'temperature',
            message: '体温偏高，可能存在发热',
            suggestion: '建议记录相关症状或咨询医生'
          });
        }
      }
    }

    // 备注长度检查
    if (record.note) {
      const noteValidation = Validator.validateNote(record.note);
      if (!noteValidation.valid) {
        errors.push({
          field: 'note',
          message: noteValidation.message || '备注格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 数据修复
    if (record.temperature && typeof record.temperature === 'string') {
      const numTemp = parseFloat(record.temperature);
      if (!isNaN(numTemp)) {
        fixedData.temperature = numTemp;
        warnings.push({
          field: 'temperature',
          message: '体温已自动转换为数字格式',
          suggestion: '建议使用数字类型存储体温数据'
        });
      }
    }

    // 时间格式修复
    if (record.time && record.time.length === 4 && !record.time.includes(':')) {
      // 修复 "0730" -> "07:30" 格式
      const hours = record.time.substring(0, 2);
      const minutes = record.time.substring(2, 4);
      fixedData.time = `${hours}:${minutes}`;
      warnings.push({
        field: 'time',
        message: '时间格式已自动修复',
        suggestion: '建议使用 HH:mm 格式'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : undefined
    };
  }

  /**
   * 验证月经记录
   */
  static validateMenstrualRecord(record: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData = { ...record };

    // 日期验证
    if (!record.date) {
      errors.push({
        field: 'date',
        message: '日期不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const dateValidation = Validator.validateDate(record.date);
      if (!dateValidation.valid) {
        errors.push({
          field: 'date',
          message: dateValidation.message || '日期格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 经量验证
    if (!record.flow) {
      errors.push({
        field: 'flow',
        message: '经量不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const flowValidation = Validator.validateMenstrualFlow(record.flow);
      if (!flowValidation.valid) {
        errors.push({
          field: 'flow',
          message: flowValidation.message || '经量值无效',
          severity: 'error',
          code: 'INVALID_VALUE'
        });
      }
    }

    // 逻辑验证
    if (record.isStart && record.isEnd) {
      errors.push({
        field: 'isStart,isEnd',
        message: '不能同时标记为经期开始和结束',
        severity: 'error',
        code: 'LOGICAL_ERROR'
      });
    }

    // 备注验证
    if (record.note) {
      const noteValidation = Validator.validateNote(record.note);
      if (!noteValidation.valid) {
        errors.push({
          field: 'note',
          message: noteValidation.message || '备注格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 数据修复
    if (typeof record.isStart !== 'boolean') {
      fixedData.isStart = !!record.isStart;
    }
    if (typeof record.isEnd !== 'boolean') {
      fixedData.isEnd = !!record.isEnd;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : undefined
    };
  }

  /**
   * 验证同房记录
   */
  static validateIntercourseRecord(record: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData = { ...record };

    // 日期验证
    if (!record.date) {
      errors.push({
        field: 'date',
        message: '日期不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const dateValidation = Validator.validateDate(record.date);
      if (!dateValidation.valid) {
        errors.push({
          field: 'date',
          message: dateValidation.message || '日期格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 时间验证
    if (!record.time) {
      errors.push({
        field: 'time',
        message: '时间不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const timeValidation = Validator.validateTime(record.time);
      if (!timeValidation.valid) {
        errors.push({
          field: 'time',
          message: timeValidation.message || '时间格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 备注验证
    if (record.note) {
      const noteValidation = Validator.validateNote(record.note);
      if (!noteValidation.valid) {
        errors.push({
          field: 'note',
          message: noteValidation.message || '备注格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 数据修复
    if (typeof record.protection !== 'boolean') {
      fixedData.protection = !!record.protection;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : undefined
    };
  }

  /**
   * 验证日记录
   */
  static validateDayRecord(record: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData = { ...record };

    // 日期验证
    if (!record.date) {
      errors.push({
        field: 'date',
        message: '日期不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    } else {
      const dateValidation = Validator.validateDate(record.date);
      if (!dateValidation.valid) {
        errors.push({
          field: 'date',
          message: dateValidation.message || '日期格式错误',
          severity: 'error',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // 验证子记录
    if (record.temperature) {
      const tempValidation = this.validateTemperatureRecord(record.temperature);
      if (!tempValidation.isValid) {
        errors.push(...tempValidation.errors.map(err => ({
          ...err,
          field: `temperature.${err.field}`
        })));
      }
      if (tempValidation.fixedData) {
        fixedData.temperature = tempValidation.fixedData;
      }
      warnings.push(...tempValidation.warnings.map(warn => ({
        ...warn,
        field: `temperature.${warn.field}`
      })));
    }

    if (record.menstrual) {
      const menstrualValidation = this.validateMenstrualRecord(record.menstrual);
      if (!menstrualValidation.isValid) {
        errors.push(...menstrualValidation.errors.map(err => ({
          ...err,
          field: `menstrual.${err.field}`
        })));
      }
      if (menstrualValidation.fixedData) {
        fixedData.menstrual = menstrualValidation.fixedData;
      }
      warnings.push(...menstrualValidation.warnings.map(warn => ({
        ...warn,
        field: `menstrual.${warn.field}`
      })));
    }

    if (record.intercourse && Array.isArray(record.intercourse)) {
      record.intercourse.forEach((intercourse: any, index: number) => {
        const intercourseValidation = this.validateIntercourseRecord(intercourse);
        if (!intercourseValidation.isValid) {
          errors.push(...intercourseValidation.errors.map(err => ({
            ...err,
            field: `intercourse[${index}].${err.field}`
          })));
        }
        if (intercourseValidation.fixedData) {
          if (!fixedData.intercourse) fixedData.intercourse = [];
          fixedData.intercourse[index] = intercourseValidation.fixedData;
        }
        warnings.push(...intercourseValidation.warnings.map(warn => ({
          ...warn,
          field: `intercourse[${index}].${warn.field}`
        })));
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : undefined
    };
  }

  /**
   * 验证用户设置
   */
  static validateUserSettings(settings: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData = { ...settings };

    // ID验证
    if (!settings.id) {
      errors.push({
        field: 'id',
        message: 'ID不能为空',
        severity: 'error',
        code: 'REQUIRED_FIELD'
      });
    }

    // 个人信息验证
    if (settings.personalInfo) {
      const { personalInfo } = settings;
      
      if (personalInfo.age !== undefined) {
        const ageValidation = Validator.validateAge(personalInfo.age);
        if (!ageValidation.valid) {
          errors.push({
            field: 'personalInfo.age',
            message: ageValidation.message || '年龄无效',
            severity: 'error',
            code: 'INVALID_VALUE'
          });
        }
      }

      if (personalInfo.averageCycleLength !== undefined) {
        const cycleValidation = Validator.validateCycleLength(personalInfo.averageCycleLength);
        if (!cycleValidation.valid) {
          errors.push({
            field: 'personalInfo.averageCycleLength',
            message: cycleValidation.message || '平均周期长度无效',
            severity: 'error',
            code: 'INVALID_VALUE'
          });
        }
      }

      if (personalInfo.averageLutealPhase !== undefined) {
        const lutealValidation = Validator.validateLutealPhaseLength(personalInfo.averageLutealPhase);
        if (!lutealValidation.valid) {
          errors.push({
            field: 'personalInfo.averageLutealPhase',
            message: lutealValidation.message || '平均黄体期长度无效',
            severity: 'error',
            code: 'INVALID_VALUE'
          });
        }
      }
    }

    // 提醒设置验证
    if (settings.reminders) {
      const { reminders } = settings;
      
      if (reminders.morningTemperature?.time) {
        const timeValidation = Validator.validateTime(reminders.morningTemperature.time);
        if (!timeValidation.valid) {
          errors.push({
            field: 'reminders.morningTemperature.time',
            message: '晨起体温提醒时间格式错误',
            severity: 'error',
            code: 'INVALID_FORMAT'
          });
        }
      }
    }

    // 偏好设置验证
    if (settings.preferences) {
      const { preferences } = settings;
      
      if (preferences.temperatureUnit && !['celsius', 'fahrenheit'].includes(preferences.temperatureUnit)) {
        errors.push({
          field: 'preferences.temperatureUnit',
          message: '温度单位必须是 celsius 或 fahrenheit',
          severity: 'error',
          code: 'INVALID_VALUE'
        });
      }

      if (preferences.theme && !['light', 'dark', 'auto'].includes(preferences.theme)) {
        errors.push({
          field: 'preferences.theme',
          message: '主题必须是 light、dark 或 auto',
          severity: 'error',
          code: 'INVALID_VALUE'
        });
      }

      if (preferences.language && !['zh-CN', 'en-US'].includes(preferences.language)) {
        errors.push({
          field: 'preferences.language',
          message: '语言必须是 zh-CN 或 en-US',
          severity: 'error',
          code: 'INVALID_VALUE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : undefined
    };
  }

  /**
   * 批量验证数据
   */
  static validateBatchData(data: {
    dayRecords?: { [date: string]: any };
    userSettings?: any;
    cycles?: any[];
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let fixedData: any = {};

    // 验证日记录
    if (data.dayRecords) {
      const fixedDayRecords: { [date: string]: any } = {};
      
      Object.entries(data.dayRecords).forEach(([date, record]) => {
        const validation = this.validateDayRecord(record);
        
        if (!validation.isValid) {
          errors.push(...validation.errors.map(err => ({
            ...err,
            field: `dayRecords.${date}.${err.field}`
          })));
        }
        
        if (validation.fixedData) {
          fixedDayRecords[date] = validation.fixedData;
        }
        
        warnings.push(...validation.warnings.map(warn => ({
          ...warn,
          field: `dayRecords.${date}.${warn.field}`
        })));
      });
      
      if (Object.keys(fixedDayRecords).length > 0) {
        fixedData.dayRecords = fixedDayRecords;
      }
    }

    // 验证用户设置
    if (data.userSettings) {
      const validation = this.validateUserSettings(data.userSettings);
      
      if (!validation.isValid) {
        errors.push(...validation.errors.map(err => ({
          ...err,
          field: `userSettings.${err.field}`
        })));
      }
      
      if (validation.fixedData) {
        fixedData.userSettings = validation.fixedData;
      }
      
      warnings.push(...validation.warnings.map(warn => ({
        ...warn,
        field: `userSettings.${warn.field}`
      })));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fixedData: errors.length === 0 ? fixedData : undefined
    };
  }

  /**
   * 数据修复
   */
  static repairData(data: any, validationResult: ValidationResult): any {
    if (validationResult.fixedData) {
      return validationResult.fixedData;
    }
    
    // 如果没有自动修复数据，尝试手动修复一些常见问题
    let repairedData = { ...data };
    
    validationResult.errors.forEach(error => {
      switch (error.code) {
        case 'INVALID_FORMAT':
          // 尝试修复格式问题
          if (error.field.includes('time') && data[error.field.split('.').pop()!]) {
            const timeValue = data[error.field.split('.').pop()!];
            if (typeof timeValue === 'string' && timeValue.length === 4) {
              const hours = timeValue.substring(0, 2);
              const minutes = timeValue.substring(2, 4);
              repairedData[error.field.split('.').pop()!] = `${hours}:${minutes}`;
            }
          }
          break;
          
        case 'INVALID_VALUE':
          // 尝试修复数值问题
          if (error.field.includes('temperature')) {
            const tempValue = data[error.field.split('.').pop()!];
            if (typeof tempValue === 'string') {
              const numTemp = parseFloat(tempValue);
              if (!isNaN(numTemp)) {
                repairedData[error.field.split('.').pop()!] = numTemp;
              }
            }
          }
          break;
      }
    });
    
    return repairedData;
  }
}