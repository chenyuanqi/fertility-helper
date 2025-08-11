# 迭代概览与开发速启指南（当前版本）

本文档用于快速同步小程序当前状态、关键设计与最近迭代的变更，帮助下一次迭代快速进入开发与验证。

## 一、项目概览（备小孕）
- 目标：帮助用户记录基础体温、月经经量、同房数据，并提供排卵与易孕期预测及可视化分析。
- 技术栈：微信小程序原生框架 + TypeScript/JavaScript，ECharts（简化图表组件），本地存储。
- 数据存储：完全本地（wx.setStorage），无后端。

目录关键位置：
- 小程序源码：`miniprogram/miniprogram/`
- 页面：`pages/index`、`pages/record`、`pages/calendar`、`pages/chart`
- 工具：`utils/date.js`、`utils/storage.js`、`utils/dataManager.js`、`utils/ovulationAlgorithm.js`
- 文档：`docs/`

## 二、最近修复与变更（本迭代）
- 周期未自动延展到今天
  - 新增：`DataManager.ensureCyclesUpToCurrentDate`
  - 接入：在首页 `pages/index/index.js` 的 `loadPageData` 与图表页 `pages/chart/chart.js` 的 `onLoad/onShow` 调用，确保周期自动补齐到今天。
- 图表说明“月经记录”图例
  - 变更：由“卫生巾图标”改为“红色圆点”。文件：`pages/chart/chart.wxml`
- 从日历进入编辑返回后月份错乱
  - 变更：编辑前记录 `beforeEditYear/beforeEditMonth`，编辑页保存后通过 `eventChannel` 回传，恢复到编辑前月份并刷新当月数据。文件：`pages/calendar/calendar.js`、`pages/record/record.js`
- 日历编辑自动保存
  - 变更：改为“6 秒倒计时自动保存”，用户停止操作后自动保存。文件：`pages/record/record.js`
- 测试兼容
  - 新增：`OvulationAlgorithm.analyzeTemperatureData` 方法，满足边界测试调用。文件：`utils/ovulationAlgorithm.js`

所有测试在 `miniprogram` 目录下执行通过（4/4）：`npm test`

## 三、周期计算逻辑（当前标准）
- 周期开始：当日记录设置“经期开始”（`isStart=true`）或首页“设置周期开始日期”，创建一个新周期。
- 周期结束（主规则）：某周期结束日 = “下一个周期开始日 − 1 天”。
- 最后一个周期：若尚无“下一个周期开始日”，则用“平均周期长度”（设置页，默认 28 天）预测其结束日；必要时持续创建后续周期直到覆盖“今天”。
- 历史数据规范化：进入首页/图表页前，自动规范化所有周期（排序、截断/补齐），避免周期重叠。
- 说明：若用户较密集地标记“经期开始”（例如 7.10 和 7.23），上一个周期会被下一个开始日截断，可能出现“十几天”的短周期，这符合主规则。

可选后续优化（未实施）：
- `isEnd` 仅表示“出血期结束”，不直接结束整个月经周期。
- 设置“最小开始间隔”阈值（如 <20 天提醒），避免误触造成短周期。

## 四、数据模型要点（与现有实现对齐）
- 日记录（DailyRecord）：`date`、`temperature`、`menstrual{ padCount, color, isStart, isEnd }`、`intercourse[]`、`notes`。
- 周期（MenstrualCycle）：`id`、`startDate`、`endDate`、`length`、`isComplete`、统计信息等。
- 存储键：见 `miniprogram/miniprogram/utils/storage.js` 中 `STORAGE_KEYS`。
- 兼容：旧版“经量 flow”已映射为 `padCount`（迁移在 `DataManager.migrateData` 中处理）。

## 五、关键页面/模块与职责
- `pages/index/index.js`（首页）：
  - 加载用户设置、今日记录、周期信息、智能分析；
  - 进入前调用 `ensureCyclesUpToCurrentDate` 规范化周期。
- `pages/calendar/calendar.js`（日历）：
  - 生成 6 周网格，展示摘要；
  - 进入编辑前记录当前年月，返回后恢复；
  - 数据来自 `DataManager.getDayRecordsInRange`。
- `pages/record/record.js`（记录）：
  - 三类记录：体温、月经（padCount/颜色/开始/结束）、同房；
  - 自动保存 6 秒；保存后向来源页发 `recordSaved/recordUpdated` 事件。
- `pages/chart/chart.js`（图表）：
  - 进入前调用 `ensureCyclesUpToCurrentDate`；
  - 按当前周期范围聚合 `chartData`；
  - 图例“月经记录”为红色圆点。
- `utils/dataManager.js`：统一数据增删改查与迁移、周期更新、缓存；新增 `ensureCyclesUpToCurrentDate`。
- `utils/ovulationAlgorithm.js`：体温模式、周期分析、易孕窗口；新增 `analyzeTemperatureData` 兼容方法。
- `utils/storage.js`：本地存储封装（同步+异步双写以增强稳定性）。

## 六、开发与调试速启
- 打开微信开发者工具，项目根：`miniprogram/`（注意是内层 `miniprogram/miniprogram/` 存源码）。
- 首页/图表页打开即可自动规范化周期并刷新视图。
- 日历选中日期 → 编辑 → 等待 6 秒自动保存 → 返回仍在原月份。

## 七、测试
- 位置：`miniprogram/miniprogram/tests/`
- 运行：
  ```bash
  cd miniprogram
  npm install  # 首次需要
  npm test
  ```
- 用例覆盖：工具函数边界、集成流、UX 期望、算法兼容。

## 八、已知约束与后续建议
- 约束：
  - 平均周期长度仅用于“最后一个周期”的预测；真实周期以“下个开始日 − 1 天”为准。
  - 若用户误触频繁设置“经期开始”，会产生较短周期（符合当前主规则）。
- 建议：
  - 将 `isEnd` 从“结束整周期”改为“出血期结束”的语义，周期仍以下次开始日界定；
  - 新增“最小开始间隔提醒”；
  - 图表月经强度可按 `padCount` 做尺寸/颜色梯度；
  - 在日历页也统一调用 `ensureCyclesUpToCurrentDate`（当前首页/图表已调用）。

## 九、重要文件清单（本迭代涉及）
- `miniprogram/miniprogram/utils/dataManager.js`（新增 `ensureCyclesUpToCurrentDate`）
- `miniprogram/miniprogram/pages/index/index.js`（调用补齐）
- `miniprogram/miniprogram/pages/chart/chart.js`（调用补齐）
- `miniprogram/miniprogram/pages/chart/chart.wxml`（图例红点）
- `miniprogram/miniprogram/pages/record/record.js`（6 秒自动保存，事件回传）
- `miniprogram/miniprogram/pages/calendar/calendar.js`（返回恢复月份）
- `miniprogram/miniprogram/utils/ovulationAlgorithm.js`（新增 `analyzeTemperatureData`）

## 十、验收小清单（下次回归用）
- [ ] 首页/图表打开后，周期无重叠，且覆盖今天
- [ ] 图表“月经记录”为红色圆点
- [ ] 日历：编辑保存后返回仍停留在编辑前月份
- [ ] 记录页：6 秒自动保存生效，事件通知来源页刷新
- [ ] `npm test` 全部通过

---
如需将“最小开始间隔提醒”与“出血期/周期语义分离”纳入本版本，请在迭代任务中加入需求，我会基于上述建议实施并补充测试用例与文档。