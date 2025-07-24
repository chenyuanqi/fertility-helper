# 备小孕小程序编码规范

## 📋 总体原则

1. **一致性**: 保持代码风格的一致性
2. **可读性**: 代码应该易于理解和维护
3. **类型安全**: 充分利用 TypeScript 的类型系统
4. **性能优化**: 考虑小程序的性能特点
5. **用户体验**: 优先考虑用户体验

## 🎯 TypeScript 规范

### 类型定义
- 所有接口和类型定义放在 `types/` 目录下
- 使用 PascalCase 命名接口和类型
- 为所有函数参数和返回值添加类型注解
- 避免使用 `any` 类型，必要时使用 `unknown`

```typescript
// ✅ 好的示例
interface TemperatureRecord {
  id: string;
  date: string;
  temperature: number;
}

function saveTemperature(record: TemperatureRecord): Promise<void> {
  // 实现
}

// ❌ 避免的示例
function saveTemperature(record: any): any {
  // 实现
}
```

### 变量命名
- 使用 camelCase 命名变量和函数
- 使用 PascalCase 命名类和接口
- 使用 UPPER_SNAKE_CASE 命名常量
- 使用有意义的变量名

```typescript
// ✅ 好的示例
const temperatureRecord: TemperatureRecord = {};
const MAX_TEMPERATURE = 42.0;
class DataManager {}

// ❌ 避免的示例
const tr = {};
const max = 42.0;
class dm {}
```

## 🏗️ 文件组织规范

### 目录结构
```
miniprogram/
├── pages/              # 页面文件
├── components/         # 自定义组件
├── utils/              # 工具函数
├── types/              # 类型定义
├── styles/             # 样式文件
└── assets/             # 静态资源
```

### 文件命名
- 页面文件使用 kebab-case: `temperature-record.ts`
- 组件文件使用 kebab-case: `date-picker.ts`
- 工具文件使用 camelCase: `dateUtils.ts`
- 类型文件使用 camelCase: `temperatureTypes.ts`

### 导入导出规范
- 使用 ES6 模块语法
- 按字母顺序排列导入
- 分组导入：第三方库 → 内部模块 → 相对路径

```typescript
// ✅ 好的示例
import { DateUtils } from '@/utils/date';
import { StorageManager } from '@/utils/storage';
import { TemperatureRecord } from '@/types/index';

import './index.wxss';

// ❌ 避免的示例
import './index.wxss';
import { TemperatureRecord } from '@/types/index';
import { DateUtils } from '@/utils/date';
```

## 📱 小程序特定规范

### 页面生命周期
- 在 `onLoad` 中进行数据初始化
- 在 `onShow` 中刷新数据
- 在 `onHide` 中保存状态
- 在 `onUnload` 中清理资源

```typescript
Page({
  data: {
    temperatureList: [] as TemperatureRecord[],
  },

  onLoad(options: any) {
    this.initializeData();
  },

  onShow() {
    this.refreshData();
  },

  onHide() {
    this.saveCurrentState();
  },

  onUnload() {
    this.cleanup();
  },
});
```

### 数据绑定
- 使用 `setData` 更新页面数据
- 避免频繁调用 `setData`
- 只更新必要的数据字段

```typescript
// ✅ 好的示例
this.setData({
  'temperatureList[0].temperature': newTemperature,
});

// ❌ 避免的示例
this.setData({
  temperatureList: this.data.temperatureList,
});
```

### 事件处理
- 事件处理函数使用 `handle` 前缀
- 传递必要的数据通过 `data-*` 属性

```typescript
// ✅ 好的示例
handleTemperatureInput(event: any) {
  const { value } = event.detail;
  const { recordId } = event.currentTarget.dataset;
  // 处理逻辑
}
```

## 🎨 样式规范

### WXSS 规范
- 使用 BEM 命名方法
- 避免使用 ID 选择器
- 使用 rpx 单位进行响应式设计
- 合理使用 Flexbox 布局

```css
/* ✅ 好的示例 */
.temperature-input {
  width: 200rpx;
  height: 80rpx;
}

.temperature-input__field {
  border: 1rpx solid #ccc;
}

.temperature-input--disabled {
  opacity: 0.5;
}

/* ❌ 避免的示例 */
#temp {
  width: 100px;
}

.input {
  border: 1px solid #ccc;
}
```

## 🔧 工具函数规范

### 函数设计
- 单一职责原则
- 纯函数优先
- 添加详细的 JSDoc 注释
- 包含错误处理

```typescript
/**
 * 格式化体温显示
 * @param temperature 体温值
 * @param unit 温度单位
 * @returns 格式化后的温度字符串
 */
export function formatTemperature(
  temperature: number,
  unit: 'celsius' | 'fahrenheit' = 'celsius'
): string {
  if (typeof temperature !== 'number' || isNaN(temperature)) {
    throw new Error('Invalid temperature value');
  }

  const symbol = unit === 'celsius' ? '°C' : '°F';
  return `${temperature.toFixed(1)}${symbol}`;
}
```

### 错误处理
- 使用 try-catch 处理异步操作
- 提供有意义的错误信息
- 记录错误日志

```typescript
async function saveTemperatureRecord(record: TemperatureRecord): Promise<void> {
  try {
    await StorageManager.setItem('temperature_records', record);
  } catch (error) {
    console.error('Failed to save temperature record:', error);
    throw new Error('保存体温记录失败，请重试');
  }
}
```

## 📊 数据管理规范

### 本地存储
- 使用统一的存储键名常量
- 数据序列化和反序列化
- 版本兼容性处理

```typescript
// 存储键名常量
export const STORAGE_KEYS = {
  TEMPERATURE_RECORDS: 'fertility_temperature_records',
  USER_SETTINGS: 'fertility_user_settings',
} as const;

// 数据存储
async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    const serializedData = JSON.stringify(data);
    await wx.setStorage({ key, data: serializedData });
  } catch (error) {
    throw new Error(`Failed to save data for key: ${key}`);
  }
}
```

### 数据验证
- 在数据存储前进行验证
- 在数据读取后进行验证
- 提供默认值处理

```typescript
function validateTemperatureRecord(record: any): TemperatureRecord {
  const validation = Validator.validateObject(record, {
    temperature: Validator.validateTemperature,
    date: Validator.validateDate,
    time: Validator.validateTime,
  });

  if (!validation.valid) {
    throw new Error(`Invalid temperature record: ${JSON.stringify(validation.errors)}`);
  }

  return record as TemperatureRecord;
}
```

## 🧪 测试规范

### 单元测试
- 为工具函数编写单元测试
- 测试正常情况和边界情况
- 使用描述性的测试名称

```typescript
describe('DateUtils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15');
      expect(DateUtils.formatDate(date)).toBe('2024-01-15');
    });

    it('should handle invalid date', () => {
      expect(() => DateUtils.formatDate('invalid')).toThrow();
    });
  });
});
```

## 📝 注释规范

### JSDoc 注释
- 为所有公共函数添加 JSDoc 注释
- 描述参数、返回值和异常
- 提供使用示例

```typescript
/**
 * 计算排卵日期
 * @param lastPeriodDate 上次月经开始日期 (YYYY-MM-DD)
 * @param cycleLength 月经周期长度（天）
 * @returns 预测的排卵日期
 * @throws {Error} 当输入参数无效时抛出错误
 * @example
 * ```typescript
 * const ovulationDate = calculateOvulationDate('2024-01-01', 28);
 * console.log(ovulationDate); // '2024-01-15'
 * ```
 */
export function calculateOvulationDate(
  lastPeriodDate: string,
  cycleLength: number
): string {
  // 实现
}
```

### 代码注释
- 解释复杂的业务逻辑
- 标注算法来源和参考
- 使用中文注释解释业务概念

```typescript
// 基础体温双相变化算法
// 参考：《妇产科学》第9版，排卵后体温上升0.3-0.5°C
function detectTemperatureShift(temperatures: number[]): boolean {
  // 计算前6天的平均体温（卵泡期）
  const follicularAvg = temperatures.slice(0, 6).reduce((a, b) => a + b) / 6;
  
  // 计算后6天的平均体温（黄体期）
  const lutealAvg = temperatures.slice(-6).reduce((a, b) => a + b) / 6;
  
  // 判断是否存在双相变化
  return lutealAvg - follicularAvg >= 0.3;
}
```

## 🚀 性能优化规范

### 小程序性能
- 合理使用分包加载
- 优化图片资源大小
- 避免频繁的 setData 调用
- 使用节流和防抖

```typescript
// 防抖处理用户输入
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

const handleTemperatureInput = debounce((value: string) => {
  // 处理体温输入
}, 300);
```

## 🔒 安全规范

### 数据安全
- 敏感数据加密存储
- 输入数据验证和清理
- 避免在日志中输出敏感信息

```typescript
// 数据清理
function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // 移除潜在的HTML标签
    .substring(0, 200); // 限制长度
}
```

这些编码规范将确保项目代码的质量、可维护性和一致性。请在开发过程中严格遵循这些规范。