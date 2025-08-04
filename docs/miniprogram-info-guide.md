# 备小孕小程序信息完善指南

## 📋 小程序基本信息

### 1. 小程序名称
**中文名称**: 备小孕  
**英文名称**: Fertility Helper  
**名称说明**: 简洁明了，直接体现备孕功能，易于用户理解和记忆

### 2. 小程序简介
**一句话介绍**: 科学备孕，智能预测，让备孕更简单  
**详细介绍**: 
```
备小孕是一款专业的女性生育健康管理工具，通过科学的数据记录和AI智能分析，帮助用户精准预测排卵期，提供个性化的备孕指导。

核心功能：
• 30秒快速记录体温、月经、同房数据
• AI智能排卵预测，准确率高达85%+
• 直观的数据可视化图表和日历视图
• 个性化健康建议和易孕期提醒
• 本地数据存储，隐私安全有保障
• 专业的周期分析和健康报告

适用人群：备孕期女性、月经不调女性、关注生育健康的女性
```

### 3. 小程序头像设计
**设计要求**:
- 尺寸: 144x144px
- 格式: PNG/JPG
- 风格: 简洁、温馨、专业
- 色彩: 粉色系或暖色调，体现女性关怀

**设计元素建议**:
- 主图标: 爱心 + 温度计 或 花朵 + 曲线图
- 背景: 渐变色或纯色
- 字体: 可选择性添加"备小孕"字样

### 4. 服务类目
**主类目**: 医疗 > 互联网医院 > 健康咨询  
**备选类目**: 生活服务 > 健康管理  
**说明**: 根据微信审核要求选择最合适的类目

## 📱 小程序配置信息

### 1. app.json 配置完善

```json
{
  "pages": [
    "pages/index/index",
    "pages/record/record", 
    "pages/chart/chart",
    "pages/calendar/calendar",
    "pages/settings/settings",
    "pages/help/help",
    "pages/privacy/privacy",
    "pages/agreement/agreement"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#FF6B9D",
    "navigationBarTitleText": "备小孕",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#F8F9FA"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#FF6B9D",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/tab/home.png",
        "selectedIconPath": "images/tab/home-active.png"
      },
      {
        "pagePath": "pages/record/record",
        "text": "记录",
        "iconPath": "images/tab/record.png", 
        "selectedIconPath": "images/tab/record-active.png"
      },
      {
        "pagePath": "pages/chart/chart",
        "text": "图表",
        "iconPath": "images/tab/chart.png",
        "selectedIconPath": "images/tab/chart-active.png"
      },
      {
        "pagePath": "pages/calendar/calendar",
        "text": "日历",
        "iconPath": "images/tab/calendar.png",
        "selectedIconPath": "images/tab/calendar-active.png"
      },
      {
        "pagePath": "pages/settings/settings",
        "text": "设置",
        "iconPath": "images/tab/settings.png",
        "selectedIconPath": "images/tab/settings-active.png"
      }
    ]
  },
  "networkTimeout": {
    "request": 10000,
    "downloadFile": 10000
  },
  "debug": false,
  "navigateToMiniProgramAppIdList": [],
  "permission": {
    "scope.userLocation": {
      "desc": "用于提供基于位置的健康建议"
    }
  }
}
```

### 2. project.config.json 配置

```json
{
  "description": "备小孕 - 科学备孕助手",
  "packOptions": {
    "ignore": [
      {
        "type": "file",
        "value": ".eslintrc.js"
      },
      {
        "type": "file", 
        "value": ".gitignore"
      },
      {
        "type": "file",
        "value": "README.md"
      }
    ]
  },
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": true,
    "coverView": true,
    "nodeModules": false,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "uglifyFileName": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": false,
    "lazyloadPlaceholderEnable": false,
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    },
    "enableEngineNative": false,
    "useIsolateContext": false,
    "userConfirmedBundleSwitch": false,
    "packNpmManually": false,
    "packNpmRelationList": [],
    "minifyWXSS": true,
    "disableUseStrict": false,
    "minifyWXML": true,
    "showES6CompileOption": false,
    "useCompilerPlugins": false
  },
  "compileType": "miniprogram",
  "libVersion": "2.19.4",
  "appid": "你的小程序AppID",
  "projectname": "备小孕",
  "debugOptions": {
    "hidedInDevtools": []
  },
  "scripts": {},
  "staticServerOptions": {
    "baseURL": "",
    "servePath": ""
  },
  "isGameTourist": false,
  "condition": {
    "search": {
      "list": []
    },
    "conversation": {
      "list": []
    },
    "game": {
      "list": []
    },
    "plugin": {
      "list": []
    },
    "gamePlugin": {
      "list": []
    },
    "miniprogram": {
      "list": []
    }
  }
}
```

## 🖼️ 小程序截图准备

### 1. 截图要求
- **数量**: 3-5张
- **尺寸**: 750x1334px (iPhone 6/7/8 标准)
- **格式**: PNG/JPG
- **大小**: 每张不超过2MB

### 2. 截图内容规划

#### 截图1: 首页展示
**内容**: 
- 智能分析卡片显示易孕期状态
- 快速记录按钮
- 今日数据概览
- 个性化建议

**文案**: "AI智能分析，精准预测排卵期"

#### 截图2: 数据记录页面
**内容**:
- 三合一记录界面
- 体温数字键盘
- 经量滑条选择
- 同房记录功能

**文案**: "30秒快速记录，操作简单便捷"

#### 截图3: 图表可视化
**内容**:
- 三合一图表展示
- 体温折线图
- 经期背景和同房标记
- 排卵预测标记

**文案**: "直观图表展示，数据趋势一目了然"

#### 截图4: 日历视图
**内容**:
- 完整月视图日历
- 多种数据指示器
- 日期详情面板
- 统计信息展示

**文案**: "完整日历视图，全面掌握生理周期"

#### 截图5: 智能分析
**内容**:
- 周期分析报告
- 健康建议
- 数据质量评分
- 个性化指导

**文案**: "专业分析报告，个性化健康指导"

## 📝 版本信息

### 1. 版本号规划
**当前版本**: 1.0.0  
**版本命名规则**: 主版本号.次版本号.修订号  
**版本描述**: 
```
v1.0.0 - 首个正式版本
• 完整的数据记录功能
• AI智能排卵预测
• 数据可视化图表
• 本地数据存储
• 个性化健康建议
```

### 2. 更新日志模板
```
【新功能】
• 新增AI智能排卵预测算法
• 新增三合一数据可视化图表
• 新增完整日历视图

【优化改进】  
• 优化数据记录流程，30秒内完成记录
• 优化界面设计，提升用户体验
• 优化算法准确性，预测准确率达85%+

【问题修复】
• 修复数据同步问题
• 修复图表显示异常
• 修复兼容性问题
```

## 🔐 权限申请说明

### 1. 必需权限
**无需特殊权限**: 本小程序主要使用本地存储，无需申请特殊权限

### 2. 可选权限
**位置权限** (scope.userLocation):
- **用途**: 提供基于地理位置的健康建议
- **说明**: 用户可选择是否授权，不影响核心功能使用

### 3. 权限使用说明
```javascript
// 位置权限申请示例
wx.getSetting({
  success(res) {
    if (!res.authSetting['scope.userLocation']) {
      wx.authorize({
        scope: 'scope.userLocation',
        success() {
          // 用户同意授权
        },
        fail() {
          // 用户拒绝授权，功能降级处理
        }
      })
    }
  }
})
```

## 📋 审核准备清单

### 1. 必备材料
- [x] 小程序基本信息完善
- [x] 隐私政策文档
- [x] 用户服务协议
- [x] 小程序截图(3-5张)
- [x] 小程序头像设计
- [x] 功能介绍文档
- [ ] 测试账号(如需要)

### 2. 代码检查
- [x] 移除调试代码和console.log
- [x] 检查敏感词汇和内容
- [x] 确保所有功能正常运行
- [x] 检查页面加载速度
- [x] 验证数据存储功能
- [x] 测试各种设备兼容性

### 3. 合规检查
- [x] 确保内容健康向上
- [x] 无违法违规内容
- [x] 隐私政策合规
- [x] 用户协议完整
- [x] 功能描述准确

## 🚀 提交审核流程

### 1. 预提交检查
```bash
# 代码检查清单
□ 移除所有console.log和调试代码
□ 检查所有页面是否正常加载
□ 验证核心功能是否正常工作
□ 测试数据存储和读取功能
□ 检查图片资源是否正常显示
□ 验证隐私政策和用户协议链接
```

### 2. 提交步骤
1. **登录微信公众平台**
   - 进入小程序管理后台
   - 选择"版本管理"

2. **上传代码**
   - 使用微信开发者工具上传代码
   - 填写版本号和版本描述
   - 确认上传成功

3. **提交审核**
   - 在管理后台选择"提交审核"
   - 填写功能页面和测试说明
   - 上传小程序截图
   - 确认提交

4. **等待审核**
   - 审核时间通常为1-7个工作日
   - 关注审核状态和反馈
   - 如有问题及时修改重新提交

### 3. 审核注意事项
- **功能描述要准确**: 确保描述与实际功能一致
- **截图要清晰**: 展示核心功能和界面
- **内容要合规**: 避免敏感词汇和违规内容
- **隐私政策要完整**: 详细说明数据收集和使用
- **测试要充分**: 确保所有功能正常运行

## 📞 联系信息

### 1. 客服信息
**客服邮箱**: support@beiyun.app  
**工作时间**: 工作日 9:00-18:00  
**响应时间**: 24小时内回复

### 2. 意见反馈
**反馈邮箱**: feedback@beiyun.app  
**QQ群**: [待建立]  
**微信群**: [待建立]

### 3. 商务合作
**合作邮箱**: business@beiyun.app  
**联系电话**: [待填写]

---

**完成小程序信息完善后，请在开发指南中将此项标记为已完成 ✅**