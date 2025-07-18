# 备孕助手 · 小程序概要设计文档（V0.2）

> **更新记录**：追加了“体温‑经量‑同房**三合一可视化**”要求，并补全 MVP 范围。

---

## 1. 项目概述

“备孕助手”是一款面向备孕女性及其伴侣的微信小程序，核心价值在于**30 秒极简记录 + 智能算法判排卵 + 一屏式可视化**。产品帮助用户科学管理基础体温（BBT）、月经经量和同房情况，及时捕捉排卵窗口，提高受孕成功率，并方便医生远程评估。

## 2. 目标用户 & 痛点

| 角色      | 场景       | 主要痛点                   |
| ------- | -------- | ---------------------- |
| 备孕女性    | 每日晨起测体温  | 纸质体温表繁琐、数据难读懂、排卵时机把握不准 |
| 伴侣      | 高度配合备孕   | 缺乏直观日历提醒、行动不够同步        |
| 妇产科/生殖科 | 远程跟踪患者周期 | 难以拿到结构化体温+经量+同房完整数据    |

## 3. 功能结构 & 优先级

### 3.1 MVP 功能（首版必须交付）

| 模块        | 功能点                                                                                         | 备注           |
| --------- | ------------------------------------------------------------------------------------------- | ------------ |
| **记录**    | • 数字键盘手动录入体温 <br>• 经量三档（少/中/多）滑条 <br>• 一键同房标记（可补充体位/避孕情况备注）                                 | 录入 ≤30 秒     |
| **三合一图表** | • 折线：基础体温 <br>• 区块：经期+经量深浅渐变 <br>• 图标：同房符号（⚫=已同房、◯=补录、★=高峰时段） <br>• 自动绘制 cover‑line 与排卵预测标记 | 同屏展示，左右滑动切周期 |
| **日历视图**  | 日历格内缩略体温 + 图标摘要（经期/同房/预测排卵）                                                                 | 快速纵览一个月      |
| **提醒**    | • 晨起测温未完成推送 <br>• 易孕日、预测排卵窗口提醒                                                              | 微信模板消息       |
| **导出**    | 周期报告（PDF / 长图）                                                                              | 医生沟通、一键分享    |

### 3.2 进阶功能（V1.1‑V1.2）

| 模块        | 功能点                                 |
| --------- | ----------------------------------- |
| **数据洞察**  | 周期统计、黄体期长度、排卵波动、风险预警                |
| **伴侣共享**  | 房间码同步、权限细粒度控制（仅显示摘要 / 全数据）          |
| **硬件接入**  | BLE 智能体温计 SDK、Apple Health / 华为健康同步 |
| **AI 辅助** | 睡眠‑压力‑体温多维分析、情绪陪伴提示                 |

## 4. 三合一可视化设计

| 图层   | 视觉形式             | 说明                                 |
| ---- | ---------------- | ---------------------------------- |
| 体温   | 折线 + 点标签         | 点 hover/点击显示当日详情（温度值、症状备注、时间戳）     |
| 月经经量 | 背景区块填充           | 少‑淡粉、中‑正红、多‑深红；可视化区间由「经期开始/结束」标记决定 |
| 同房记录 | 图标/符号叠加          | ⚫=当日同房，◯=补录，★=AI 建议高峰；支持多次记录时以数字叠加 |
| 辅助标记 | cover‑line、排卵日星标 | 算法判定温升第 3 天+0.3℃；排卵预测区间用浅黄背景       |

> **交互要点**：
>
> 1. 默认展示当前周期；左右滑切换历史期。
> 2. 双指缩放放大单周；单指拖动平移。
> 3. 长按数据点进入编辑页，可修改记录。

## 5. 数据模型（简化）

```mermaid
classDiagram
  class Record {
    string id
    date date
    float temperature
    enum bleed_level {none, light, medium, heavy}
    bool is_sexual
    string sex_note
    string symptom_tags[]
  }
  class Cycle {
    string id
    date start_date
    date end_date
    Record records[]
    date predicted_ovulation
  }
```

## 6. 技术架构概览

* **前端**：Taro + TypeScript + Zustand 状态管理 + ECharts 可视化
* **后端**：NestJS + PostgreSQL（TimescaleDB 做时间序列）
* **云服务**：腾讯云 SCF & 云开发数据库（小程序直连）
* **监控**：Sentry + 腾讯云 CLS 日志

## 7. MVP 时间线

| 阶段        | 交付物                    | 预计耗时 |
| --------- | ---------------------- | ---- |
| 需求冻结 & 原型 | Figma 高保真 + API Schema | 1 周  |
| 核心开发      | 记录模块 + 三合一图表 + 导出      | 3 周  |
| 内测 & 修复   | Bug list + 性能优化        | 1 周  |
| 上线 & 复盘   | 小程序审核通过 + 数据看板         | 1 周  |

## 8. 隐私与安全

* 微信加密存储 + AES‑256 本地缓存
* 支持一键删除账户及全部数据
* 合规：China PIPL & GDPR 双遵守

## 9. 指标 & KPI

| 指标       | 目标（上线后 3 个月） |
| -------- | ------------ |
| 日活 DAU   | >3,000       |
| 7 日留存    | >45 %        |
| 完整周期记录率  | >60 %        |
| 导出报告次数/人 | ≥1           |

---

> **下一步**：确认 UI 原型细节（尤其是三合一图表符号样式），并锁定 BLE 智能体温计的兼容型号。
