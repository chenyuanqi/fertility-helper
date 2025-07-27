通过合理使用这些数据管理工具，可以确保应用的数据安全、准确和高效处理。

## 📊 数据结构定义

### 基础数据类型

```javascript
// 体温记录
interface TemperatureRecord {
  date: string;           // 日期 YYYY-MM-DD
  time: string;           // 时间 HH:MM
  temperature: number;    // 体温值 (35.0-38.0)
  note?: string;          // 备注
  measureMethod?: string; // 测量方法 (oral, vaginal, rectal)
  wakeUpTime?: string;    // 起床时间
  sleepQuality?: string;  // 睡眠质量 (good, fair, poor)
}

// 月经记录
interface MenstrualRecord {
  date: string;           // 日期
  flow: string;           // 经量 (none, light, medium, heavy)
  isStart: boolean;       // 是否开始
  isEnd: boolean;         // 是否结束
  symptoms?: string[];    // 症状
  note?: string;          // 备注
}

// 同房记录
interface IntercourseRecord {
  date: string;           // 日期
  time?: string;          // 时间
  type: string;           // 类型 (protected, unprotected, none)
  note?: string;          // 备注
}

// 日记录
interface DayRecord {
  date: string;           // 日期
  temperature?: TemperatureRecord;
  menstrual?: MenstrualRecord;
  intercourse?: IntercourseRecord[];
  symptoms?: string[];    // 症状
  mood?: string;          // 心情
  note?: string;          // 备注
  createdAt: string;      // 创建时间
  updatedAt: string;      // 更新时间
}
```

### 分析结果类型

```javascript
// 排卵预测结果
interface OvulationPrediction {
  date: string;           // 预测排卵日
  confidence: string;     // 置信度 (high, medium, low)
  method: string;         // 预测方法
  fertileWindow: {        // 易孕窗口
    start: string;
    end: string;
  };
  message: string;        // 说明信息
}

// 周期分析结果
interface CycleAnalysis {
  cycleLength: number;    // 周期长度
  lutealPhaseLength: number; // 黄体期长度
  follicularPhaseLength: number; // 卵泡期长度
  averageTemperature: {   // 平均体温
    follicular: number;   // 卵泡期
    luteal: number;       // 黄体期
  };
  temperatureShift: {     // 体温变化
    detected: boolean;
    shiftDate: string;
    shiftAmount: number;
  };
  quality: string;        // 周期质量评估
}
```

## 🔄 数据同步和迁移

### 版本升级处理

```javascript
// utils/dataMigration.js
class DataMigration {
  static async migrateToVersion(targetVersion) {
    const currentVersion = await this.getCurrentDataVersion();
    
    if (currentVersion < targetVersion) {
      console.log(`数据迁移: ${currentVersion} -> ${targetVersion}`);
      
      // 执行迁移步骤
      for (let version = currentVersion + 1; version <= targetVersion; version++) {
        await this.migrateToSpecificVersion(version);
      }
      
      // 更新版本号
      await this.setDataVersion(targetVersion);
    }
  }
  
  static async migrateToSpecificVersion(version) {
    switch (version) {
      case 2:
        await this.migrateV1ToV2();
        break;
      case 3:
        await this.migrateV2ToV3();
        break;
      default:
        console.warn(`未知的迁移版本: ${version}`);
    }
  }
  
  static async migrateV1ToV2() {
    // 添加新字段，修改数据结构
    const dataManager = DataManager.getInstance();
    const allRecords = await dataManager.getAllRecords();
    
    for (const record of allRecords) {
      if (!record.createdAt) {
        record.createdAt = record.date + 'T00:00:00.000Z';
        record.updatedAt = record.createdAt;
        await dataManager.updateRecord(record);
      }
    }
  }
}
```

### 数据清理和优化

```javascript
// 定期数据清理
class DataCleaner {
  static async cleanupOldData(retentionDays = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const dataManager = DataManager.getInstance();
    const result = await dataManager.deleteRecordsBefore(
      cutoffDate.toISOString().split('T')[0]
    );
    
    console.log(`清理了 ${result.deletedCount} 条旧记录`);
  }
  
  static async optimizeStorage() {
    // 压缩数据，移除冗余信息
    const dataManager = DataManager.getInstance();
    await dataManager.compactStorage();
    
    // 重建索引
    await dataManager.rebuildIndexes();
  }
}
```

## 🔐 数据安全和隐私

### 数据加密

```javascript
// utils/encryption.js
class DataEncryption {
  static encrypt(data, key) {
    // 使用AES加密敏感数据
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(data), 
      key
    ).toString();
    return encrypted;
  }
  
  static decrypt(encryptedData, key) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('解密失败:', error);
      return null;
    }
  }
}

// 在DataManager中使用加密
class SecureDataManager extends DataManager {
  constructor() {
    super();
    this.encryptionKey = this.generateEncryptionKey();
  }
  
  async saveRecord(record) {
    // 加密敏感数据
    const encryptedRecord = {
      ...record,
      temperature: record.temperature ? 
        DataEncryption.encrypt(record.temperature, this.encryptionKey) : 
        null
    };
    
    return super.saveRecord(encryptedRecord);
  }
  
  async getRecord(date) {
    const result = await super.getRecord(date);
    
    if (result.success && result.data) {
      // 解密数据
      if (result.data.temperature) {
        result.data.temperature = DataEncryption.decrypt(
          result.data.temperature, 
          this.encryptionKey
        );
      }
    }
    
    return result;
  }
}
```

### 数据匿名化

```javascript
// 导出时匿名化处理
class DataAnonymizer {
  static anonymizeForExport(data) {
    return {
      ...data,
      // 移除个人标识信息
      userId: undefined,
      deviceId: undefined,
      // 日期偏移（保持相对关系）
      records: this.offsetDates(data.records),
      // 添加随机噪声到体温数据
      temperatures: this.addNoiseToTemperatures(data.temperatures)
    };
  }
  
  static offsetDates(records) {
    const baseDate = new Date('2024-01-01');
    const firstRecordDate = new Date(records[0]?.date);
    const offset = baseDate.getTime() - firstRecordDate.getTime();
    
    return records.map(record => ({
      ...record,
      date: new Date(new Date(record.date).getTime() + offset)
        .toISOString().split('T')[0]
    }));
  }
}
```

## 📈 性能监控和优化

### 性能指标收集

```javascript
// utils/performanceMonitor.js
class PerformanceMonitor {
  static startTiming(operation) {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.recordMetric(operation, duration);
        return duration;
      }
    };
  }
  
  static recordMetric(operation, duration) {
    const metrics = wx.getStorageSync('performance_metrics') || {};
    
    if (!metrics[operation]) {
      metrics[operation] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        maxTime: 0
      };
    }
    
    const metric = metrics[operation];
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.maxTime = Math.max(metric.maxTime, duration);
    
    wx.setStorageSync('performance_metrics', metrics);
    
    // 如果操作耗时过长，记录警告
    if (duration > 1000) {
      console.warn(`操作 ${operation} 耗时 ${duration}ms`);
    }
  }
  
  static getMetrics() {
    return wx.getStorageSync('performance_metrics') || {};
  }
}

// 在DataManager中使用性能监控
class MonitoredDataManager extends DataManager {
  async saveRecord(record) {
    const timer = PerformanceMonitor.startTiming('saveRecord');
    try {
      const result = await super.saveRecord(record);
      return result;
    } finally {
      timer.end();
    }
  }
  
  async getRecordsInRange(startDate, endDate) {
    const timer = PerformanceMonitor.startTiming('getRecordsInRange');
    try {
      const result = await super.getRecordsInRange(startDate, endDate);
      return result;
    } finally {
      timer.end();
    }
  }
}
```

## 🧪 测试和质量保证

### 单元测试示例

```javascript
// tests/dataManager.test.js
describe('DataManager', () => {
  let dataManager;
  
  beforeEach(() => {
    dataManager = DataManager.getInstance();
    // 清理测试数据
    dataManager.clearAllData();
  });
  
  test('应该能够保存和读取体温记录', async () => {
    const record = {
      date: '2024-01-15',
      time: '07:30',
      temperature: 36.5,
      note: '测试记录'
    };
    
    const saveResult = await dataManager.saveTemperatureRecord(record);
    expect(saveResult.success).toBe(true);
    
    const getResult = await dataManager.getDayRecord('2024-01-15');
    expect(getResult.success).toBe(true);
    expect(getResult.data.temperature.temperature).toBe(36.5);
  });
  
  test('应该验证无效的体温数据', async () => {
    const invalidRecord = {
      date: '2024-01-15',
      time: '07:30',
      temperature: 40.0, // 无效的高温
      note: '测试记录'
    };
    
    const result = await dataManager.saveTemperatureRecord(invalidRecord);
    expect(result.success).toBe(false);
    expect(result.error.message).toContain('体温值超出正常范围');
  });
});
```

### 集成测试

```javascript
// tests/integration.test.js
describe('数据管理集成测试', () => {
  test('完整的数据流程测试', async () => {
    const dataService = new DataService();
    
    // 1. 批量保存数据
    const batchData = {
      temperature: [
        { date: '2024-01-01', time: '07:30', temperature: 36.3 },
        { date: '2024-01-02', time: '07:30', temperature: 36.4 },
        { date: '2024-01-03', time: '07:30', temperature: 36.8 }
      ]
    };
    
    const saveResult = await dataService.batchSaveRecords(batchData);
    expect(saveResult.success).toBe(true);
    
    // 2. 获取图表数据
    const chartResult = await dataService.getChartData('2024-01-01', '2024-01-03');
    expect(chartResult.success).toBe(true);
    expect(chartResult.data).toHaveLength(3);
    
    // 3. 创建备份
    const backupManager = BackupManager.getInstance();
    const backupResult = await backupManager.createFullBackup();
    expect(backupResult.success).toBe(true);
    
    // 4. 验证备份数据
    const validateResult = await backupManager.validateBackup(backupResult.data);
    expect(validateResult.success).toBe(true);
  });
});
```

这样就完成了数据管理模块的完整文档，涵盖了从基础使用到高级功能的所有方面，为开发者提供了全面的指导。
