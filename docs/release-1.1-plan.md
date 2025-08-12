### 版本 1.1 规划与实施指引（增强版）

本计划用于指导“备小孕”小程序 1.1 版本的增强迭代，聚焦：算法一致性、记录体验优化、数据可靠性与可维护性。按本文逐条执行即可。

### 版本目标
- 一致性：全局按“黄体期长度”推导排卵与阶段判断（移除固定 14/16 天残留）。
- 可用性：记录页切换前自动保存、保存成功仅文字提示并停留 2 秒。
- 可靠性：周期无重叠、导入导出更稳健、关键路径测试完善。
- 可维护性：方案与测试文档化，快速回归。

### 范围与优先级
- P0（必须）
  - 全局统一按“黄体期长度”计算（算法/首页/图表一致）（已完成）
  - 记录页保存成功 2 秒轻提示（已完成）
  - 切换前自动保存（已完成）
  - 设置页“黄体期长度”与“平均周期长度”级联校验（已完成）
  - 图表页长按菜单去“编辑周期”（已完成）
  - 设置页去“检查更新”（已完成）
- P1（建议本次）
  - 图表显示“易孕期/最佳受孕期”背景高亮并在图例说明
  - 日历当天详情显示“阶段/易孕期倒计时”
  - 导出文件写入 `schemaVersion/appVersion`，导入时校验
- P2（可选）
  - 本地问题自检页（不上传，仅排障）
  - 无障碍与点击区域优化

### 技术方案摘要
- 算法：`utils/ovulationAlgorithm.js` 已支持 `averageLutealPhase`（默认14，范围 10–16）。调用方需透传。
- 首页与图表：根据设置值计算排卵与阶段；图表后续新增区间背景（fertile/optimal）。
- 记录页：切换前自动保存与 2 秒轻提示已实现；提示与自动保存条共用区域。
- 设置页：级联校验与移除“检查更新”已完成。
- 导出/导入：导出写入 `schemaVersion: '1.1.0'` 与 `appVersion`；导入校验并提示兼容策略。

### 任务分解与实施步骤
1) 图表显示易孕期区间（P1）
   - 数据：在首页智能分析结果中已有 `fertileWindow`；也可在图表页按当前周期重新计算。
   - `components/simple-chart/simple-chart.js`
     - 新增属性：`fertileWindow`
     - 新增方法：`drawFertileBackground(ctx, padding, chartWidth, chartHeight, fertileWindow)`
       - 先绘制浅红色“易孕期”，再覆盖高亮红“最佳期”
     - 图例增加“易孕期/最佳期”说明
   - 验收：在不同周期与设置值下范围准确、与数据点不冲突

2) 日历阶段提示（P1）
   - `pages/calendar/calendar.js`：生成当天 `fertileWindow.currentStatus`（pre_fertile/fertile/optimal/post_fertile）
   - `calendar.wxml`：详情顶部加入一行提示，如：“本周期阶段：卵泡期 / 距离易孕期还有 2 天”
   - 验收：切换日期或变更设置值，提示实时更新

3) 导出/导入版本化（P1）
   - `pages/settings/settings.js`
     - 导出：JSON 顶层增加 `schemaVersion: '1.1.0'`、`appVersion`
     - 导入：校验 `schemaVersion`；不匹配时弹窗提示“兼容导入/取消”，并给出字段映射说明
   - 验收：跨版本导入给出清晰提示；同版本导入成功

4) 回归与测试（P0）
   - 单测：
     - `averageLutealPhase` 参与排卵预测
     - 切换前自动保存、保存成功 2 秒轻提示
     - 周期无重叠、`ensureCyclesUpToCurrentDate` 正确
   - 手测清单：更新 `miniprogram/miniprogram/tests/功能测试检查清单.md` 覆盖 1.1 场景

### 里程碑（预估）
- M1（1 天）：方案确认与文档完善（本文件、`iteration-overview.md`）
- M2（2 天）：图表易孕期区间与图例 + 单测
- M3（1 天）：日历阶段/倒计时
- M4（1 天）：导出/导入版本化 + 回归
- 预留（1 天）：打磨修复与提交审核

### 验收标准
- 修改“黄体期长度”后，首页/图表/日历阶段与排卵相关显示一致并即时生效
- 记录页保存成功仅文字提示、2 秒自动消失，不遮挡操作
- 图表存在正确的“易孕期/最佳期”背景与图例说明
- 导出包含 `schemaVersion`；导入跨版本时有清晰引导

### 风险与对策
- 数据稀疏：算法无法判定时降级仅显示统计信息并给出引导
- 版本导入：不匹配时提供“兼容导入”路径并记录字段映射
- UI 对比度：深浅背景叠加时提高文字对比度

### 发布流程（简）
自测 → `npm test` 全绿 → 体验版 → 用户验证 → 正式版；审核注意隐私入口与描述合规。

### 变更清单（文件级）
- `components/simple-chart/simple-chart.js`：新增背景绘制与属性
- `pages/calendar/*`：阶段/倒计时展示
- `pages/settings/settings.js`：导出 schemaVersion、导入校验
- `utils/ovulationAlgorithm.js`：参数透传（已就绪）

### 开发者操作
```bash
cd miniprogram && npm i && npm test | cat
# 运行后用微信开发者工具打开 miniprogram/miniprogram
```

备注：与 `docs/iteration-overview.md` 配合阅读；遇到分歧，以“统一用黄体期长度”为准。
