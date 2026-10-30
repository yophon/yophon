// 生成主页用的 SVG(头图、项目卡片、链接按钮),每样一亮一暗两份:node scripts/build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')
mkdirSync(OUT, { recursive: true })

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif`
const MONO = `ui-monospace, SFMono-Regular, 'JetBrains Mono', Menlo, Consolas, 'Liberation Mono', monospace`

const THEMES = {
  dark: {
    bg0: '#070b14', bg1: '#0f172a', card0: '#0d1321', card1: '#111a2c', border: 'rgba(148,163,184,0.18)',
    text: '#e2e8f0', muted: '#94a3b8', faint: 'rgba(148,163,184,0.08)', glow: 0.32, nameFrom: '#c4b5fd', nameTo: '#67e8f9', prompt: '#67e8f9',
  },
  light: {
    bg0: '#f8fafc', bg1: '#eef2ff', card0: '#ffffff', card1: '#f8fafc', border: '#e2e8f0',
    text: '#0f172a', muted: '#475569', faint: 'rgba(71,85,105,0.08)', glow: 0.16, nameFrom: '#7c3aed', nameTo: '#0891b2', prompt: '#0891b2',
  },
}

// 终端在两种主题下都是深色
const TERM = { bg: '#0b1220', bar: '#111a2e', text: '#e2e8f0', muted: '#64748b', ok: '#4ade80', tool: '#a78bfa', prompt: '#67e8f9' }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 估算文字宽度:CJK 和全角符号按 1em,其余按 em 倍数 */
function textWidth(s, size, ascii = 0.6) {
  let w = 0
  for (const ch of s) w += /[⺀-￿]/.test(ch) && !/[✓●❯→↗★]/.test(ch) ? size : size * ascii
  return w
}

function write(name, svg) {
  writeFileSync(join(OUT, name), svg.trim() + '\n')
  console.log('assets/' + name)
}

/** 等轴测小方块:顶、左、右三个面 */
function cube(cx, cy, s, [top, left, right]) {
  const h = s * 0.866
  const p = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return [
    `<polygon points="${p([[cx, cy - s], [cx + h, cy - s / 2], [cx, cy], [cx - h, cy - s / 2]])}" fill="${top}"/>`,
    `<polygon points="${p([[cx - h, cy - s / 2], [cx, cy], [cx, cy + s], [cx - h, cy + s / 2]])}" fill="${left}"/>`,
    `<polygon points="${p([[cx, cy], [cx + h, cy - s / 2], [cx + h, cy + s / 2], [cx, cy + s]])}" fill="${right}"/>`,
  ].join('')
}

// ---------- 头图 ----------

const CYCLE = 14 // 秒
const pct = (sec) => ((sec / CYCLE) * 100).toFixed(2) + '%'

function appear(name, at) {
  return `@keyframes ${name} { 0%, ${pct(at)} { opacity: 0 } ${pct(at + 0.15)}, 91% { opacity: 1 } 95%, 100% { opacity: 0 } }`
}

function hero(t) {
  const W = 1200
  const H = 400
  const tx = 624 // 终端里文字的起点
  const prompt = '把上个月的发票整理到 /报销'
  const typed = textWidth(prompt, 15) + 12
  const lines = [
    { y: 168, tool: 'search_files', arg: '发票 2026-09', tail: '12 项', tailColor: TERM.muted, at: 2.6 },
    { y: 202, tool: 'move_nodes', arg: '→ /报销/2026-09', tail: '✓', tailColor: TERM.ok, at: 3.5 },
    { y: 236, tool: 'memory_write', arg: '报销单按月分文件夹', tail: '✓', tailColor: TERM.ok, at: 4.4 },
  ]
  const css = [
    `.sans { font-family: ${SANS} } .mono { font-family: ${MONO} }`,
    `@keyframes type { 0%, ${pct(0.5)} { transform: translateX(0); animation-timing-function: steps(${[...prompt].length}, end) } ${pct(2.1)}, 96% { transform: translateX(${typed.toFixed(0)}px) } 97%, 100% { transform: translateX(0) } }`,
    `@keyframes fade { 0%, 91% { opacity: 1 } 95%, 100% { opacity: 0 } }`,
    ...lines.map((l, i) => appear(`l${i}`, l.at)),
    appear('done', 5.5),
    appear('next', 6.3),
    `@keyframes blink { 50% { opacity: 0 } }`,
    `@keyframes float { from { transform: translateY(0) } to { transform: translateY(-10px) } }`,
    // 没有动画时遮罩停在字后面的空白处,字照样看得见
    `.cover { transform: translateX(${typed.toFixed(0)}px); animation: type ${CYCLE}s linear infinite } .first { animation: fade ${CYCLE}s linear infinite }`,
    ...lines.map((_, i) => `.l${i} { animation: l${i} ${CYCLE}s linear infinite }`),
    `.done { animation: done ${CYCLE}s linear infinite } .next { animation: next ${CYCLE}s linear infinite }`,
    `.cursor { animation: blink 1s steps(1) infinite }`,
    `.f0 { animation: float 4s ease-in-out infinite alternate } .f1 { animation: float 5s ease-in-out -2s infinite alternate } .f2 { animation: float 6s ease-in-out -1s infinite alternate }`,
    `@media (prefers-reduced-motion: reduce) { * { animation: none !important } }`,
  ].join('\n')

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="yophon：做 agent 内核，也拿它做自己天天在用的东西">
  <style>${css}</style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg0}"/><stop offset="1" stop-color="${t.bg1}"/></linearGradient>
    <radialGradient id="g1"><stop offset="0" stop-color="#8b5cf6" stop-opacity="${t.glow}"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2"><stop offset="0" stop-color="#06b6d4" stop-opacity="${t.glow * 0.8}"/><stop offset="1" stop-color="#06b6d4" stop-opacity="0"/></radialGradient>
    <linearGradient id="name" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.nameFrom}"/><stop offset="1" stop-color="${t.nameTo}"/></linearGradient>
    <pattern id="iso" width="34.64" height="20" patternUnits="userSpaceOnUse"><path d="M0 0L34.64 20M0 20L34.64 0" stroke="${t.faint}" stroke-width="1"/></pattern>
    <radialGradient id="fadeMask"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
    <mask id="gridMask"><rect width="${W}" height="${H}" fill="url(#fadeMask)"/></mask>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#iso)" mask="url(#gridMask)"/>
    <circle cx="180" cy="20" r="440" fill="url(#g1)"/>
    <circle cx="1120" cy="420" r="400" fill="url(#g2)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="20" fill="none" stroke="${t.border}"/>

  <text x="72" y="116" class="mono" font-size="16" fill="${t.prompt}">~/yophon <tspan fill="${t.muted}">❯ whoami</tspan></text>
  <text x="68" y="200" class="sans" font-size="92" font-weight="800" letter-spacing="-3" fill="url(#name)">yophon</text>
  <text x="72" y="254" class="sans" font-size="24" font-weight="600" fill="${t.text}">做 agent 内核，</text>
  <text x="72" y="290" class="sans" font-size="24" font-weight="600" fill="${t.text}">也拿它做自己天天在用的东西。</text>
  <text x="72" y="340" class="mono" font-size="14" fill="${t.muted}">tau · gopan · chewingdocs · 979687.xyz</text>

  <g class="f0">${cube(566, 92, 26, ['#c4b5fd', '#8b5cf6', '#6d28d9'])}</g>
  <g class="f1">${cube(1160, 330, 20, ['#a5f3fc', '#22d3ee', '#0e7490'])}</g>
  <g class="f2">${cube(548, 322, 13, ['#fbcfe8', '#f472b6', '#be185d'])}</g>

  <rect x="600" y="64" width="540" height="276" rx="14" fill="${TERM.bg}" stroke="rgba(148,163,184,0.22)"/>
  <path d="M600 78a14 14 0 0 1 14-14h512a14 14 0 0 1 14 14v22H600z" fill="${TERM.bar}"/>
  <circle cx="622" cy="82" r="6" fill="#ff5f57"/><circle cx="642" cy="82" r="6" fill="#febc2e"/><circle cx="662" cy="82" r="6" fill="#28c840"/>
  <text x="870" y="87" text-anchor="middle" class="mono" font-size="13" fill="${TERM.muted}">gopan 助手 · tau</text>

  <g class="first">
    <text x="${tx}" y="134" class="mono" font-size="15" fill="${TERM.prompt}">❯</text>
    <text x="${tx + 20}" y="134" class="sans" font-size="15" fill="${TERM.text}">${esc(prompt)}</text>
    <rect class="cover" x="${tx + 18}" y="114" width="${typed.toFixed(0)}" height="28" fill="${TERM.bg}"/>
  </g>
  ${lines
    .map(
      (l, i) => `<g class="l${i}">
    <text x="${tx + 4}" y="${l.y}" class="mono" font-size="13" fill="${TERM.tool}">●</text>
    <text x="${tx + 24}" y="${l.y}" class="mono" font-size="14" fill="${TERM.tool}">${esc(l.tool)}</text>
    <text x="${tx + 168}" y="${l.y}" class="sans" font-size="14" fill="${TERM.text}">${esc(l.arg)}</text>
    <text x="1112" y="${l.y}" text-anchor="end" class="sans" font-size="14" fill="${l.tailColor}">${esc(l.tail)}</text>
  </g>`,
    )
    .join('\n  ')}
  <g class="done"><text x="${tx}" y="280" class="sans" font-size="15" fill="${TERM.text}">整理好了：12 张发票在 <tspan fill="${TERM.prompt}">/报销/2026-09</tspan></text></g>
  <g class="next">
    <text x="${tx}" y="316" class="mono" font-size="15" fill="${TERM.prompt}">❯</text>
    <rect class="cursor" x="${tx + 20}" y="302" width="9" height="18" fill="${TERM.text}"/>
  </g>
</svg>`
}

// ---------- 项目卡片 ----------

const ICONS = {
  tau: (c) => `<text x="0" y="0" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-size="28" font-style="italic" font-weight="700" fill="${c}">τ</text>`,
  cloud: (c) => `<path transform="translate(-12 -12)" d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.1 4.5 4.5 0 0 0 7 18z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`,
  book: (c) => `<path transform="translate(-12 -12)" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 5.5v15M8 7h8M8 11h6" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  loop: (c) => `<path transform="translate(-12 -12)" d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  cursor: (c) => `<path transform="translate(-12 -12)" d="M5 3l14 7.5-6.2 1.8L10.5 19z" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`,
  pen: (c) => `<path transform="translate(-12 -12)" d="M4 20l1-4.5L16 4.5 19.5 8 8.5 19zM14 7l3 3M3 21h18" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
}

const PROJECTS = [
  {
    file: 'tau', name: 'tau', tag: 'TypeScript', icon: 'tau', accent: ['#a78bfa', '#7c3aed'],
    lines: ['不挑运行环境的 coding agent 内核', '纯 ECMAScript，能力全由插件提供'],
    chips: ['agent loop', 'MCP', 'BYOK', '终端 / 浏览器 / App'],
  },
  {
    file: 'gopan', name: 'gopan', tag: '自用 · 未公开', icon: 'cloud', accent: ['#60a5fa', '#2563eb'],
    lines: ['自托管网盘：网页、安卓、Windows 桌面端', '内置 tau 助手，也能当 Remote MCP'],
    chips: ['Go', 'Vue', 'Kotlin', 'Tauri'],
  },
  {
    file: 'chewingdocs', name: 'chewingdocs', tag: '在线阅读', icon: 'book', accent: ['#fbbf24', '#d97706'],
    lines: ['按主题整理的工程知识库', '先建心智模型，再讲工具、架构与排障'],
    chips: ['VitePress', 'AI', 'Infra', '系统设计'],
  },
  {
    file: 'yo-agent', name: 'yo-agent', tag: 'TypeScript', icon: 'loop', accent: ['#f472b6', '#db2777'],
    lines: ['tau 之前的那一版通用 Agent Runtime', '终端、RPC、MCP、ACP、浏览器同一内核'],
    chips: ['CLI', 'RPC', 'MCP', 'ACP'],
  },
  {
    file: 'remote-mouse', name: 'remote-mouse', tag: 'Flutter', icon: 'cursor', accent: ['#22d3ee', '#0891b2'],
    lines: ['把手机变成 Mac 的无线触控板和键盘', 'UDP + WebSocket，Bonjour 自动发现'],
    chips: ['Flutter', 'Swift', 'macOS'],
  },
  {
    file: 'yophon-board', name: 'yophon-board', tag: 'TypeScript', icon: 'pen', accent: ['#4ade80', '#16a34a'],
    lines: ['实时白板：多页、无限画布', 'HTTP 写入，WebSocket 同步到每个人'],
    chips: ['Bun', 'WebSocket', 'SQLite'],
  },
]

function card(p, t, mode) {
  const W = 420
  const H = 200
  const a = mode === 'dark' ? p.accent[0] : p.accent[1]
  const tagW = textWidth(p.tag, 12) + 20
  let x = 28
  const chips = p.chips
    .map((c) => {
      const w = textWidth(c, 12) + 20
      const s = `<rect x="${x}" y="150" width="${w.toFixed(0)}" height="24" rx="12" fill="${a}" fill-opacity="${mode === 'dark' ? 0.12 : 0.1}" stroke="${a}" stroke-opacity="0.35"/><text x="${(x + w / 2).toFixed(1)}" y="166" text-anchor="middle" class="mono" font-size="12" fill="${a}">${esc(c)}</text>`
      x += w + 8
      return s
    })
    .join('')
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(p.name)}：${esc(p.lines.join(''))}">
  <style>.sans { font-family: ${SANS} } .mono { font-family: ${MONO} }</style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.card0}"/><stop offset="1" stop-color="${t.card1}"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="${a}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></radialGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset="0.5" stop-color="${a}"/><stop offset="1" stop-color="${a}" stop-opacity="0"/></linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}" rx="16"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <circle cx="${W - 30}" cy="10" r="190" fill="url(#glow)"/>
    <rect x="40" y="0" width="${W - 80}" height="2" fill="url(#edge)"/>
  </g>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${t.border}"/>
  <rect x="28" y="28" width="44" height="44" rx="12" fill="${a}" fill-opacity="${mode === 'dark' ? 0.14 : 0.1}" stroke="${a}" stroke-opacity="0.4"/>
  <g transform="translate(50 50)">${ICONS[p.icon](a)}</g>
  <text x="88" y="58" class="mono" font-size="22" font-weight="700" fill="${t.text}">${esc(p.name)}</text>
  <rect x="${(W - 28 - tagW).toFixed(0)}" y="36" width="${tagW.toFixed(0)}" height="24" rx="12" fill="none" stroke="${t.border}"/>
  <text x="${(W - 28 - tagW / 2).toFixed(1)}" y="52" text-anchor="middle" class="sans" font-size="12" fill="${t.muted}">${esc(p.tag)}</text>
  <text x="28" y="106" class="sans" font-size="15" fill="${t.text}">${esc(p.lines[0])}</text>
  <text x="28" y="130" class="sans" font-size="15" fill="${t.muted}">${esc(p.lines[1])}</text>
  ${chips}
</svg>`
}

// ---------- 链接按钮 ----------

const LINKS = [
  { file: 'link-studio', label: '979687.xyz', note: '三维工作室' },
  { file: 'link-blog', label: 'blog', note: '博客' },
  { file: 'link-board', label: 'board', note: '白板' },
]

function link(l, t, mode) {
  const a = mode === 'dark' ? '#67e8f9' : '#0891b2'
  const lw = textWidth(l.label, 15)
  const nw = textWidth(l.note, 13)
  const W = Math.round(24 + lw + 10 + nw + 12 + 14 + 22)
  const H = 44
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(l.note)} ${esc(l.label)}">
  <style>.sans { font-family: ${SANS} } .mono { font-family: ${MONO} }</style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="22" fill="${t.card0}" stroke="${t.border}"/>
  <text x="24" y="27" class="mono" font-size="15" font-weight="600" fill="${a}">${esc(l.label)}</text>
  <text x="${(24 + lw + 10).toFixed(1)}" y="27" class="sans" font-size="13" fill="${t.muted}">${esc(l.note)}</text>
  <text x="${W - 22}" y="27" text-anchor="end" class="mono" font-size="14" fill="${t.muted}">↗</text>
</svg>`
}

for (const [mode, t] of Object.entries(THEMES)) {
  write(`hero-${mode}.svg`, hero(t))
  for (const p of PROJECTS) write(`card-${p.file}-${mode}.svg`, card(p, t, mode))
  for (const l of LINKS) write(`${l.file}-${mode}.svg`, link(l, t, mode))
}
