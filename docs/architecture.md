# 备小孕小程序架构设计

## 📋 整体架构

### 架构原则
- **分层架构**: 清晰的分层结构，便于维护和扩展
- **组件化**: 可复用的组件设计
- **数据驱动**: 以数据为中心的设计理念
- **性能优先**: 考虑小程序性能特点的优化设计
- **用户体验**: 30秒内完成记录的设计目标

### 技术栈
- **框架**: 微信小程序原生框架
- **语言**: TypeScript + JavaScript
- **样式**: WXSS
- **数据存储**: 微信本地存储
- **图表**: ECharts for 小程序
- **构建工具**: 微信开发者工具

## 🏗️ 目录结构设计

```
miniprogram/
├── miniprogram/
│   ├── pages/                  # 页面目录
│   │   ├── index/             # 首页 - 数据概览
│   │   ├── record/            # 记录页 - 数据录入
│   │   ├── chart/             # 图表页 - 数据可视化
│   │   ├── calendar/          # 日历页 - 日历视图
│   │   └── settings/          # 设置页 - 用户配置
│   ├── components/            # 自定义组件
│   │   ├── keyboard/          # 数字键盘组件
│   │   ├── slider/            # 滑条组件
│   │   ├── chart/             # 图表组件
│   │   ├── calendar/          # 日历组件
│   │   ├── date-picker/       # 日期选择器
│   │   └── modal/             # 弹窗组件
│   ├── utils/                 # 工具函数
│   │   ├── storage.ts         # 存储管理
│   │   ├── date.ts            # 日期处理
│   │   ├── validator.ts       # 数据验证
│   │   ├── algorithm.ts       # 算法函数
│   │   └── common.ts          # 通用工具
│   ├── types/                 # 类型定义
│   │   └── index.ts           # 业务类型定义
│   ├── styles/                # 样式文件
│   │   ├── variables.wxss     # 样式变量
│   │   └── mixins.wxss        # 样式混入
│   ├── assets/                # 静态资源
│   │   ├── images/            # 图片资源
│   │   └── icons/             # 图标资源
│   ├── app.js                 # 应用入口
│   ├── app.json               # 应用配置
│   └── app.wxss               # 全局样式
├── typings/                   # 类型声明
├── project.config.json        # 项目配置
└── tsconfig.json             # TypeScript配置
```

## 📱 页面架构设计

### 1. 首页 (index)
**功能**: 数据概览和快速操作
- 今日数据摘要
- 周期状态显示
- 快速记录入口
- 排卵预测信息

**数据流**:
```
Storage → Page Data → UI Display
```

### 2. 记录页 (record)
**功能**: 数据录入界面
- 体温记录（数字键盘）
- 经量记录（滑条选择）
- 同房记录（一键标记）
- 症状记录（多选）

**数据流**:
```
User Input → Validation → Storage → UI Feedback
```

### 3. 图表页 (chart)
**功能**: 数据可视化
- 三合一图表（体温+经量+同房）
- 周期切换
- 数据点交互
- 趋势分析

**数据流**:
```
Storage → Data Processing → Chart Rendering
```

### 4. 日历页 (calendar)
**功能**: 日历视图
- 月视图日历
- 每日数据标记
- 快速跳转
- 数据编辑

**数据流**:
```
Storage → Date Range Processing → Calendar Display
```

### 5. 设置页 (settings)
**功能**: 用户配置
- 个人信息设置
- 提醒配置
- 数据导出
- 隐私设置

**数据流**:
```
User Settings ↔ Storage ↔ UI State
```

## 🧩 组件架构设计

### 组件分类

#### 1. 基础组件 (Base Components)
- **Button**: 统一的按钮组件
- **Input**: 输入框组件
- **Modal**: 弹窗组件
- **Loading**: 加载组件

#### 2. 业务组件 (Business Components)
- **TemperatureKeyboard**: 体温输入键盘
- **FlowSlider**: 经量选择滑条
- **DatePicker**: 日期选择器
- **SymptomSelector**: 症状选择器

#### 3. 图表组件 (Chart Components)
- **TemperatureChart**: 体温折线图
- **CombinedChart**: 三合一图表
- **CalendarView**: 日历视图

### 组件通信模式

```
Parent Component
    ↓ props
Child Component
    ↓ events
Parent Component
    ↓ storage
Global State
```

## 💾 数据架构设计

### 数据存储策略

#### 1. 本地存储结构
```typescript
// 存储键名
STORAGE_KEYS = {
  USER_SETTINGS: 'fertility_user_settings',
  DAY_RECORDS: 'fertility_day_records',
  CYCLES: 'fertility_cycles',
  STATISTICS: 'fertility_statistics',
}

// 数据结构
DayRecords: {
  [date: string]: DayRecord
}

Cycles: MenstrualCycle[]

UserSettings: UserSettings

Statistics: StatisticsData
```

#### 2. 数据管理层
```typescript
// 数据访问层
StorageManager (通用存储操作)
    ↓
FertilityStorage (业务存储封装)
    ↓
DataService (业务逻辑层)
    ↓
Page/Component (表现层)
```

### 数据流设计

#### 1. 数据写入流程
```
User Input → Validation → Business Logic → Storage → UI Update
```

#### 2. 数据读取流程
```
Page Load → Storage Read → Data Processing → UI Render
```

#### 3. 数据同步机制
- 实时保存用户输入
- 页面切换时同步数据
- 应用启动时数据校验

## 🔄 业务逻辑架构

### 算法模块设计

#### 1. 排卵预测算法
```typescript
class OvulationPredictor {
  // 基于基础体温的排卵检测
  detectOvulationByTemperature(temperatures: TemperatureRecord[]): Date

  // 基于月经周期的排卵预测
  predictOvulationByCycle(cycle: MenstrualCycle): Date

  // 综合预测
  predictOvulation(data: CycleData): OvulationPrediction
}
```

#### 2. 周期分析算法
```typescript
class CycleAnalyzer {
  // 周期长度计算
  calculateCycleLength(periods: MenstrualRecord[]): number

  // 黄体期长度分析
  analyzeLutealPhase(temperatures: TemperatureRecord[]): number

  // 周期规律性分析
  analyzeCycleRegularity(cycles: MenstrualCycle[]): number
}
```

#### 3. 数据统计算法
```typescript
class StatisticsCalculator {
  // 平均体温计算
  calculateAverageTemperature(records: TemperatureRecord[]): number

  // 趋势分析
  analyzeTrend(data: ChartDataPoint[]): TrendAnalysis

  // 异常检测
  detectAnomalies(records: TemperatureRecord[]): Anomaly[]
}
```

## 🎨 UI/UX 架构设计

### 设计系统

#### 1. 色彩系统
```css
/* 主色调 */
--primary-color: #ff6b9d;      /* 粉色 - 主要操作 */
--secondary-color: #4ecdc4;    /* 青色 - 辅助信息 */

/* 功能色 */
--success-color: #52c41a;      /* 成功状态 */
--warning-color: #faad14;      /* 警告状态 */
--error-color: #f5222d;        /* 错误状态 */

/* 中性色 */
--text-primary: #262626;       /* 主要文本 */
--text-secondary: #8c8c8c;     /* 次要文本 */
--background: #f5f5f5;         /* 背景色 */
```

#### 2. 字体系统
```css
/* 字体大小 */
--font-xs: 20rpx;    /* 辅助信息 */
--font-sm: 24rpx;    /* 次要文本 */
--font-base: 28rpx;  /* 基础文本 */
--font-lg: 32rpx;    /* 标题文本 */
--font-xl: 36rpx;    /* 大标题 */
```

#### 3. 间距系统
```css
/* 间距规范 */
--space-xs: 8rpx;
--space-sm: 16rpx;
--space-md: 24rpx;
--space-lg: 32rpx;
--space-xl: 48rpx;
```

### 交互设计原则

#### 1. 快速录入
- 30秒内完成记录
- 最少点击次数
- 智能默认值

#### 2. 直观反馈
- 实时数据验证
- 清晰的状态提示
- 友好的错误信息

#### 3. 一致性
- 统一的交互模式
- 一致的视觉风格
- 标准的操作流程

## 🔧 工具链架构

### 开发工具链
```
微信开发者工具 → TypeScript编译 → 代码检查 → 打包构建
```

### 代码质量保证
```
ESLint (代码规范) → Prettier (代码格式化) → TypeScript (类型检查)
```

### 测试策略
```
单元测试 (工具函数) → 集成测试 (组件) → 端到端测试 (页面流程)
```

## 📈 性能优化架构

### 1. 加载性能
- 分包加载策略
- 图片资源优化
- 代码分割

### 2. 运行性能
- 数据懒加载
- 虚拟列表
- 防抖节流

### 3. 存储性能
- 数据压缩
- 增量更新
- 缓存策略

## 🔒 安全架构

### 1. 数据安全
- 本地数据加密
- 敏感信息保护
- 数据备份机制

### 2. 隐私保护
- 最小权限原则
- 用户授权管理
- 数据匿名化

### 3. 错误处理
- 全局错误捕获
- 优雅降级
- 错误上报

## 🚀 扩展性设计

### 1. 功能扩展
- 插件化架构
- 模块化设计
- 配置化开发

### 2. 数据扩展
- 灵活的数据结构
- 版本兼容机制
- 迁移策略

### 3. 平台扩展
- 跨平台适配
- API抽象层
- 统一数据格式

这个架构设计确保了项目的可维护性、可扩展性和性能优化，为后续的开发工作提供了清晰的指导。