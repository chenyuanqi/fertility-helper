# UI设计规范文档

## 🎨 设计理念

备孕助手小程序的UI设计遵循"简洁、温馨、专业"的设计理念，旨在为用户提供舒适、高效的数据记录和查看体验。

### 设计原则

1. **简洁高效**: 30秒完成记录，操作步骤最少化
2. **温馨友好**: 使用温暖的色彩和圆润的设计元素
3. **专业可信**: 确保数据展示的准确性和可读性
4. **一致性**: 保持整个应用的视觉一致性

## 🎯 色彩规范

### 主色彩

```scss
// 主色调 - 温暖粉色系
$primary-color: #ff6b9d;          // 主色
$primary-light: #ff8fb3;          // 浅主色
$primary-dark: #e55a89;           // 深主色

// 辅助色
$secondary-color: #4ecdc4;         // 辅助色（薄荷绿）
$secondary-light: #6dd5d0;        // 浅辅助色
$secondary-dark: #45b7b8;         // 深辅助色

// 功能色
$success-color: #2ed573;          // 成功/安全
$warning-color: #ffa502;          // 警告/注意
$error-color: #ff4757;            // 错误/危险
$info-color: #3742fa;             // 信息

// 中性色
$text-primary: #2c3e50;           // 主要文字
$text-secondary: #7f8c8d;         // 次要文字
$text-disabled: #bdc3c7;          // 禁用文字
$background: #f8f9fa;             // 背景色
$surface: #ffffff;                // 表面色
$border: #e9ecef;                 // 边框色
```

### 经量颜色

```scss
// 经量颜色渐变
$menstruation-none: transparent;   // 无经血
$menstruation-light: #ffcccb;     // 少量 - 淡粉色
$menstruation-medium: #ff6b6b;    // 中量 - 正红色
$menstruation-heavy: #c0392b;     // 大量 - 深红色
```

### 体温颜色

```scss
// 体温相关颜色
$temperature-low: #74b9ff;        // 低温期 - 蓝色
$temperature-high: #fd79a8;       // 高温期 - 粉色
$temperature-coverline: #636e72;  // 覆盖线 - 灰色
$ovulation-day: #fdcb6e;          // 排卵日 - 金黄色
```

## 📱 页面布局规范

### 整体布局

```scss
// 页面间距
$page-padding: 32rpx;             // 页面边距
$section-margin: 48rpx;           // 区块间距
$component-margin: 24rpx;         // 组件间距

// 容器规范
.page-container {
  padding: $page-padding;
  background-color: $background;
  min-height: 100vh;
}

.section {
  margin-bottom: $section-margin;
  background-color: $surface;
  border-radius: 16rpx;
  padding: 32rpx;
}
```

### 导航规范

```scss
// TabBar 配置
.tabbar {
  height: 100rpx;
  background-color: $surface;
  border-top: 2rpx solid $border;
  
  .tab-item {
    height: 80rpx;
    color: $text-secondary;
    
    &.active {
      color: $primary-color;
    }
  }
}

// 页面标题
.page-title {
  font-size: 48rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 32rpx;
}
```

## 🧩 组件设计规范

### 1. 按钮组件

```scss
// 主要按钮
.btn-primary {
  height: 88rpx;
  background: linear-gradient(135deg, $primary-color, $primary-light);
  border-radius: 44rpx;
  color: white;
  font-size: 32rpx;
  font-weight: 500;
  
  &:active {
    background: linear-gradient(135deg, $primary-dark, $primary-color);
  }
  
  &:disabled {
    background: $text-disabled;
  }
}

// 次要按钮
.btn-secondary {
  height: 88rpx;
  background-color: transparent;
  border: 2rpx solid $primary-color;
  border-radius: 44rpx;
  color: $primary-color;
  font-size: 32rpx;
}

// 小按钮
.btn-small {
  height: 64rpx;
  padding: 0 24rpx;
  border-radius: 32rpx;
  font-size: 28rpx;
}
```

### 2. 输入组件

```scss
// 文本输入框
.input-field {
  height: 88rpx;
  padding: 0 24rpx;
  background-color: $surface;
  border: 2rpx solid $border;
  border-radius: 16rpx;
  font-size: 32rpx;
  color: $text-primary;
  
  &:focus {
    border-color: $primary-color;
  }
  
  &::placeholder {
    color: $text-disabled;
  }
}

// 数字键盘
.number-keyboard {
  background-color: $surface;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  
  .key {
    width: 200rpx;
    height: 88rpx;
    background-color: $background;
    border-radius: 16rpx;
    font-size: 36rpx;
    color: $text-primary;
    
    &.delete {
      background-color: $error-color;
      color: white;
    }
    
    &.confirm {
      background-color: $primary-color;
      color: white;
    }
  }
}
```

### 3. 滑条组件

```scss
.slider-component {
  .slider-track {
    height: 8rpx;
    background-color: $border;
    border-radius: 4rpx;
    position: relative;
  }
  
  .slider-progress {
    height: 8rpx;
    background: linear-gradient(90deg, $menstruation-light, $menstruation-heavy);
    border-radius: 4rpx;
  }
  
  .slider-thumb {
    width: 48rpx;
    height: 48rpx;
    background-color: $surface;
    border: 4rpx solid $primary-color;
    border-radius: 50%;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  }
  
  .slider-labels {
    display: flex;
    justify-content: space-between;
    margin-top: 16rpx;
    
    .label {
      font-size: 24rpx;
      color: $text-secondary;
    }
  }
}
```

### 4. 卡片组件

```scss
.card {
  background-color: $surface;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 24rpx;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .card-title {
      font-size: 36rpx;
      font-weight: 600;
      color: $text-primary;
    }
    
    .card-action {
      font-size: 28rpx;
      color: $primary-color;
    }
  }
  
  .card-content {
    font-size: 28rpx;
    line-height: 1.6;
    color: $text-secondary;
  }
}
```

## 📊 图表设计规范

### 三合一图表

```scss
.chart-container {
  height: 600rpx;
  background-color: $surface;
  border-radius: 16rpx;
  padding: 24rpx;
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .cycle-info {
      font-size: 28rpx;
      color: $text-secondary;
    }
    
    .chart-controls {
      display: flex;
      gap: 16rpx;
      
      .control-btn {
        width: 64rpx;
        height: 64rpx;
        border-radius: 50%;
        background-color: $background;
        color: $text-secondary;
      }
    }
  }
  
  .temperature-axis {
    position: absolute;
    left: 0;
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  .date-axis {
    position: absolute;
    bottom: 0;
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  .coverline {
    stroke: $temperature-coverline;
    stroke-width: 2rpx;
    stroke-dasharray: 8rpx 4rpx;
  }
  
  .temperature-line {
    stroke: $primary-color;
    stroke-width: 4rpx;
    fill: none;
  }
  
  .temperature-point {
    fill: $primary-color;
    stroke: $surface;
    stroke-width: 4rpx;
    
    &.selected {
      fill: $warning-color;
      stroke-width: 6rpx;
    }
  }
  
  .menstruation-area {
    opacity: 0.6;
    
    &.light { fill: $menstruation-light; }
    &.medium { fill: $menstruation-medium; }
    &.heavy { fill: $menstruation-heavy; }
  }
  
  .intimacy-icon {
    font-size: 32rpx;
    
    &.recorded { color: $text-primary; }
    &.supplemented { color: $text-secondary; }
    &.recommended { color: $warning-color; }
  }
  
  .ovulation-marker {
    fill: $ovulation-day;
    stroke: $warning-color;
    stroke-width: 2rpx;
  }
}
```

### 日历视图

```scss
.calendar-view {
  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    
    .month-year {
      font-size: 36rpx;
      font-weight: 600;
      color: $text-primary;
    }
    
    .nav-btn {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      background-color: $background;
      color: $text-secondary;
    }
  }
  
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2rpx;
    
    .weekday-header {
      height: 64rpx;
      text-align: center;
      line-height: 64rpx;
      font-size: 24rpx;
      color: $text-secondary;
    }
    
    .calendar-day {
      height: 100rpx;
      border-radius: 8rpx;
      position: relative;
      
      .day-number {
        position: absolute;
        top: 8rpx;
        left: 8rpx;
        font-size: 24rpx;
        color: $text-primary;
      }
      
      .day-indicators {
        position: absolute;
        bottom: 8rpx;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 4rpx;
        
        .indicator {
          width: 12rpx;
          height: 12rpx;
          border-radius: 50%;
          
          &.temperature { background-color: $primary-color; }
          &.menstruation { background-color: $menstruation-medium; }
          &.intimacy { background-color: $secondary-color; }
          &.ovulation { background-color: $ovulation-day; }
        }
      }
      
      &.today {
        background-color: $primary-light;
        opacity: 0.3;
      }
      
      &.selected {
        background-color: $primary-color;
        
        .day-number {
          color: white;
        }
      }
      
      &.other-month {
        opacity: 0.3;
      }
    }
  }
}
```

## 🔔 状态与反馈

### 加载状态

```scss
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80rpx 0;
  
  .loading-spinner {
    width: 64rpx;
    height: 64rpx;
    border: 4rpx solid $border;
    border-top: 4rpx solid $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .loading-text {
    margin-top: 16rpx;
    font-size: 28rpx;
    color: $text-secondary;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### 消息提示

```scss
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 32rpx 48rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  z-index: 9999;
  
  &.success {
    background-color: rgba($success-color, 0.9);
  }
  
  &.error {
    background-color: rgba($error-color, 0.9);
  }
  
  &.warning {
    background-color: rgba($warning-color, 0.9);
  }
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  
  .modal-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: $surface;
    border-radius: 24rpx;
    padding: 48rpx;
    max-width: 600rpx;
    width: 80%;
    
    .modal-title {
      font-size: 36rpx;
      font-weight: 600;
      color: $text-primary;
      text-align: center;
      margin-bottom: 32rpx;
    }
    
    .modal-actions {
      display: flex;
      gap: 24rpx;
      margin-top: 48rpx;
      
      .btn {
        flex: 1;
      }
    }
  }
}
```

## 📐 响应式设计

### 屏幕适配

```scss
// 设备类型
$device-small: 375px;    // iPhone SE
$device-medium: 414px;   // iPhone 11 Pro Max
$device-large: 480px;    // Plus 设备

// 响应式字体
@mixin responsive-font($small, $medium, $large) {
  font-size: $small;
  
  @media (min-width: $device-medium) {
    font-size: $medium;
  }
  
  @media (min-width: $device-large) {
    font-size: $large;
  }
}

// 使用示例
.page-title {
  @include responsive-font(44rpx, 48rpx, 52rpx);
}
```

### 安全区域适配

```scss
// 刘海屏适配
.safe-area-top {
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

## ♿ 无障碍设计

### 颜色对比度

确保所有文本与背景的对比度符合WCAG 2.1 AA标准：
- 正常文本：至少4.5:1
- 大文本：至少3:1

### 触摸目标

所有可交互元素的最小触摸目标为88rpx × 88rpx。

### 语义化标签

使用适当的ARIA标签和语义化组件，确保屏幕阅读器能够正确解读内容。

## 🎯 性能优化

### 图片优化

- 使用WebP格式图片
- 提供多种尺寸的图片资源
- 实现图片懒加载

### 动画性能

- 优先使用CSS transform和opacity
- 避免频繁的重排和重绘
- 使用硬件加速

这套UI设计规范确保了备孕助手小程序具有统一、美观、易用的用户界面，同时考虑了不同设备的适配和无障碍访问需求。 