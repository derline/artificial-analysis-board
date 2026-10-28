# AGENTS.md - Artificial Analysis 数据看板项目规范与开发指南

本文件记录了 `D:\Artificial Analysis` 看板项目的核心维护规则、用户特定偏好、数据过滤机制及 UI 设计规范。在后续会话或数据更新中，**必须严格遵守以下约定**。

---

## 1. 数据来源与真实性原则 (Data Verification Rules)

- **严算禁估算 (No Synthetic / Estimated Data)**：
  - **绝对禁止**自行推演、估算或伪造未公开的 Effort 档位或 Agent 组合数据。
  - 所有指标（Intelligence Index, Coding Score, Speed tps, Cost per task, SWE-bench Solve Rate）**100% 必须来源于 Artificial Analysis 官方发布或 SWE-bench Verified 官方硬核实测数据**。
- **数据得分标准一致性**：
  - 编码 Agent 排行榜仅录入 Artificial Analysis Coding Agent Index 同一评测标准下的官方数据，严禁跨不同评测集（如 SWE-bench Verified vs Coding Agent Index vs 人工测评）混合对比，严禁手工补录未公开组合。

---

## 2. 模型筛选与过滤规则 (Model Inclusion / Exclusion Rules)

在渲染图标、四栏卡片及分类汇总表时，必须通过 `isIgnoredModel()` 进行严格过滤：

### ❌ 必须过滤/忽略的模型 (Excluded Models)
- **所有 Non-reasoning 模型**（非思考/无思维链档位，全局排除）
- `Nemotron` 系列
- `gpt-oss`
- `Grok` / `Groq`
- `o3` 开头的旧版模型

### ✅ 允许保留的精选模型 (Included Models) - 采用通用动态版本号白名单机制（$\ge$ 对应基准版本号）
- **Anthropic (Claude 系列 $\ge 4.6$)**：
  - 动态支持 Claude 4.6、4.7、4.8、5.x、6.x 及以上（包含 Opus、Sonnet 等架构和 Max / High / Med / Low 各 Effort 级别，排除 < 4.6 的旧版及 Haiku）。
  - **特别排除**：Claude Fable 5.1 及以下旧版；后续若有新版本（Fable > 5.1 如 Fable 5.2、6.x 等）自动保留纳入。
- **OpenAI (GPT 系列 $> 5.6$，即 $\ge 5.7$)**：
  - 动态支持 GPT-5.7、GPT-6、GPT-6.1 及以上（包含 Sol、Terra、Luna 等旗舰系列及 Pro 版本，全局排除 $\le 5.6$ 的旧版如 GPT-5.5、GPT-5.6 等以及 Instant 体验版）。
  - **特别排除**：GPT-6 Astra 及以下旧版；后续若有新版本（Astra > 6 如 GPT-6.1 Astra、GPT-7 Astra 等）自动保留纳入。
- **Google (Gemini 系列 $\ge 3.1$)**：
  - 动态支持 Gemini 3.1、3.5、3.6、3.7、3.8、4.x 及以上（包含 Flash、Flash-Lite、Pro、Ultra 等各 Effort 级别，排除 < 3.1 的旧版）。
- **Meta (Muse 系列)**：
  - 支持 Muse Spark 1.x、Muse Glimmer 等系列。
- **国内主流模型（支持更高演进版本）**：
  - **Qwen**：Qwen 3.8 及以上（$\ge 3.8$）
  - **Kimi**：K3、K4 及以上（$\ge \text{K3}$）
  - **DeepSeek**：V4.1、V5 及以上（$\ge 4.1$）
  - **GLM**：GLM-5.2、GLM-5.3、GLM-6 及以上（$\ge \text{5.2}$）
  - **MiniMax**：M3、M4 及以上（$\ge \text{M3}$）
  - **MiMo**：MiMo-V2.6 及以上版本、MiMo Flash 系列全系

---

## 3. 编码 Agent 排行榜规范 (Coding Agent Leaderboard Rules)

- **数据口径**：仅使用 Artificial Analysis Coding Agent Index（DeepSWE / Terminal-Bench v2 / SWE-Atlas-QnA 等权合成），严禁混入 SWE-bench Verified 或其他评测集，严禁手工估算补录。
- **主流 Harness 框架**：
  - `Codex Agent CLI`
  - `Devin Fusion` (Cognition Devin Fusion CLI)
  - `Claude Code`
  - `Cursor Agent`
  - `Kimi Code CLI`
  - `OpenCode`
  - `Gemini CLI`
  - `Antigravity` (Google Antigravity SDK)
  - `Muse Code`
- **排除框架**：
  - **忽略 Devin 旧版单体、Aider、Grok Build** 及其他未指定支持的 Agent 工具。
- **Agent Harness 筛选器 (Harness Filter)**：
  - 编码 Agent 排行榜顶部提供按 Harness 框架切换的筛选 Pill 按钮组，支持“全部 (All)”及各大主流框架快速过滤。
  - 各筛选按钮显示当前筛选组合的数量徽章（Count badge），激活时自动切换为该 Harness 专属的高亮配色，切换后表格内部排名序号即时重新计算。
- **Agent Harness Badge 专属配色**：
  - **Codex Agent CLI**：淡暖黄底色 (`#fefce8`) + 边框 (`#fef08a`) + 深金黄字 (`#a16207`)
  - **Devin Fusion**：淡暖橙底色 (`#fff7ed`) + 边框 (`#fed7aa`) + 品牌橙字 (`#ea580c`)
  - **Claude Code**：淡红粉底色 (`#fef2f2`) + 边框 (`#fecaca`) + 品牌红字 (`#dc2626`)
  - **Cursor Agent**：淡天蓝底色 (`#f0f9ff`) + 边框 (`#bae6fd`) + 品牌蓝字 (`#0284c7`)
  - **Kimi Code CLI**：淡灰绿底色 (`#f0fdf4`) + 边框 (`#bbf7d0`) + 品牌绿字 (`#16a34a`)
  - **OpenCode**：淡紫/靛青底色 (`#f5f3ff`) + 边框 (`#ddd6fe`) + 品牌紫字 (`#7c3aed`)
  - **Gemini CLI**：淡青/冰蓝底色 (`#ecfeff`) + 边框 (`#a5f3fc`) + 品牌青字 (`#0891b2`)
  - **Antigravity**：深邃靛蓝/星空紫底色 (`#eef2ff`) + 边框 (`#c7d2fe`) + 品牌靛蓝字 (`#4338ca`)
  - **Muse Code**：淡宝蓝底色 (`#eff6ff`) + 边框 (`#bfdbfe`) + 宝蓝字 (`#1d4ed8`)

---

## 4. UI 视觉设计与 CSS 规范 (Design System & Aesthetics)

- **主题模式**：固定使用现代精美**浅色模式 (Light Mode)**。
- **品牌专属配色体系 (`getModelColor`)**：
  - **Claude (Anthropic)**：红色 (`#dc2626`)
  - **GPT (OpenAI)**：暖金黄色 (`#ca8a04` / Warm Gold)
  - **Gemini (Google)**：天蓝色 (`#0284c7`)
  - **Muse (Meta)**：宝蓝色 (`#1d4ed8`)
  - **国内模型 (DeepSeek / Kimi / GLM / MiniMax / Qwen / MiMo)**：深灰/黑色 (`#1e293b`)
- **Top 4 评分卡片规范**：
  - 极细 2px 高度 (`height: 2px;`)，轨道背景色 `#f1f5f9`，渐变填充 `linear-gradient(90deg, #cbd5e1, #94a3b8)`。
  - **展示范围**：展示 Top 30 榜单（包含 Claude 系列及所有精选模型，保持全厂商统一公平呈现）。
- **表格排版与行高**：
  - 采用紧凑版内边距：`th, td { padding: 0.45rem 0.85rem; font-size: 0.875rem; }`，保持高信息密度。
  - **单元格合并 (Rowspan) 置顶**：`td[rowspan]` 单元格文字置顶对齐（`vertical-align: top; padding-top: 0.5rem;`），保留在合并组的第一行。
  - **组级别斑马纹 (Grouped Zebra Striping)**：表格背景按基本模型组 (`base model group`) 交替变色（`#ffffff` 与 `#f8fafc`），确保同一模型的不同 Effort 档位属于同一个底色块。
- **结构布局**：
  - 顶部不保留“精选模型综合指标一览表”大汇总表。
  - 依次按顺序展现：1. 头部标题；2. 颜色图例说明栏；3. 🤖 编码 Agent 组合排行榜；4. 四栏指标卡片；5. 厂商家族与 Effort 级别分类汇总一览表；6. Changelog。

---

## 5. 数据自动更新脚本说明 (Automated Data Sync Script)

项目根目录中配备了自动化数据更新与同步脚本：[update_data.js](file:///D:/Artificial%20Analysis/update_data.js)。

### 运行方式
```bash
node update_data.js
```

### 脚本处理逻辑与规范
1. **数据抓取与降级**：
  - 脚本使用 Node.js 原生 `fetch` 实时请求 `https://artificialanalysis.ai/leaderboards/models`（模型指标）与 `https://artificialanalysis.ai/agents/coding-agents`（编码 Agent 组合）。
  - 若 models 请求受阻（如离线或被 Cloudflare 拦截），将自动降级读取本地根目录下的 `models.html` 文件作为数据源；编码 Agent 页无本地降级，失败则中止以免混入手工条目。
2. **高精度数据提取**：
  - 深度解析 Next.js React Server Component (RSC) Payload 数据，提取模型元数据数组与指标数组，精准获取 `intelligenceIndex`、高难 Terminal-Bench 4.0 实测百分制得分（作为 `coding_score`）、`medianOutputTokensPerSecond`，以及 `intelligenceIndexCostPerTask` 单任务成本（兼容直接数值与对象两种存储结构）。
  - 编码 Agent 榜抓取官网实时数据并提取 `indexScore` / `costUsd` / `agentWallTimeSec`。
3. **编码 Agent 榜实测数据同步机制**：
  - 编码 Agent 排行榜严格同步官网当日最新基准评测实测数据，确保所有呈现的组合 100% 处于官网同期的最新评测尺度下。
  - 严禁将官网新基准分数与历史旧评测尺度的条目混用（避免不同打分尺度混用引发代际倒挂）。
  - 所有组合 100% 为官网硬核实测，严禁人工推演估算。
4. **数据整理与同步**：
  - 对数据进行严谨的排序处理（指数和速度降序，成本升序；Agent 按 Index 降序）。
  - 将组装好的新 `latestData` 对象同时写回 `latest_data.json` 和 `index.html`（以内嵌变量形式，避免本地浏览器 CORS 限制导致降级失效）。
  - Changelog 写入本次全量重抓记录。

---

## 6. 交互与输出风格规范 (Communication Style Guidelines)

- **直击本质，言简意赅**：
  - **核心铁律**：能一句话直击本质讲清楚的事情，坚决不写长篇大论。
  - **拒绝晦涩与过度技术铺陈**：遇到问题直接给出“本质原因”和“一句话结论”，严禁推诿、堆砌技术术语或防御性长篇论述。
  - **决策导向**：直接讲透核心差异与权衡，提供最简可行方案，让用户做最直接轻松的决策。
---

## 7. 部署与 Git 推送规范 (Git Push & Deployment Rules)

- **修改即推送 (Push on Every Change)**：
  - 以后每次修改（包括代码改动、规则调整或数据更新）后，**必须及时提交并推送至 GitHub 远端主分支 (`git push origin main`)**。
- **触发 GitHub Actions 部署**：
  - 推送至 `main` 分支将自动触发 `.github/workflows/update.yml` 流水线，完成 GitHub Pages 生产页面的自动构建与部署发布（在线地址：https://derline.github.io/artificial-analysis-board/）。
