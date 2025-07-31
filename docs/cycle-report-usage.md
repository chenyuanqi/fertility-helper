# 周期报告生成功能使用指南

## 功能概述

周期报告生成功能是备小孕小程序的核心功能之一，能够基于用户的体温、月经、同房等记录数据，生成详细的个人周期分析报告。

## 主要特性

### 1. 多种报告格式
- **文本报告**: 适合阅读和分享的纯文本格式
- **JSON报告**: 包含完整数据结构的详细报告

### 2. 灵活的分析周期
- 最近3个周期（默认）
- 最近6个周期
- 全部周期数据
- 自定义时间范围（开发中）

### 3. 全面的分析内容

#### 数据摘要
- 总记录天数
- 平均周期长度
- 周期规律性评估
- 体温记录率
- 平均体温
- 月经天数统计
- 同房频率

#### 周期分析
- 分析周期数量
- 平均周期长度
- 周期长度范围
- 规律性评估
- 各周期详细信息

#### 体温分析
- 体温记录率
- 平均体温
- 体温范围
- 双相模式分析
- 体温趋势分析
- 记录质量评估

#### 生育力分析
- 当前生育状态
- 预测置信度
- 下次排卵预测
- 易孕窗口期
- 个性化建议

#### 数据质量评估
- 总体评分（0-100分）
- 质量等级（优秀/良好/一般/需改善）
- 各类数据记录率详情

#### 个性化建议
- 基于数据质量的建议
- 基于周期规律性的建议
- 基于体温记录的建议
- 健康生活方式建议

## 使用方法

### 在设置页面生成报告

1. 打开小程序，进入"设置"页面
2. 找到"数据管理"区域
3. 点击"生成报告"按钮
4. 选择报告类型：
   - **生成文本报告**: 生成易读的文本格式报告
   - **生成详细数据报告**: 生成包含完整数据的JSON报告
   - **自定义报告设置**: 选择分析的周期数量

### 报告查看和分享

#### 文本报告
- 可直接在小程序内查看
- 支持复制到剪贴板
- 支持分享给好友
- 可保存为文本文件

#### 详细报告
- 显示报告摘要
- 可查看个性化建议
- 支持导出为JSON文件
- 适合医生咨询使用

## 代码使用示例

### 基本用法

```javascript
const reportGenerator = require('../../utils/reportGenerator');

// 生成文本报告
async function generateTextReport() {
  try {
    const report = await reportGenerator.generateCycleReport({
      cycleCount: 3,
      format: 'text'
    });
    
    console.log('报告内容:', report);
    return report;
  } catch (error) {
    console.error('生成报告失败:', error);
    throw error;
  }
}

// 生成详细JSON报告
async function generateDetailedReport() {
  try {
    const report = await reportGenerator.generateCycleReport({
      cycleCount: 5,
      format: 'json'
    });
    
    console.log('报告数据:', report);
    console.log('数据质量评分:', report.dataQuality.score);
    console.log('个性化建议:', report.recommendations);
    
    return report;
  } catch (error) {
    console.error('生成详细报告失败:', error);
    throw error;
  }
}
```

### 自定义报告选项

```javascript
// 分析全部周期
const fullReport = await reportGenerator.generateCycleReport({
  cycleCount: 999, // 表示全部周期
  format: 'json'
});

// 分析最近6个周期
const recentReport = await reportGenerator.generateCycleReport({
  cycleCount: 6,
  format: 'text'
});
```

## 报告内容示例

### 文本报告示例

```
==================================================
备小孕 - 个人周期分析报告
==================================================

报告生成时间: 2024年1月15日 14:30
分析周期: 11月1日 至 1月15日 (3个周期)

【报告摘要】
总记录天数: 75天
平均周期长度: 28天
周期规律性: 较规律
体温记录率: 85%
平均体温: 36.45°C
月经天数: 15天
同房频率: 8次/月

【周期分析】
分析周期数: 3个
平均周期长度: 28天
周期长度范围: 26-30天
规律性评估: 周期较规律，变化在正常范围内

各周期详情:
  周期1: 11月1日 - 11月28日 (28天)
    预测排卵: 11月14日
    体温模式: 明显双相
  周期2: 11月29日 - 12月26日 (28天)
    预测排卵: 12月12日
    体温模式: 明显双相
  周期3: 12月27日 - 1月23日 (28天)
    预测排卵: 1月9日
    体温模式: 轻微双相

【体温分析】
记录率: 85%
平均体温: 36.45°C
体温范围: 36.20-36.80°C
双相模式: 双相模式明显
体温趋势: 体温相对稳定
质量评估: 记录质量良好

【生育力分析】
当前状态: 黄体期
预测置信度: 高
下次排卵预测: 1月23日
易孕窗口: 1月20日-1月25日

【数据质量评估】
总体评分: 82分 (良好)
体温记录率: 85%
月经记录率: 100%
同房记录率: 60%
备注记录率: 40%

【个性化建议】
1. 提高记录完整性 (一般)
   建议完善同房记录和症状备注，有助于更准确的分析

2. 保持良好习惯 (一般)
   当前记录质量良好，请继续保持每日记录的习惯

==================================================
报告结束

注意: 本报告仅供参考，如有健康问题请咨询专业医生
==================================================
```

### JSON报告结构

```json
{
  "generateTime": "2024-01-15T06:30:00.000Z",
  "reportPeriod": "11月1日 至 1月15日 (3个周期)",
  "summary": {
    "totalRecordDays": 75,
    "averageCycleLength": 28,
    "cycleRegularity": "较规律",
    "temperatureRecordRate": 85,
    "averageTemperature": "36.45",
    "menstrualDays": 15,
    "intercourseFrequency": 8
  },
  "cycleAnalysis": {
    "cycleCount": 3,
    "averageLength": 28,
    "lengthRange": "26-30天",
    "regularityAssessment": "周期较规律，变化在正常范围内",
    "cycleDetails": [...]
  },
  "temperatureAnalysis": {
    "recordRate": 85,
    "averageTemperature": "36.45",
    "temperatureRange": "36.20-36.80°C",
    "biphasicPattern": "双相模式明显",
    "temperatureTrend": "体温相对稳定",
    "qualityAssessment": "记录质量良好"
  },
  "fertilityAnalysis": {
    "currentStatus": "黄体期",
    "confidence": "高",
    "nextOvulation": "1月23日",
    "fertilityWindow": "1月20日-1月25日",
    "recommendations": [...]
  },
  "dataQuality": {
    "score": 82,
    "assessment": "良好",
    "details": {
      "temperatureRate": 85,
      "menstrualRate": 100,
      "intercourseRate": 60,
      "notesRate": 40
    }
  },
  "recommendations": [
    {
      "type": "recording",
      "priority": "medium",
      "title": "提高记录完整性",
      "content": "建议完善同房记录和症状备注，有助于更准确的分析"
    }
  ],
  "charts": [...]
}
```

## 注意事项

### 数据要求
- 至少需要1个完整的月经周期数据
- 建议有连续的体温记录（至少2周）
- 月经记录是必需的（用于确定周期）

### 准确性说明
- 报告基于用户输入的数据生成
- 预测结果仅供参考，不能替代医学诊断
- 建议结合专业医生意见使用

### 隐私保护
- 所有数据仅存储在用户设备本地
- 报告生成过程不涉及网络传输
- 用户可自主控制数据的分享和导出

## 技术实现

### 核心算法
- 基于基础体温的排卵预测算法
- 月经周期规律性分析算法
- 数据质量评估算法
- 双相体温模式识别算法

### 数据分析模块
- `DataAnalysis`: 统计分析功能
- `OvulationAlgorithm`: 排卵预测算法
- `ReportGenerator`: 报告生成器

### 存储管理
- `FertilityStorage`: 数据存储管理
- 支持数据导入导出
- 本地缓存优化

## 未来规划

### 即将推出的功能
- 自定义时间范围分析
- 图表可视化报告
- 多语言报告支持
- 报告模板自定义

### 长期规划
- AI智能分析增强
- 医生协作功能
- 健康趋势预测
- 个性化健康建议优化

---

*本文档最后更新时间: 2024年1月15日*