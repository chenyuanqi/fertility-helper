# 组件使用指南

本文档介绍如何使用项目中的自定义组件。

## 1. 数字键盘组件 (keyboard)

用于体温输入的数字键盘组件。

### 使用方法

```json
// 在页面的 json 文件中引入
{
  "usingComponents": {
    "keyboard": "/components/keyboard/keyboard"
  }
}
```

```xml
<!-- 在 wxml 中使用 -->
<keyboard
  visible="{{showKeyboard}}"
  title="请输入体温"
  value="{{temperature}}"
  maxLength="5"
  minValue="35.0"
  maxValue="42.0"
  decimalPlaces="1"
  bind:confirm="onTemperatureConfirm"
  bind:cancel="onTemperatureCancel"
/>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 是否显示键盘 |
| title | String | '请输入体温' | 键盘标题 |
| value | String | '' | 初始值 |
| maxLength | Number | 5 | 最大长度 |
| minValue | Number | 35.0 | 最小值 |
| maxValue | Number | 42.0 | 最大值 |
| decimalPlaces | Number | 1 | 小数位数 |

### 事件说明

| 事件名 | 说明 | 参数 |
|--------|------|------|
| confirm | 确认输入 | { value: Number } |
| cancel | 取消输入 | - |

## 2. 滑条组件 (slider)

用于经量选择的滑条组件。

### 使用方法

```json
{
  "usingComponents": {
    "slider": "/components/slider/slider"
  }
}
```

```xml
<slider
  title="经量选择"
  value="{{flowValue}}"
  options="{{flowOptions}}"
  bind:change="onFlowChange"
  bind:confirm="onFlowConfirm"
/>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| title | String | '' | 标题 |
| value | Number | 0 | 当前值 |
| options | Array | 默认经量选项 | 选项配置 |
| disabled | Boolean | false | 是否禁用 |

### 事件说明

| 事件名 | 说明 | 参数 |
|--------|------|------|
| change | 值变化 | { value, option } |
| confirm | 确认选择 | { value, option } |

## 3. 日期选择器组件 (date-picker)

用于日期选择的组件。

### 使用方法

```json
{
  "usingComponents": {
    "date-picker": "/components/date-picker/date-picker"
  }
}
```

```xml
<date-picker
  visible="{{showDatePicker}}"
  title="选择日期"
  value="{{selectedDate}}"
  minDate="{{minDate}}"
  maxDate="{{maxDate}}"
  showShortcuts="{{true}}"
  bind:confirm="onDateConfirm"
  bind:cancel="onDateCancel"
/>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 是否显示 |
| title | String | '选择日期' | 标题 |
| value | String | '' | 当前值 (YYYY-MM-DD) |
| minDate | String | '' | 最小日期 |
| maxDate | String | '' | 最大日期 |
| showShortcuts | Boolean | true | 是否显示快捷选择 |

### 事件说明

| 事件名 | 说明 | 参数 |
|--------|------|------|
| confirm | 确认选择 | { value, date } |
| cancel | 取消选择 | - |

## 4. 弹窗组件 (modal)

通用的弹窗组件。

### 使用方法

```json
{
  "usingComponents": {
    "modal": "/components/modal/modal"
  }
}
```

```xml
<modal
  visible="{{showModal}}"
  title="提示"
  content="确定要删除这条记录吗？"
  icon="warning"
  showClose="{{false}}"
  bind:confirm="onModalConfirm"
  bind:cancel="onModalCancel"
  bind:close="onModalClose"
/>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 是否显示 |
| title | String | '' | 标题 |
| content | String | '' | 内容 |
| icon | String | '' | 图标类型 (success/warning/error/info) |
| showClose | Boolean | false | 是否显示关闭按钮 |
| showFooter | Boolean | true | 是否显示底部 |
| showCancel | Boolean | true | 是否显示取消按钮 |
| showConfirm | Boolean | true | 是否显示确认按钮 |
| cancelText | String | '取消' | 取消按钮文本 |
| confirmText | String | '确定' | 确认按钮文本 |
| confirmDisabled | Boolean | false | 确认按钮是否禁用 |
| maskClosable | Boolean | true | 点击遮罩是否关闭 |
| animation | String | 'scale' | 动画类型 (scale/slide) |
| position | String | 'center' | 弹窗位置 (center/bottom/fullscreen) |

### 事件说明

| 事件名 | 说明 | 参数 |
|--------|------|------|
| confirm | 确认 | - |
| cancel | 取消 | - |
| close | 关闭 | - |

## 5. 加载组件 (loading)

用于显示加载状态的组件。

### 使用方法

```json
{
  "usingComponents": {
    "loading": "/components/loading/loading"
  }
}
```

```xml
<loading
  visible="{{isLoading}}"
  text="加载中..."
  type="fullscreen"
  spinnerType="circle"
  size="normal"
  delay="300"
/>
```

### 属性说明

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | Boolean | false | 是否显示 |
| text | String | '加载中...' | 加载文本 |
| type | String | 'inline' | 加载类型 (fullscreen/inline/overlay) |
| spinnerType | String | 'circle' | 动画类型 (circle/dots/wave/pulse) |
| size | String | 'normal' | 尺寸 (small/normal/large) |
| delay | Number | 0 | 延迟显示时间（毫秒） |

### 方法说明

| 方法名 | 说明 | 参数 |
|--------|------|------|
| show | 显示加载 | options |
| hide | 隐藏加载 | - |
| toggle | 切换显示状态 | - |

## 使用示例

### 完整的体温记录示例

```javascript
// pages/record/record.js
Page({
  data: {
    showKeyboard: false,
    temperature: '',
    currentDate: ''
  },

  onLoad() {
    this.setData({
      currentDate: this.formatDate(new Date())
    });
  },

  // 显示体温键盘
  showTemperatureKeyboard() {
    this.setData({
      showKeyboard: true
    });
  },

  // 体温确认
  onTemperatureConfirm(e) {
    const { value } = e.detail;
    this.setData({
      temperature: value.toString(),
      showKeyboard: false
    });
    
    // 保存数据
    this.saveTemperatureRecord(value);
  },

  // 体温取消
  onTemperatureCancel() {
    this.setData({
      showKeyboard: false
    });
  },

  // 保存体温记录
  async saveTemperatureRecord(temperature) {
    try {
      // 显示加载
      this.setData({ isLoading: true });
      
      // 保存逻辑
      await this.saveData({
        date: this.data.currentDate,
        temperature: temperature,
        time: this.getCurrentTime()
      });
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});
```

## 注意事项

1. **图标资源**: 组件中使用的图标需要放置在 `/assets/icons/` 目录下
2. **样式覆盖**: 如需自定义样式，可以通过外部样式类覆盖
3. **事件处理**: 所有组件事件都使用 `bind:` 语法绑定
4. **数据验证**: 输入组件内置了基本的数据验证功能
5. **性能优化**: 大量数据时建议使用虚拟列表或分页加载

## 扩展开发

如需扩展组件功能，可以：

1. 在组件的 `properties` 中添加新的配置项
2. 在组件的 `methods` 中添加新的方法
3. 通过 `triggerEvent` 触发自定义事件
4. 使用 `slot` 插槽支持自定义内容

更多详细信息请参考各组件的源码实现。