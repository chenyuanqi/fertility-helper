# 数据管理模块使用指南

本文档介绍如何使用项目中的数据管理模块，包括数据存储、验证、备份等功能。

## 📋 模块概述

数据管理模块包含以下核心组件：

- **DataManager**: 核心数据管理器，提供统一的数据操作接口
- **DataService**: 高级数据服务，提供批量操作和数据分析功能
- **DataValidator**: 数据验证器，确保数据完整性和正确性
- **BackupManager**: 备份管理器，提供数据备份和恢复功能
- **AlgorithmUtils**: 算法工具类，提供排卵预测和周期分析功能

## 🏗️ 架构设计

```
页面/组件层
    ↓
DataService (高级服务)
    ↓
DataManager (核心管理)
    ↓
Storage (存储层)
```

## 📚 核心类使用指南

### 1. DataManager - 核心数据管理器

DataManager 是单例模式，提供基础的数据操作功能。

#### 基本使用

```javascript
// 获取实例
const dataManager = DataManager.getInstance();

// 保存体温记录
const temperatureResult = await dataManager.saveTemperatureRecord({
  date: '2024-01-15',
  time: '07:30',
  temperature: 36.5,
  note: '正常测量'
});

if (temperatureResult.success) {
  console.log('保存成功:', temperatureResult.data);
} else {
  console.error('保存失败:', temperatureResult.error);
}

// 获取指定日期的记录
const dayResult = await dataManager.getDayRecord('2024-01-15');
if (dayResult.success && dayResult.data) {
  console.log('当天记录:', dayResult.data);
}
```

#### 主要方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `saveTemperatureRecord` | 保存体温记录 | `TemperatureRecord` | `DataOperationResult` |
| `saveMenstrualRecord` | 保存月经记录 | `MenstrualRecord` | `DataOperationResult` |
| `saveIntercourseRecord` | 保存同房记录 | `IntercourseRecord` | `DataOperationResult` |
| `getDayRecord` | 获取日记录 | `date: string` | `DataOperationResult<DayRecord>` |
| `getDayRecordsInRange` | 获取范围记录 | `startDate, endDate` | `DataOperationResult<DayRecord[]>` |
| `deleteRecord` | 删除记录 | `date, type, recordId?` | `DataOperationResult<boolean>` |
| `getStatistics` | 获取统计数据 | `options?` | `DataOperationResult<StatisticsData>` |

### 2. DataService - 高级数据服务

DataService 提供更高级的数据操作和分析功能。

#### 基本使用

```javascript
const dataService = new DataService();

// 批量保存记录
const batchResult = await dataService.batchSaveRecords({
  temperature: [
    { date: '2024-01-15', time: '07:30', temperature: 36.5 },
    { date: '2024-01-16', time: '07:30', temperature: 36.6 }
  ],
  menstrual: [
    { date: '2024-01-01', flow: 'medium', isStart: true, isEnd: false }
  ]
});

// 获取图表数据
const chartResult = await dataService.getChartData('2024-01-01', '2024-01-31');
if (chartResult.success) {
  console.log('图表数据:', chartResult.data);
}

// 搜索记录
const searchResult = await dataService.searchRecords({
  keyword: '发热',
  dateRange: { start: '2024-01-01', end: '2024-01-31' },
  hasTemperature: true
});
```

#### 主要方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `batchSaveRecords` | 批量保存记录 | `records` | `DataOperationResult` |
| `getChartData` | 获取图表数据 | `startDate, endDate` | `DataOperationResult<ChartDataPoint[]>` |
| `getMonthSummary` | 获取月度摘要 | `year, month` | `DataOperationResult` |
| `searchRecords` | 搜索记录 | `query` | `DataOperationResult<DayRecord[]>` |
| `getRecentRecords` | 获取最近记录 | `limit?` | `DataOperationResult<DayRecord[]>` |
| `exportData` | 导出数据 | `options` | `DataOperationResult<string>` |

### 3. DataValidator - 数据验证器

DataValidator 提供数据验证和修复功能。

#### 基本使用

```javascript
// 验证体温记录
const validation = DataValidator.validateTemperatureRecord({
  date: '2024-01-15',
  time: '07:30',
  temperature: 36.5,
  note: '正常测量'
});

if (validation.isValid) {
  console.log('数据有效');
  if (validation.fixedData) {
    console.log('修复后的数据:', validation.fixedData);
  }
} else {
  console.log('验证错误:', validation.errors);
  console.log('警告信息:', validation.warnings);
}

// 批量验证
const batchValidation = DataValidator.validateBatchData({
  dayRecords: { '2024-01-15': dayRecord },
  userSettings: userSettings
});
```

#### 验证方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `validateTemperatureRecord` | 验证体温记录 | `record` | `ValidationResult` |
| `validateMenstrualRecord` | 验证月经记录 | `record` | `ValidationResult` |
| `validateIntercourseRecord` | 验证同房记录 | `record` | `ValidationResult` |
| `validateDayRecord` | 验证日记录 | `record` | `ValidationResult` |
| `validateUserSettings` | 验证用户设置 | `settings` | `ValidationResult` |
| `validateBatchData` | 批量验证 | `data` | `ValidationResult` |

### 4. BackupManager - 备份管理器

BackupManager 提供数据备份和恢复功能。

#### 基本使用

```javascript
const backupManager = BackupManager.getInstance();

// 创建完整备份
const backupResult = await backupManager.createFullBackup({
  includeUserSettings: true,
  includeDayRecords: true,
  includeCycles: true,
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  }
});

if (backupResult.success) {
  console.log('备份创建成功:', backupResult.data);
}

// 导出为JSON
const exportResult = await backupManager.exportToJSON();
if (exportResult.success) {
  // 可以保存到文件或分享
  console.log('导出数据:', exportResult.data);
}

// 从JSON恢复
const restoreResult = await backupManager.importFromJSON(jsonString, {
  overwrite: false,
  validateData: true,
  repairData: true
});
```

#### 主要方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `createFullBackup` | 创建完整备份 | `options?` | `DataOperationResult<BackupData>` |
| `restoreFromBackup` | 从备份恢复 | `backupData, options?` | `DataOperationResult` |
| `exportToJSON` | 导出为JSON | `options?` | `DataOperationResult<string>` |
| `importFromJSON` | 从JSON导入 | `jsonString, options?` | `DataOperationResult` |
| `getBackupHistory` | 获取备份历史 | - | `DataOperationResult` |
| `validateBackup` | 验证备份 | `backupData` | `DataOperationResult` |

### 5. AlgorithmUtils - 算法工具类

AlgorithmUtils 提供排卵预测和周期分析功能。

#### 基本使用

```javascript
// 基于体温预测排卵
const tempPrediction = AlgorithmUtils.predictOvulationByTemperature(
  temperatureRecords,
  cycles
);

if (tempPrediction) {
  console.log('预测排卵日:', tempPrediction.ovulationDate);
  console.log('置信度:', tempPrediction.confidence);
  console.log('易孕窗口:', tempPrediction.fertileWindow);
}

// 综合预测
const combinedPrediction = AlgorithmUtils.predictOvulationCombined(
  temperatureRecords,
  cycles
);

// 分析周期
const cycleAnalysis = AlgorithmUtils.analyzeCycle(cycles, temperatureRecords);
console.log('周期分析:', cycleAnalysis);

// 检测体温双相变化
const temperatureShift = AlgorithmUtils.detectTemperatureShift(temperatureRecords);
console.log('体温变化:', temperatureShift);
```

#### 主要方法

| 方法 | 说明 | 参数 | 返回值 |
|------|------|------|--------|
| `predictOvulationByTemperature` | 基于体温预测排卵 | `records, cycles` | `OvulationPrediction` |
| `predictOvulationByCycle` | 基于周期预测排卵 | `cycles` | `OvulationPrediction` |
| `predictOvulationCombined` | 综合预测排卵 | `records, cycles` | `OvulationPrediction` |
| `analyzeCycle` | 分析周期 | `cycles, records` | `CycleAnalysis` |
| `detectTemperatureShift` | 检测体温变化 | `records` | `TemperatureShift` |
| `calculateCoverLine` | 计算覆盖线 | `records` | `number` |

## 🔧 实际使用示例

### 完整的数据操作流程

```javascript
// pages/record/record.js
const { DataManager } = require('../../utils/dataManager');
const { DataValidator } = require('../../utils/dataValidator');

Page({
  data: {
    temperature: '',
    selectedDate: '',
    isLoading: false
  },

  async onLoad() {
    this.dataManager = DataManager.getInstance();
    this.setData({
      selectedDate: this.getCurrentDate()
    });
  },

  // 保存体温记录
  async saveTemperature() {
    const { temperature, selectedDate } = this.data;
    
    // 构建记录对象
    const record = {
      date: selectedDate,
      time: this.getCurrentTime(),
      temperature: parseFloat(temperature),
      note: ''
    };

    // 数据验证
    const validation = DataValidator.validateTemperatureRecord(record);
    if (!validation.isValid) {
      wx.showToast({
        title: validation.errors[0].message,
        icon: 'none'
      });
      return;
    }

    // 显示加载状态
    this.setData({ isLoading: true });

    try {
      // 保存数据
      const result = await this.dataManager.saveTemperatureRecord(record);
      
      if (result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 刷新页面数据
        await this.loadDayRecord();
      } else {
        wx.showToast({
          title: result.error.message,
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 加载当天记录
  async loadDayRecord() {
    const { selectedDate } = this.data;
    
    try {
      const result = await this.dataManager.getDayRecord(selectedDate);
      
      if (result.success && result.data) {
        const dayRecord = result.data;
        
        // 更新页面数据
        this.setData({
          temperature: dayRecord.temperature?.temperature?.toString() || '',
          hasTemperature: !!dayRecord.temperature,
          hasMenstrual: !!dayRecord.menstrual,
          hasIntercourse: !!(dayRecord.intercourse && dayRecord.intercourse.length > 0)
        });
      }
    } catch (error) {
      console.error('加载记录失败:', error);
    }
  },

  getCurrentDate() {
    return new Date().toISOString().split('T')[0];
  },

  getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
});
```

### 数据导出功能

```javascript
// pages/settings/settings.js
const { BackupManager } = require('../../utils/backupManager');

Page({
  async exportData() {
    const backupManager = BackupManager.getInstance();
    
    try {
      wx.showLoading({ title: '导出中...' });
      
      // 创建备份
      const result = await backupManager.exportToJSON({
        includeUserSettings: true,
        includeDayRecords: true,
        includeCycles: true,
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        }
      });
      
      if (result.success) {
        // 保存到相册或分享
        await this.saveToAlbum(result.data);
        
        wx.showToast({
          title: '导出成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('导出失败:', error);
      wx.showToast({
        title: '导出失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  async saveToAlbum(jsonData) {
    // 这里可以实现保存到相册的逻辑
    // 或者通过分享功能让用户保存
    console.log('导出的数据:', jsonData);
  }
});
```

## ⚠️ 注意事项

### 1. 错误处理

所有数据操作都返回 `DataOperationResult` 类型，包含 `success` 字段和可能的 `error` 信息：

```javascript
const result = await dataManager.saveTemperatureRecord(record);

if (result.success) {
  // 操作成功
  console.log('数据:', result.data);
} else {
  // 操作失败
  console.error('错误:', result.error.message);
  console.error('详情:', result.error.details);
}
```

### 2. 数据验证

在保存数据前，建议先进行验证：

```javascript
const validation = DataValidator.validateTemperatureRecord(record);

if (!validation.isValid) {
  // 显示错误信息
  validation.errors.forEach(error => {
    console.error(`${error.field}: ${error.message}`);
  });
  return;
}

// 使用修复后的数据（如果有）
const dataToSave = validation.fixedData || record;
```

### 3. 性能优化

- DataManager 使用了缓存机制，避免频繁的存储读取
- 批量操作时使用 `DataService.batchSaveRecords` 而不是循环调用单个保存方法
- 大量数据查询时考虑使用分页或日期范围限制

### 4. 数据备份

建议定期创建数据备份：

```javascript
// 每周自动备份
setInterval(async () => {
  const backupManager = BackupManager.getInstance();
  await backupManager.createFullBackup();
  
  // 清理旧备份，只保留最近5个
  await backupManager.cleanupOldBackups(5);
}, 7 * 24 * 60 * 60 * 1000); // 7天
```

### 5. 算法使用

排卵预测算法需要足够的数据才能给出准确结果：

- 体温预测：至少需要10天的连续体温数据
- 周期预测：至少需要2个完整的月经周期
- 综合预测：结合两种方法，准确性更高

## 🔍 调试和故障排除

### 1. 开启调试日志

```javascript
// 在 app.js 中设置
App({
  globalData: {
    debugMode: true
  }
});

// 在数据操作中添加日志
if (getApp().globalData.debugMode) {
  console.log('数据操作:', operation, data);
}
```

### 2. 数据完整性检查

```javascript
const dataService = new DataService();
const integrityResult = await dataService.checkDataIntegrity();

if (integrityResult.success) {
  const { totalRecords, validRecords, invalidRecords, issues } = integrityResult.data;
  console.log(`总记录: ${totalRecords}, 有效: ${validRecords}, 无效: ${invalidRecords}`);
  
  if (issues.length > 0) {
    console.log('数据问题:', issues);
  }
}
```

### 3. 常见问题解决

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 保存失败 | 数据验证不通过 | 检查数据格式，使用 DataValidator 验证 |
| 读取为空 | 数据不存在或键名错误 | 检查日期格式，确认数据已保存 |
| 算法无结果 | 数据量不足 | 确保有足够的历史数据 |
| 备份失败 | 存储空间不足 | 清理旧数据或增加存储空间 |

通过合理使用这些数据管理工具，可以确保应用的数据安全、准确和高效处理。