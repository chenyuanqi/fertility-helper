# 数据结构设计文档

## 📊 数据模型概述

本文档定义了备孕助手小程序的数据结构，基于微信小程序本地存储实现，无需后端API支持。

## 🗃️ 核心数据结构

### 1. 用户配置 (UserConfig)

```typescript
interface UserConfig {
  userId: string;                    // 用户唯一标识
  nickname: string;                  // 昵称
  avgCycleLength: number;           // 平均周期长度（天）
  avgLutealPhase: number;           // 平均黄体期长度（天）
  reminderSettings: ReminderSettings; // 提醒设置
  createdAt: string;                // 创建时间
  updatedAt: string;                // 更新时间
}

interface ReminderSettings {
  morningTemperature: {
    enabled: boolean;
    time: string;                    // HH:mm 格式
  };
  ovulationWindow: {
    enabled: boolean;
    advanceDays: number;            // 提前几天提醒
  };
  fertilityPeriod: {
    enabled: boolean;
    advanceDays: number;
  };
}
```

### 2. 日记录 (DailyRecord)

```typescript
interface DailyRecord {
  id: string;                       // 记录唯一标识
  date: string;                     // 日期 YYYY-MM-DD
  temperature?: TemperatureRecord;   // 体温记录
  menstruation?: MenstruationRecord; // 月经记录
  intimacy?: IntimacyRecord[];      // 同房记录（可多次）
  symptoms?: string[];              // 症状标签
  notes?: string;                   // 备注
  createdAt: string;               // 创建时间
  updatedAt: string;               // 更新时间
}

interface TemperatureRecord {
  value: number;                    // 体温值（摄氏度）
  time: string;                     // 测量时间 HH:mm
  method: 'oral';                   // 测量方法（固定为口腔温度）
  quality: 'good' | 'disturbed' | 'sick'; // 测量质量
}

interface MenstruationRecord {
  padCount: number;                 // 湿透的卫生巾数量 (0-5+)
  isStart: boolean;                 // 是否是经期开始
  isEnd: boolean;                   // 是否是经期结束
  color?: 'bright_red' | 'dark_red' | 'brown' | 'pink'; // 颜色
}

interface IntimacyRecord {
  time: string;                     // 时间 HH:mm
  protection: boolean;              // 是否有保护措施
  position?: string;                // 体位（可选）
  notes?: string;                   // 备注
}
```

### 3. 月经周期 (MenstrualCycle)

```typescript
interface MenstrualCycle {
  id: string;                       // 周期唯一标识
  startDate: string;               // 周期开始日期 YYYY-MM-DD
  endDate?: string;                // 周期结束日期（可能未完成）
  length?: number;                 // 周期长度（天）
  ovulationDate?: string;          // 排卵日
  lutealPhaseLength?: number;      // 黄体期长度
  status: 'active' | 'completed' | 'irregular'; // 状态
  records: string[];               // 关联的日记录ID列表
  analysis?: CycleAnalysis;        // 周期分析结果
  createdAt: string;
  updatedAt: string;
}

interface CycleAnalysis {
  coverlineTemperature?: number;    // 覆盖线温度
  temperatureShift?: {
    date: string;                   // 温升日期
    magnitude: number;              // 温升幅度
  };
  fertilityWindow?: {
    start: string;                  // 易孕期开始
    end: string;                    // 易孕期结束
    peak: string;                   // 排卵高峰期
  };
  irregularities?: string[];        // 异常情况
}
```

### 4. 统计数据 (Statistics)

```typescript
interface Statistics {
  userId: string;
  totalCycles: number;              // 总周期数
  avgCycleLength: number;           // 平均周期长度
  avgLutealPhase: number;           // 平均黄体期长度
  cycleRegularity: number;          // 周期规律性评分 (0-100)
  lastUpdated: string;
  cycles: CycleSummary[];           // 历史周期摘要
}

interface CycleSummary {
  cycleId: string;
  startDate: string;
  length: number;
  ovulationDay?: number;            // 排卵日（周期第几天）
  lutealPhaseLength?: number;
  temperaturePattern: 'biphasic' | 'monophasic' | 'irregular';
}
```

## 📱 本地存储键值设计

### Storage Keys

```typescript
const STORAGE_KEYS = {
  USER_CONFIG: 'user_config',
  DAILY_RECORDS: 'daily_records',      // 存储所有日记录
  CYCLES: 'menstrual_cycles',          // 存储所有周期
  CURRENT_CYCLE: 'current_cycle_id',   // 当前活跃周期ID
  STATISTICS: 'statistics',
  LAST_SYNC: 'last_sync_time',
  APP_VERSION: 'app_version',
} as const;
```

### 数据存储策略

1. **分散存储**: 不同类型数据使用不同的storage key，避免单个存储过大
2. **索引优化**: 使用日期和ID作为查询索引
3. **数据压缩**: 对历史数据进行适当压缩
4. **定期清理**: 自动清理超过2年的历史数据

## 🔄 数据同步机制

### 本地数据管理

```typescript
class DataManager {
  // 获取用户配置
  async getUserConfig(): Promise<UserConfig | null>
  
  // 保存用户配置
  async saveUserConfig(config: UserConfig): Promise<void>
  
  // 获取指定日期的记录
  async getDailyRecord(date: string): Promise<DailyRecord | null>
  
  // 保存日记录
  async saveDailyRecord(record: DailyRecord): Promise<void>
  
  // 获取日期范围内的记录
  async getDailyRecords(startDate: string, endDate: string): Promise<DailyRecord[]>
  
  // 获取当前周期
  async getCurrentCycle(): Promise<MenstrualCycle | null>
  
  // 保存周期数据
  async saveCycle(cycle: MenstrualCycle): Promise<void>
  
  // 获取历史周期
  async getCycles(limit?: number): Promise<MenstrualCycle[]>
  
  // 更新统计数据
  async updateStatistics(): Promise<void>
  
  // 数据导出
  async exportData(): Promise<ExportData>
  
  // 数据导入
  async importData(data: ExportData): Promise<void>
}
```

### 数据导出格式

```typescript
interface ExportData {
  version: string;                  // 数据格式版本
  exportDate: string;               // 导出时间
  userConfig: UserConfig;
  records: DailyRecord[];
  cycles: MenstrualCycle[];
  statistics: Statistics;
}
```

## 📋 数据验证规则

### 体温数据验证

```typescript
const TemperatureValidation = {
  min: 35.0,                        // 最低体温
  max: 42.0,                        // 最高体温
  precision: 2,                     // 小数位数
  reasonableRange: [36.0, 37.5],    // 合理范围
};
```

### 日期验证

```typescript
const DateValidation = {
  format: /^\d{4}-\d{2}-\d{2}$/,   // YYYY-MM-DD格式
  maxFutureDate: 0,                 // 不允许未来日期
  maxPastDays: 730,                 // 最多2年历史数据
};
```

### 周期验证

```typescript
const CycleValidation = {
  minLength: 20,                    // 最短周期
  maxLength: 40,                    // 最长周期
  typicalRange: [25, 32],           // 典型范围
  lutealPhaseMin: 10,               // 最短黄体期
  lutealPhaseMax: 16,               // 最长黄体期
};
```

## 🔐 数据安全与隐私

### 本地加密

虽然数据存储在本地，仍需考虑基本的数据保护：

1. **敏感数据加密**: 对备注等文本内容进行简单加密
2. **数据完整性**: 使用校验和验证数据完整性
3. **访问控制**: 确保只有应用本身能访问数据

### 数据清理

```typescript
interface DataCleanupPolicy {
  autoCleanup: boolean;             // 是否自动清理
  retentionDays: number;            // 数据保留天数
  cleanupInterval: number;          // 清理检查间隔（天）
  keepCycleCount: number;           // 保留的周期数量
}
```

## 📊 性能优化

### 数据查询优化

1. **按月分组**: 将数据按月分组存储，提高查询效率
2. **缓存机制**: 缓存常用查询结果
3. **懒加载**: 按需加载历史数据
4. **索引结构**: 建立日期和周期的快速索引

### 内存管理

1. **及时释放**: 不再使用的数据及时从内存中释放
2. **分页加载**: 大量数据采用分页方式加载
3. **数据压缩**: 对冗余数据进行压缩存储

这个数据结构设计确保了小程序能够高效地管理用户的备孕数据，同时保证了数据的完整性和隐私安全性。 