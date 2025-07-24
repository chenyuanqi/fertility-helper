// 业务数据类型定义

// 基础体温记录
export interface TemperatureRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  temperature: number; // 摄氏度
  note?: string; // 备注
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// 月经经量记录
export interface MenstrualRecord {
  id: string;
  date: string; // YYYY-MM-DD
  flow: 'light' | 'medium' | 'heavy'; // 经量：少/中/多
  isStart: boolean; // 是否经期开始
  isEnd: boolean; // 是否经期结束
  note?: string; // 备注
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// 同房记录
export interface IntercourseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  note?: string; // 备注（体位、避孕情况等）
  protection: boolean; // 是否采取避孕措施
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// 症状记录
export interface SymptomRecord {
  id: string;
  date: string; // YYYY-MM-DD
  symptoms: string[]; // 症状列表
  note?: string; // 备注
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// 日记录（一天的所有数据）
export interface DayRecord {
  date: string; // YYYY-MM-DD
  temperature?: TemperatureRecord;
  menstrual?: MenstrualRecord;
  intercourse?: IntercourseRecord[];
  symptoms?: SymptomRecord;
  ovulationPrediction?: {
    isOvulationDay: boolean;
    isFertileWindow: boolean;
    probability: number; // 0-1
  };
}

// 月经周期
export interface MenstrualCycle {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD (可能未结束)
  length?: number; // 周期长度（天）
  ovulationDate?: string; // 排卵日期
  lutealPhaseLength?: number; // 黄体期长度
  isComplete: boolean; // 是否完整周期
  averageTemperature: {
    follicular: number; // 卵泡期平均体温
    luteal: number; // 黄体期平均体温
  };
}

// 用户配置
export interface UserSettings {
  id: string;
  personalInfo: {
    age?: number;
    averageCycleLength: number; // 平均周期长度，默认28天
    averageLutealPhase: number; // 平均黄体期长度，默认14天
  };
  reminders: {
    morningTemperature: {
      enabled: boolean;
      time: string; // HH:mm
    };
    fertileWindow: {
      enabled: boolean;
      daysBeforeOvulation: number; // 排卵前几天提醒
    };
    periodPrediction: {
      enabled: boolean;
      daysBeforePeriod: number; // 经期前几天提醒
    };
  };
  preferences: {
    temperatureUnit: 'celsius' | 'fahrenheit';
    theme: 'light' | 'dark' | 'auto';
    language: 'zh-CN' | 'en-US';
  };
  privacy: {
    enableAnalytics: boolean;
    enableDataExport: boolean;
  };
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// 统计数据
export interface StatisticsData {
  totalRecords: number;
  averageCycleLength: number;
  averageTemperature: number;
  fertileWindowAccuracy: number; // 0-1
  cycleRegularity: number; // 0-1
  lastUpdated: string; // ISO string
}

// 图表数据点
export interface ChartDataPoint {
  date: string;
  temperature?: number;
  menstrualFlow?: 'light' | 'medium' | 'heavy';
  hasIntercourse: boolean;
  isOvulationDay?: boolean;
  isFertileWindow?: boolean;
  note?: string;
}

// API响应包装类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 导出功能相关类型
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'json';
  dateRange: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
  includeCharts: boolean;
  includeStatistics: boolean;
}

// 本地存储键名常量
export const STORAGE_KEYS = {
  USER_SETTINGS: 'fertility_user_settings',
  DAY_RECORDS: 'fertility_day_records',
  CYCLES: 'fertility_cycles',
  STATISTICS: 'fertility_statistics',
  APP_VERSION: 'fertility_app_version',
} as const;