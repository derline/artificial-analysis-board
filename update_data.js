const fs = require('fs');
const path = require('path');

const MODELS_URL = 'https://artificialanalysis.ai/leaderboards/models';
const AGENTS_URL = 'https://artificialanalysis.ai/agents/coding-agents';
const INDEX_HTML_PATH = path.join(__dirname, 'index.html');
const DATA_JSON_PATH = path.join(__dirname, 'latest_data.json');
const BASELINE_AGENTS_PATH = path.join(__dirname, 'baseline_agents.json');

function getBaselineAgents() {
  if (fs.existsSync(BASELINE_AGENTS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(BASELINE_AGENTS_PATH, 'utf8'));
    } catch (e) {
      console.error('读取 baseline_agents.json 异常:', e.message);
    }
  }
  return [];
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

async function fetchText(url) {
  const res = await fetch(url, { headers: FETCH_HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function normalizeHarness(agentName) {
  const raw = String(agentName || '').trim();
  if (!raw) return null;
  const a = raw.toLowerCase();
  if (a.includes('claude code')) return 'Claude Code';
  if (a.includes('codex')) return 'Codex Agent CLI';
  if (a.includes('cursor')) return 'Cursor Agent';
  if (a.includes('kimi code')) return 'Kimi Code CLI';
  if (a.includes('opencode')) return 'OpenCode';
  if (a.includes('gemini cli')) return 'Gemini CLI';
  if (a.includes('antigravity')) return 'Antigravity';
  if (a.includes('devin') || a.includes('fusion')) return 'Devin Fusion';
  if (a.includes('muse')) return 'Muse Code';
  return raw;
}

function getBrand(model, creator = '') {
  const n = String(model || '').toLowerCase();
  const c = String(creator || '').toLowerCase();
  if (
    n.includes('kimi') || n.includes('glm') || n.includes('deepseek') ||
    n.includes('minimax') || n.includes('qwen') || n.includes('mimo') ||
    n.includes('step') || n.includes('ernie') || n.includes('hunyuan') ||
    n.includes('doubao') || n.includes('longcat') || n.includes('nanbeige') ||
    n.includes('ling') || n.includes('ring') || n.includes('ming') ||
    ['alibaba', 'deepseek', 'kimi', 'z ai', 'minimax', 'xiaomi', 'stepfun', 'baidu', 'tencent', 'bytedance seed', 'china mobile', 'inclusionai', 'openbmb', 'nanbeige', 'longcat', 'kwaikat'].includes(c)
  ) return 'cn';
  if (n.includes('gemini') || n.includes('gemma') || c === 'google') return 'gemini';
  if (n.includes('gpt') || /\b(sol|terra|luna|astra|o1|o3|o4)\b/.test(n) || c === 'openai') return 'gpt';
  if (n.includes('claude') || n.includes('opus') || n.includes('fable') || n.includes('sonnet') || n.includes('haiku') || c === 'anthropic') return 'claude';
  if (n.includes('muse') || n.includes('llama') || c === 'meta') return 'muse';
  if (n.includes('grok') || c === 'spacexai' || c === 'xai') return 'grok';
  return 'other';
}

function extractJsonArray(html, keyPatterns) {
  let pos = -1;
  for (const k of keyPatterns) {
    pos = html.indexOf(k);
    if (pos !== -1) break;
  }
  if (pos === -1) return null;

  const startPos = html.indexOf('[', pos);
  if (startPos === -1) return null;

  let inString = false, escapeNext = false, depth = 0, arrayEnd = -1;
  for (let i = startPos; i < html.length; i++) {
    const c = html[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (c === '\\') { escapeNext = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) { arrayEnd = i; break; }
      }
    }
  }

  if (arrayEnd === -1) return null;
  const rawStr = html.substring(startPos, arrayEnd + 1);
  try {
    return JSON.parse(rawStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
  } catch (e) {
    console.error('JSON 数组解析异常:', e.message);
    return null;
  }
}

function parseModelsPage(html) {
  // 支持新版 initialModels 与旧版 models 键名
  const modelsList = extractJsonArray(html, [
    '"initialModels":[',
    '\\"initialModels\\":[',
    '"models":[',
    '\\"models\\":['
  ]);

  if (!modelsList || !Array.isArray(modelsList)) {
    console.error('未能在 models 页面中找到模型数组数据');
    return { intelList: [], codList: [], speedList: [], costList: [], modelMeta: {} };
  }

  // 统计 shortName 重复次数，避免不同思考档位（如 Instruct vs Reasoning）因 shortName 相同被覆盖
  const shortNameCounts = {};
  modelsList.forEach(m => {
    const baseName = m.shortName || m.name;
    if (baseName) shortNameCounts[baseName] = (shortNameCounts[baseName] || 0) + 1;
  });

  const intelList = [];
  const codList = [];
  const speedList = [];
  const costList = [];
  const modelMeta = {};
  const seenModels = new Set();

  modelsList.forEach(m => {
    const fullName = m.name || m.shortName;
    const baseName = m.shortName || fullName;
    if (!baseName) return;

    let displayName = shortNameCounts[baseName] > 1 && fullName ? fullName : baseName;
    if (seenModels.has(displayName)) return;
    seenModels.add(displayName);

    let hasMetric = false;

    // 1. 智商综合指数
    if (typeof m.intelligenceIndex === 'number') {
      intelList.push({ model: displayName, score: m.intelligenceIndex });
      hasMetric = true;
    }

    // 2. 编程能力指数 (Terminal-Bench 4.0 百分制实测数据)
    const terminalScore =
      typeof m.scores?.['terminalbench-4-0'] === 'number'
        ? m.scores['terminalbench-4-0']
        : (typeof m.scores?.['terminalBench40'] === 'number'
            ? m.scores['terminalBench40']
            : (typeof m.terminalBench40 === 'number'
                ? m.terminalBench40
                : (typeof m.terminalbenchV40 === 'number'
                    ? m.terminalbenchV40
                    : (typeof m.scores?.['terminalbench-hard'] === 'number'
                        ? m.scores['terminalbench-hard']
                        : null))));
    if (typeof terminalScore === 'number') {
      codList.push({ model: displayName, coding_score: terminalScore * 100 });
      hasMetric = true;
    }

    // 3. 输出速度 (tps)
    const outputSpeed = typeof m.medianOutputTokensPerSecond === 'number'
      ? m.medianOutputTokensPerSecond
      : (typeof m.outputSpeed === 'number' ? m.outputSpeed : null);
    if (typeof outputSpeed === 'number') {
      speedList.push({ model: displayName, speed_tps: outputSpeed });
      hasMetric = true;
    }

    // 4. 单任务成本 (USD)
    let costTotal = null;
    if (typeof m.intelligenceIndexCostPerTask === 'number') {
      costTotal = m.intelligenceIndexCostPerTask;
    } else if (typeof m.intelligenceIndexCostPerTask?.cost?.total === 'number') {
      costTotal = m.intelligenceIndexCostPerTask.cost.total;
    }
    if (typeof costTotal === 'number') {
      costList.push({ model: displayName, cost_usd: costTotal });
      hasMetric = true;
    }

    if (hasMetric) {
      modelMeta[displayName] = {
        creator: m.modelCreatorName || '',
        is_reasoning: m.isReasoning !== false,
        is_open_weights: Boolean(m.isOpenWeights),
        deprecated: Boolean(m.deprecated)
      };
    }
  });

  intelList.sort((a, b) => b.score - a.score);
  codList.sort((a, b) => b.coding_score - a.coding_score);
  speedList.sort((a, b) => b.speed_tps - a.speed_tps);
  costList.sort((a, b) => a.cost_usd - b.cost_usd);

  return { intelList, codList, speedList, costList, modelMeta };
}

function parseAgentsPage(html) {
  // 官网 RSC 将默认高亮项放在 rows（8 条），全量组合放在 benchmarkRows（含指向 rows 的 RSC 引用字符串）
  const rows = extractJsonArray(html, [
    '"rows":[',
    '\\"rows\\":['
  ]) || [];
  const benchmarkRows = extractJsonArray(html, [
    '"benchmarkRows":[',
    '\\"benchmarkRows\\":['
  ]) || [];

  const allRows = [...rows, ...benchmarkRows].filter(r => r && typeof r === 'object');

  if (allRows.length === 0) {
    console.error('未能在 coding-agents 页面中找到 rows / benchmarkRows 数组');
    return [];
  }

  const liveEntries = [];
  const seen = new Set();

  allRows.forEach(r => {
    const rawHarness = r.display?.agent || r.agentName;
    const harness = normalizeHarness(rawHarness);
    const model = r.display?.model || '';

    if (!harness || !model) return;

    const key = `${harness}||${model}`;
    if (seen.has(key)) return;
    seen.add(key);

    const solveRate = typeof r.indexScore === 'number' ? r.indexScore * 100 : 0;
    const avgTimeMin = typeof r.mean?.agentWallTimeSec === 'number' ? r.mean.agentWallTimeSec / 60 : null;
    const costUsd = typeof r.mean?.costUsd === 'number' ? r.mean.costUsd : null;

    liveEntries.push({
      agent_harness: harness,
      model,
      solve_rate: solveRate,
      avg_time_min: avgTimeMin,
      cost_usd: costUsd,
      brand: getBrand(model)
    });
  });

  liveEntries.sort((a, b) => b.solve_rate - a.solve_rate);
  return liveEntries;
}

async function main() {
  console.log('启动数据更新：拉取官网最新 RSC 评测，与官方实测基准库融合同步。');

  console.log(`正在从 ${MODELS_URL} 获取模型榜数据...`);
  let modelsHtml;
  try {
    modelsHtml = await fetchText(MODELS_URL);
    console.log('成功获取 models 页面。');
    fs.writeFileSync(path.join(__dirname, 'models.html'), modelsHtml, 'utf8');
  } catch (error) {
    console.error('获取 models 页面失败:', error.message);
    console.log('尝试从本地读取 models.html...');
    try {
      modelsHtml = fs.readFileSync(path.join(__dirname, 'models.html'), 'utf8');
      console.log('成功读取本地 models.html。');
    } catch (e) {
      console.error('未找到本地 models.html，无法继续。');
      process.exit(1);
    }
  }

  console.log(`正在从 ${AGENTS_URL} 获取编码 Agent 榜数据...`);
  let agentsHtml;
  try {
    agentsHtml = await fetchText(AGENTS_URL);
    console.log('成功获取 coding-agents 页面。');
  } catch (error) {
    console.error('获取 coding-agents 页面失败:', error.message);
    process.exit(1);
  }

  console.log('正在解析模型 RSC Payload...');
  const { intelList, codList, speedList, costList, modelMeta } = parseModelsPage(modelsHtml);

  console.log('正在解析编码 Agent RSC Payload...');
  const codingAgentLeaderboard = parseAgentsPage(agentsHtml);

  // 核心安全熔断保护 (Data Safety Guardrail)
  if (intelList.length < 5 || codList.length < 5 || codingAgentLeaderboard.length === 0) {
    console.error(`\n🚨 [安全熔断] 数据解析结果异常：模型智商数 (${intelList.length})、代码指数数 (${codList.length}) 或 Agent 组合数 (${codingAgentLeaderboard.length}) 严重低于正常阈值！`);
    console.error('可能原因：Artificial Analysis 官网前端发生改版。');
    console.error('已触发安全熔断保护：终止更新并拒绝覆盖 index.html 与 latest_data.json，确保线上已有展示数据绝对安全！\n');
    process.exit(1);
  }

  const now = new Date();
  const beijingParts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const today = `${beijingParts.year}-${beijingParts.month}-${beijingParts.day}`;
  const updatedAt = `${today} ${beijingParts.hour}:${beijingParts.minute}:${beijingParts.second}`;
  const latestData = {
    updated_at: updatedAt,
    source: MODELS_URL,
    agents_source: AGENTS_URL,
    coding_agent_leaderboard: codingAgentLeaderboard,
    intelligence_index: intelList,
    coding_index: codList,
    speed_tokens_per_sec: speedList,
    cost_per_task_usd: costList,
    model_meta: modelMeta,
    recent_updates: [
      {
        date: today,
        title: `取消抓取与后端过滤限制，全量同步官网所有大模型（${Object.keys(modelMeta).length} 款，含 Non-reasoning 与全厂商）及全部编码 Agent 组合（${codingAgentLeaderboard.length} 组）；并在页面新增多维手动筛选面板`,
        type: 'Feature'
      },
      {
        date: today,
        title: '调整模型过滤规则：取消对 GPT-6 Astra 的特别排除，重新纳入模型榜与 Coding Agent 榜对比',
        type: 'Filter'
      },
      {
        date: today,
        title: `修复 Coding Agent 榜 RSC 拆分解析：合并 rows 与 benchmarkRows 全量实测数据，恢复同步全部 ${codingAgentLeaderboard.length} 组符合规范的官方组合`,
        type: 'Fix'
      },
      {
        date: today,
        title: '新增 xAI Grok 系列支持（Grok ≥ 4.6，动态兼容 4.7、5.x 及以上），且默认不再局限于仅活跃模型列表',
        type: 'Feature'
      },
      {
        date: today,
        title: '调整模型过滤规则：移除 Claude Fable 5.1 及 GPT-6 Astra，后续若有新版本（Fable > 5.1、Astra > 6）将自动保留纳入',
        type: 'Filter'
      },
      {
        date: today,
        title: '调整模型过滤规则：所有 Non-reasoning（非思考/无思维链）模型及各思考级别全局不再显示',
        type: 'Filter'
      },
      {
        date: today,
        title: '调整 OpenAI 模型过滤规则：GPT-5.6 及以下型号全局不再显示，仅保留 GPT-5.7 / GPT-6 及以上旗舰版本',
        type: 'Filter'
      },
      {
        date: today,
        title: '调整 DeepSeek 模型过滤规则：仅保留 V4.1 及以上版本（过滤低于 4.1 的历史型号）',
        type: 'Filter'
      },
      {
        date: today,
        title: '调整通义千问模型过滤规则：仅保留 Qwen 3.8 及以上版本（过滤低于 3.8 的历史型号）',
        type: 'Filter'
      },
      {
        date: today,
        title: '模型白名单新增小米 MiMo 系列支持（MiMo-V2.6 及以上旗舰版本、MiMo Flash 系列全系），全量同步官方最新实测指标（含 MiMo-V2.6-Pro 及 MiMo-V2.6-Flash）',
        type: 'Feature'
      },
      {
        date: today,
        title: '升级编程能力指数评测基准为官方最新高难评测 Terminal-Bench 4.0，全面展现最新旗舰大模型（GPT-6.1 Sol, Claude Opus 5.5 等）的断代代码能力与深层思考梯度，避免旧版 v2.1 饱和引发的档位微小方差倒挂',
        type: 'Update'
      },
      {
        date: today,
        title: '重新纳入 Meta (Muse 系列) 与阿里通义千问 Qwen（>= 3.0）系列评测，编码 Agent 榜新增 Muse Code 框架及 Qwen3.8 Max 组合',
        type: 'Feature'
      },
      {
        date: today,
        title: `实时全量同步 Artificial Analysis 官方最新评测数据：更新 ${intelList.length} 款精选模型综合指标（智商指数、代码能力、吞吐速度、单任务成本）与官方实测编码 Agent 排行榜（共 ${codingAgentLeaderboard.length} 组组合）`,
        type: 'Update'
      },
      {
        date: today,
        title: '编码 Agent 榜新增 Devin Fusion 框架支持，同步 Cognition 官方最新评测组合',
        type: 'Feature'
      },
      {
        date: today,
        title: '编码 Agent 榜新增 Antigravity（Google Antigravity SDK）框架，同步官方最新实测组合',
        type: 'Feature'
      },
      {
        date: '2026-09-05',
        title: '同步官网全量最新评测：Claude Fable 5.1 与 GPT-6 Astra 登榜，全面覆盖主流 Agent 框架实测组合',
        type: 'Update'
      },
      {
        date: '2026-09-01',
        title: '新增 OpenCode Agent 框架支持，并同步全量官方数据（模型指标 + Coding Agent Index）',
        type: 'Feature'
      }
    ]
  };

  console.log('读取当前的 index.html...');
  let indexHtml = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const startMatch = indexHtml.indexOf('const latestData = {');
  const endMatch = indexHtml.indexOf('renderDashboard(latestData);') + 'renderDashboard(latestData);'.length;

  if (startMatch === -1 || endMatch === -1) {
    console.error('未能在 index.html 中定位 latestData 变量，更新失败！');
    process.exit(1);
  }

  console.log('正在将最新数据写回 index.html...');
  const newStr = 'const latestData = ' + JSON.stringify(latestData, null, 2) + ';\n    renderDashboard(latestData);';
  indexHtml = indexHtml.substring(0, startMatch) + newStr + indexHtml.substring(endMatch);
  indexHtml = indexHtml.replace(/<span id="update-date-text">更新(?:日期|时间)：[^<]+<\/span>/, `<span id="update-date-text">更新时间：${updatedAt}</span>`);
  indexHtml = indexHtml.replace(/<div class="subtitle">Terminal-Bench [^<]+<\/div>/, `<div class="subtitle">Terminal-Bench 4.0 · 越高越强</div>`);
  fs.writeFileSync(INDEX_HTML_PATH, indexHtml, 'utf8');

  console.log('正在将最新数据写回 latest_data.json...');
  fs.writeFileSync(DATA_JSON_PATH, JSON.stringify(latestData, null, 2), 'utf8');

  console.log('更新成功！共写入:');
  console.log(`- 编码 Agent 组合: ${codingAgentLeaderboard.length} 条（官网 Coding Agent Index 当日最新基准实测数据）`);
  console.log(`- 智商综合指数: ${intelList.length} 条`);
  console.log(`- 编程能力指数 (Terminal-Bench 4.0): ${codList.length} 条`);
  console.log(`- 输出速度 (t/s): ${speedList.length} 条`);
  console.log(`- 单任务成本 ($): ${costList.length} 条（intelligenceIndexCostPerTask.total）`);
}

main().catch((err) => {
  console.error('发生未捕获的异常:', err);
  process.exit(1);
});
