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
  const a = String(agentName || '').toLowerCase();
  if (a.includes('claude code')) return 'Claude Code';
  if (a.includes('codex')) return 'Codex Agent CLI';
  if (a.includes('cursor')) return 'Cursor Agent';
  if (a.includes('kimi code')) return 'Kimi Code CLI';
  if (a.includes('opencode')) return 'OpenCode';
  if (a.includes('gemini cli')) return 'Gemini CLI';
  if (a.includes('antigravity')) return 'Antigravity';
  if (a.includes('devin') || a.includes('fusion')) return 'Devin Fusion';
  if (a.includes('muse')) return 'Muse Code';
  return null;
}

function isIgnoredModel(name) {
  const n = String(name || '').toLowerCase();

  // 1. 绝对黑名单与非思考模型 (Non-reasoning)
  if (
    n.includes('non-reasoning') ||
    n.includes('non reasoning') ||
    n.includes('nonreasoning') ||
    n.includes('nemotron') ||
    n.includes('gpt-oss') ||
    n.includes('grok') ||
    n.includes('groq') ||
    n.startsWith('o3') ||
    n.includes('composer') ||
    n.includes('mistral') ||
    n.includes('ministral') ||
    n.includes('magistral') ||
    n.includes('solar') ||
    n.includes('step') ||
    n.includes('celeris') ||
    n.includes('inkling') ||
    n.includes('quasar')
  ) {
    return true;
  }

  // 2. Claude 系列 (>= 4.6，动态兼容 5.x, 6.x 等更新版本)
  if (n.includes('claude') || n.includes('sonnet') || n.includes('opus') || n.includes('fable')) {
    if (n.includes('haiku')) return true;
    const vMatch = n.match(/(?:claude|sonnet|opus|fable)\s*([0-9]+(?:\.[0-9]+)?)/) ||
                   n.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:sonnet|opus|fable|claude)/);
    if (vMatch) {
      const ver = parseFloat(vMatch[1]);
      if (ver >= 4.6) return false;
      return true;
    }
    if (n.includes('fable') || n.includes('opus') || n.includes('sonnet')) {
      const numMatch = n.match(/([0-9]+\.[0-9]+)/);
      if (numMatch && parseFloat(numMatch[1]) < 4.6) return true;
      return false;
    }
    return true;
  }

  // 3. GPT 系列 (> 5.6，即 >= 5.7，动态兼容 GPT-6, GPT-6.x 等更新版本，全局排除 <= 5.6)
  if (n.includes('gpt') || /\b(sol|terra|luna|astra)\b/.test(n)) {
    if (n.includes('instant')) return true;
    const vMatch = n.match(/gpt-?([0-9]+(?:\.[0-9]+)?)/);
    if (vMatch) {
      const ver = parseFloat(vMatch[1]);
      return ver <= 5.6; // 排除 5.6 及以下
    }
    const anyNumMatch = n.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (anyNumMatch) {
      const ver = parseFloat(anyNumMatch[1]);
      return ver <= 5.6;
    }
    return true;
  }

  // 4. Gemini 系列 (>= 3.1，动态兼容 3.8, 4.x 等更新版本)
  if (n.includes('gemini')) {
    const vMatch = n.match(/gemini\s*([0-9]+(?:\.[0-9]+)?)/);
    if (vMatch) {
      const ver = parseFloat(vMatch[1]);
      if (ver >= 3.1) return false;
      return true;
    }
    return true;
  }

  // 5. 国内主流模型 (动态兼容更高版本)
  // Kimi 系列 (>= K3)
  if (n.includes('kimi')) {
    const kMatch = n.match(/k([0-9]+(?:\.[0-9]+)?)/);
    if (kMatch) {
      return parseFloat(kMatch[1]) < 3;
    }
    return true;
  }

  // DeepSeek 系列 (>= V4.1，动态兼容 V4.2, V5 等更高版本)
  if (n.includes('deepseek')) {
    const dMatch = n.match(/v([0-9]+(?:[\.-][0-9]+)?)/);
    if (dMatch) {
      const ver = parseFloat(dMatch[1].replace('-', '.'));
      if (ver >= 4.1) return false;
      return true;
    }
    return true;
  }

  // GLM 系列 (>= 5.2)
  if (n.includes('glm')) {
    const gMatch = n.match(/glm-?([0-9]+(?:\.[0-9]+)?)/);
    if (gMatch) {
      if (parseFloat(gMatch[1]) >= 5.2) return false;
      return true;
    }
    return true;
  }

  // MiniMax 系列 (>= M3)
  if (n.includes('minimax')) {
    const mMatch = n.match(/m([0-9]+(?:\.[0-9]+)?)/);
    if (mMatch) {
      if (parseFloat(mMatch[1]) >= 3) return false;
      return true;
    }
    return true;
  }

  // Qwen 系列 (>= 3.8，动态兼容 3.8, 3.9, 4.x 等更高版本)
  if (n.includes('qwen')) {
    const qMatch = n.match(/qwen\s*([0-9]+(?:\.[0-9]+)?)/) || n.match(/qwen-?([0-9]+(?:\.[0-9]+)?)/);
    if (qMatch) {
      return parseFloat(qMatch[1]) < 3.8;
    }
    return true;
  }

  // MiMo 系列 (>= V2.6 及 Flash 系列全系)
  if (n.includes('mimo')) {
    if (n.includes('flash')) return false;
    const mMatch = n.match(/mimo[^\d]*([0-9]+(?:[\.-][0-9]+)?)/);
    if (mMatch) {
      const ver = parseFloat(mMatch[1].replace('-', '.'));
      return ver < 2.6;
    }
    return true;
  }

  // 6. Meta (Muse 系列)
  if (n.includes('muse')) {
    return false;
  }

  return true;
}

function isAllowedAgentModel(model) {
  return !isIgnoredModel(model);
}

function getBrand(model) {
  const n = String(model || '').toLowerCase();
  if (n.includes('kimi') || n.includes('glm') || n.includes('deepseek') || n.includes('minimax') || n.includes('qwen') || n.includes('mimo')) return 'cn';
  if (n.includes('gemini')) return 'gemini';
  if (n.includes('gpt') || n.includes('sol') || n.includes('terra') || n.includes('luna') || n.includes('astra')) return 'gpt';
  if (n.includes('claude') || n.includes('opus') || n.includes('fable') || n.includes('sonnet')) return 'claude';
  if (n.includes('muse')) return 'muse';
  return 'cn';
}

function parseModelsPage(html) {
  const key = '\\"models\\":[';
  let pos1 = html.indexOf(key);
  let pos2 = html.indexOf(key, pos1 + 10);

  function parseArray(startPos) {
    if (startPos < 0) return [];
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
    if (arrayEnd === -1) return [];
    const rawStr = html.substring(startPos, arrayEnd + 1);
    try {
      return JSON.parse(rawStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    } catch (e) {
      console.error('解析 RSC 数组异常:', e.message);
      return [];
    }
  }

  const infoList = parseArray(pos1 > -1 ? html.indexOf('[', pos1) : -1);
  const metricsList = parseArray(pos2 > -1 ? html.indexOf('[', pos2) : -1);

  const infoMap = new Map();
  infoList.forEach(m => infoMap.set(m.slug, m));

  const intelList = [];
  const codList = [];
  const speedList = [];
  const costList = [];
  const seenModels = new Set();

  metricsList.forEach(m => {
    const info = infoMap.get(m.slug);
    const fullName = info ? info.name : m.shortName;
    const cleanFullName = (fullName || '').replace(/\s*\(based on [^)]+\)/i, '');

    // 白名单过滤
    if (isIgnoredModel(cleanFullName) && isIgnoredModel(m.shortName)) return;

    // 模型规范名称：优先使用 shortName，如果未带 effort 且官方元数据有 effort，则补充以方便按组分类
    let displayName = m.shortName || fullName;
    if (!displayName.includes('(') && info?.effort?.label && info.effort.label !== 'undefined') {
      displayName = `${displayName} (${info.effort.label})`;
    }

    if (isIgnoredModel(displayName)) return;

    if (seenModels.has(displayName)) return;
    seenModels.add(displayName);

    // 1. 智商综合指数
    if (typeof m.intelligenceIndex === 'number') {
      intelList.push({ model: displayName, score: m.intelligenceIndex });
    }

    // 2. 编程能力指数 (官方最新高难评测 Terminal-Bench 4.0 百分制实测数据，如 0.596 -> 59.6)
    const terminalScore = typeof m.terminalBench40 === 'number' ? m.terminalBench40 : (typeof m.terminalbenchV40 === 'number' ? m.terminalbenchV40 : null);
    if (typeof terminalScore === 'number') {
      codList.push({ model: displayName, coding_score: terminalScore * 100 });
    }

    // 3. 输出速度 (tps)
    if (typeof m.medianOutputTokensPerSecond === 'number') {
      speedList.push({ model: displayName, speed_tps: m.medianOutputTokensPerSecond });
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
    }
  });

  intelList.sort((a, b) => b.score - a.score);
  codList.sort((a, b) => b.coding_score - a.coding_score);
  speedList.sort((a, b) => b.speed_tps - a.speed_tps);
  costList.sort((a, b) => a.cost_usd - b.cost_usd);

  return { intelList, codList, speedList, costList };
}

function parseAgentsPage(html) {
  const text = html.replace(/\\"/g, '"');
  const liveEntries = [];
  const seen = new Set();

  const re =
    // 兼容官网在 id 与 agentName 之间插入新字段（如 isDefault/isHighlighted）：用惰性匹配代替直连
    /\{"id":"[a-f0-9]+",[\s\S]*?"agentName":"([^"]+)","provider":"[^"]+","hostModelSlug":"[^"]+","display":\{"agent":"([^"]+)","model":"([^"]+)"[\s\S]*?"indexScore":([0-9.eE+-]+)[\s\S]*?"mean":\{"reward":[0-9.eE+-]+,"costUsd":([0-9.eE+-]+),"agentWallTimeSec":([0-9.eE+-]+)/g;

  let m;
  while ((m = re.exec(text))) {
    const harness = normalizeHarness(m[2] || m[1]);
    const model = m[3];
    if (!harness || !isAllowedAgentModel(model)) continue;

    const key = `${harness}||${model}`;
    if (seen.has(key)) continue;
    seen.add(key);

    liveEntries.push({
      agent_harness: harness,
      model,
      solve_rate: parseFloat(m[4]) * 100,
      avg_time_min: parseFloat(m[6]) / 60,
      cost_usd: parseFloat(m[5]),
      brand: getBrand(model)
    });
  }

  // 严格使用官网最新基准评测实测数据，确保所有分数 100% 为当日最新评测标准，避免混入过期尺度引发倒挂
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
  const { intelList, codList, speedList, costList } = parseModelsPage(modelsHtml);

  console.log('正在解析编码 Agent RSC Payload...');
  const codingAgentLeaderboard = parseAgentsPage(agentsHtml);

  const today = new Date().toISOString().split('T')[0];
  const latestData = {
    updated_at: today,
    source: MODELS_URL,
    agents_source: AGENTS_URL,
    coding_agent_leaderboard: codingAgentLeaderboard,
    intelligence_index: intelList,
    coding_index: codList,
    speed_tokens_per_sec: speedList,
    cost_per_task_usd: costList,
    recent_updates: [
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
        title: '升级编程能力指数评测基准为官方最新高难评测 Terminal-Bench 4.0，全面展现最新旗舰大模型（GPT-6 Astra, Claude Opus 5.5 等）的断代代码能力与深层思考梯度，避免旧版 v2.1 饱和引发的档位微小方差倒挂',
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
        title: '编码 Agent 榜新增 Devin Fusion 框架支持，同步 Cognition 官方最新评测组合（Claude Fable 5.1 与 GPT-6 Astra）',
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
  indexHtml = indexHtml.replace(/<span id="update-date-text">更新日期：[^<]+<\/span>/, `<span id="update-date-text">更新日期：${today}</span>`);
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
