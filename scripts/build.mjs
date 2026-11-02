// 生成主页用的 SVG,每样一亮一暗两份,写到 out/:node scripts/build.mjs
// 头图里的贡献图要读 GitHub 的贡献日历:Actions 里用 GITHUB_TOKEN,本地用 gh 的登录
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'out')
const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'yophon'
const W = 1000 // 所有图同宽,铺满 README 后字号一致

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif`
const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`

// 跟 GitHub 自己的前景、边框色走,图是透明底,贴在页面上没有框
const THEMES = {
  dark: {
    fg: '#f0f6fc', muted: '#9198a1', faint: '#656c76', line: '#3d444d', tile: '#1b2129',
    top: '#f0f6fc', left: '#b7bfc8', front: '#7d8590', edge: '#0d1117', edgeOpacity: 0.9,
  },
  light: {
    fg: '#1f2328', muted: '#59636e', faint: '#818b98', line: '#d1d9e0', tile: '#eef1f4',
    top: '#ffffff', left: '#dfe4ea', front: '#b4bec9', edge: '#1f2328', edgeOpacity: 0.34,
  },
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const f1 = (n) => n.toFixed(1)

/** 估算文字宽度:CJK 按 1em,其余按 em 倍数 */
function textWidth(s, size, ascii = 0.6) {
  let w = 0
  for (const ch of s) w += /[⺀-鿿＀-￯]/.test(ch) ? size : size * ascii
  return w
}

function write(name, svg) {
  writeFileSync(join(OUT, name), svg.trim() + '\n')
  console.log('out/' + name)
}

async function calendar() {
  const token = process.env.GITHUB_TOKEN || execFileSync('gh', ['auth', 'token']).toString().trim()
  const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
    totalContributions weeks { contributionDays { date contributionCount weekday } } } } } }`
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'yophon-profile' },
    body: JSON.stringify({ query, variables: { login: LOGIN } }),
  })
  const body = await res.json()
  if (!res.ok || body.errors) throw new Error(`贡献日历读不到:${res.status} ${JSON.stringify(body.errors ?? body)}`)
  return body.data.user.contributionsCollection.contributionCalendar
}

// ---------- 头图:名字 + 一年的贡献,做成单色的建筑白模 ----------

const YAW = (-12 * Math.PI) / 180
const PITCH = (30 * Math.PI) / 180
const CELL = 16
const BOX = 12
const TALL = 96 // 最忙那天的柱高

/** 地面坐标 (x 沿周、z 沿星期、y 向上) 投到屏幕 */
function project(x, y, z) {
  const xr = x * Math.cos(YAW) - z * Math.sin(YAW)
  const zr = x * Math.sin(YAW) + z * Math.cos(YAW)
  return { x: xr, y: zr * Math.sin(PITCH) - y * Math.cos(PITCH), depth: zr }
}

function blocks(cal) {
  const days = cal.weeks.flatMap((w, wi) => w.contributionDays.map((d) => ({ ...d, wi })))
  const max = Math.max(1, ...days.map((d) => d.contributionCount))
  return days.map((d) => {
    const x = d.wi * CELL
    const z = d.weekday * CELL
    const h = d.contributionCount ? Math.max(4, TALL * Math.sqrt(d.contributionCount / max)) : 0
    const p = (dx, dy, dz) => project(x + dx, dy, z + dz)
    return {
      ...d,
      h,
      depth: p(BOX / 2, 0, BOX / 2).depth,
      top: [p(0, h, 0), p(BOX, h, 0), p(BOX, h, BOX), p(0, h, BOX)],
      front: [p(0, 0, BOX), p(BOX, 0, BOX), p(BOX, h, BOX), p(0, h, BOX)],
      left: [p(0, 0, 0), p(0, 0, BOX), p(0, h, BOX), p(0, h, 0)],
    }
  })
}

function hero(cal, t) {
  const all = blocks(cal).sort((a, b) => a.depth - b.depth)
  const pts = all.flatMap((b) => [...b.top, ...b.front, ...b.left])
  const minX = Math.min(...pts.map((p) => p.x))
  const maxX = Math.max(...pts.map((p) => p.x))
  const minY = Math.min(...pts.map((p) => p.y))
  const maxY = Math.max(...pts.map((p) => p.y))
  // 贡献图靠右下,左上留给名字
  const ox = W - maxX
  const oy = 64 - minY
  const H = Math.ceil(maxY + oy + 56)
  const poly = (ps) => ps.map((p) => `${f1(p.x + ox)},${f1(p.y + oy)}`).join(' ')
  const weeks = cal.weeks.length

  const tiles = all.filter((b) => !b.h).map((b) => `<polygon points="${poly(b.top)}"/>`).join('')
  const bars = all
    .filter((b) => b.h)
    .map(
      (b) => `<g class="b" style="animation-delay:${(0.2 + (b.wi / weeks) * 1.1).toFixed(2)}s">` +
        `<polygon points="${poly(b.left)}" fill="${t.left}"/>` +
        `<polygon points="${poly(b.front)}" fill="${t.front}"/>` +
        `<polygon points="${poly(b.top)}" fill="${t.top}"/></g>`,
    )
    .join('')

  // 前沿(星期六那一排)标月份
  const front = project(0, 0, 7 * CELL + 6)
  const slope = (Math.atan2(project(CELL, 0, 0).y - project(0, 0, 0).y, project(CELL, 0, 0).x - project(0, 0, 0).x) * 180) / Math.PI
  let lastMonth = ''
  const months = cal.weeks
    .map((w, wi) => {
      const m = w.contributionDays[0].date.slice(5, 7)
      if (m === lastMonth || wi === 0) return ((lastMonth = m), '')
      lastMonth = m
      const p = project(wi * CELL, 0, 7 * CELL + 10)
      return `<text x="${f1(p.x + ox)}" y="${f1(p.y + oy + 12)}" transform="rotate(${slope.toFixed(2)} ${f1(p.x + ox)} ${f1(p.y + oy + 12)})">${m === '01' ? w.contributionDays[0].date.slice(0, 4) : m}</text>`
    })
    .join('')

  const total = cal.totalContributions.toLocaleString('en-US')
  const css = [
    `.sans { font-family: ${SANS} } .mono { font-family: ${MONO} }`,
    `.b { transform-box: fill-box; transform-origin: 50% 100%; animation: rise 1s cubic-bezier(.2,.8,.2,1) both }`,
    `@keyframes rise { from { transform: scaleY(0) } }`,
    `@media (prefers-reduced-motion: reduce) { .b { animation: none } }`,
  ].join('\n')

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="yophon：做 agent 内核，也拿它做自己天天在用的东西。过去一年 ${total} 次贡献">
  <style>${css}</style>
  <text x="-4" y="88" class="sans" font-size="80" font-weight="600" letter-spacing="-3.2" fill="${t.fg}">yophon</text>
  <text x="0" y="134" class="sans" font-size="19" fill="${t.muted}">做 agent 内核，也拿它做自己天天在用的东西。</text>
  <g fill="${t.tile}">${tiles}</g>
  <g stroke="${t.edge}" stroke-opacity="${t.edgeOpacity}" stroke-width="0.6" stroke-linejoin="round">${bars}</g>
  <g class="mono" font-size="10" fill="${t.faint}">${months}</g>
  <text x="0" y="${H - 8}" class="mono" font-size="13" fill="${t.muted}">${total}<tspan fill="${t.faint}"> 次贡献 · 过去一年</tspan></text>
</svg>`
}

// ---------- 项目:一行一个,整行是链接 ----------

const PROJECTS = [
  { file: 'tau', name: 'tau', desc: '不挑运行环境的 coding agent 内核', stack: 'TypeScript', link: true },
  { file: 'gopan', name: 'gopan', desc: '自托管网盘，内置 tau 助手', stack: 'Go · Vue · Kotlin', link: false },
  { file: 'chewingdocs', name: 'chewingdocs', desc: '按主题整理的工程知识库', stack: 'VitePress', link: true },
  { file: 'yo-agent', name: 'yo-agent', desc: 'tau 之前的那一版 agent runtime', stack: 'TypeScript', link: true },
  { file: 'remote-mouse', name: 'remote-mouse', desc: '把手机变成 Mac 的触控板和键盘', stack: 'Flutter · Swift', link: true },
  { file: 'yophon-board', name: 'yophon-board', desc: '多人实时白板', stack: 'Bun · WebSocket', link: true },
]

// 每张图在 README 里各占一段,段与段之间还有约 26 个单位的空隙(16px 段距 + 行内图片的基线余量),
// 所以线画在行底,字放在「上一条线到这条线」的正中
const ROW_H = 60

function row(p, i, t) {
  const y = 25
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${ROW_H}" viewBox="0 0 ${W} ${ROW_H}" role="img" aria-label="${esc(p.name)}：${esc(p.desc)}">
  <style>.sans { font-family: ${SANS} } .mono { font-family: ${MONO} }</style>
  <rect y="${ROW_H - 1}" width="${W}" height="1" fill="${t.line}"/>
  <text x="0" y="${y}" class="mono" font-size="13" fill="${t.faint}">${String(i + 1).padStart(2, '0')}</text>
  <text x="44" y="${y}" class="sans" font-size="21" font-weight="600" fill="${t.fg}">${esc(p.name)}</text>
  <text x="260" y="${y}" class="sans" font-size="17" fill="${t.muted}">${esc(p.desc)}</text>
  <text x="${p.link ? W - 36 : W}" y="${y}" text-anchor="end" class="mono" font-size="13" fill="${t.faint}">${esc(p.stack)}</text>
  ${p.link ? `<text x="${W}" y="${y}" text-anchor="end" class="sans" font-size="16" fill="${t.muted}">↗</text>` : ''}
</svg>`
}

// ---------- 底部链接 ----------

const LINKS = [
  { file: 'link-studio', label: '979687.xyz', note: '三维工作室' },
  { file: 'link-blog', label: 'blog', note: '博客' },
  { file: 'link-board', label: 'board', note: '白板' },
]
const LINK_H = 32

function linkWidth(l) {
  return Math.round(textWidth(l.label, 13) + 8 + textWidth(l.note, 13) + 8 + 13 + 28)
}

function link(l, t) {
  const lw = textWidth(l.label, 13)
  const w = linkWidth(l)
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${LINK_H}" viewBox="0 0 ${w} ${LINK_H}" role="img" aria-label="${esc(l.note)} ${esc(l.label)}">
  <style>.sans { font-family: ${SANS} } .mono { font-family: ${MONO} }</style>
  <text x="0" y="21" class="mono" font-size="13" fill="${t.fg}">${esc(l.label)}</text>
  <text x="${f1(lw + 8)}" y="21" class="sans" font-size="13" fill="${t.faint}">${esc(l.note)}</text>
  <text x="${f1(w - 28)}" y="21" text-anchor="end" class="sans" font-size="13" fill="${t.muted}">↗</text>
</svg>`
}

const cal = await calendar()
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
for (const [mode, t] of Object.entries(THEMES)) {
  write(`hero-${mode}.svg`, hero(cal, t))
  PROJECTS.forEach((p, i) => write(`row-${p.file}-${mode}.svg`, row(p, i, t)))
  for (const l of LINKS) write(`${l.file}-${mode}.svg`, link(l, t))
}
// README 里按图宽排底部链接,宽度给出来方便对照
console.log('link widths (% of 1000):', LINKS.map((l) => `${l.file}=${(linkWidth(l) / 10).toFixed(1)}%`).join(' '))
