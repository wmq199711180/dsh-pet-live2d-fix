#!/usr/bin/env node
/**
 * 从会话日志里抽一句"我当时的念头"，推进桌宠的气泡。
 *
 * 用法：
 *   node tools/say.mjs --dry        # 只抽一句打印出来，不推送
 *   node tools/say.mjs              # 抽一句并 POST 到 /api/live2d-pet/say
 *   node tools/say.mjs --port 49429 # 指定端口（默认自动试几个）
 *
 * 为什么要自己解帧：会话日志是**多帧拼接**的 zstd，Node 的 zstdDecompress 只解第一帧。
 * 帧头魔数 0x28B52FFD，按它切段逐帧解。
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
const argOf = (name) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const dry = process.argv.includes('--dry')

function newestSessionLog(root) {
  let best = null
  const walk = (dir, depth) => {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (depth < 4) walk(full, depth + 1)
      } else if (entry.name === 'session.v4.jsonl.zstd') {
        const st = statSync(full)
        if (best === null || st.mtimeMs > best.mtimeMs) best = { path: full, mtimeMs: st.mtimeMs }
      }
    }
  }
  walk(root, 0)
  return best?.path ?? null
}

function reasoningTexts(file, framesToRead = 160) {
  const buf = readFileSync(file)
  const offsets = []
  let i = 0
  while ((i = buf.indexOf(MAGIC, i)) !== -1) { offsets.push(i); i += 4 }
  const texts = []
  const voiced = []
  const start = Math.max(0, offsets.length - framesToRead)
  for (let k = start; k < offsets.length; k += 1) {
    const end = k + 1 < offsets.length ? offsets[k + 1] : buf.length
    let chunk
    try { chunk = zstdDecompressSync(buf.subarray(offsets[k], end)).toString('utf8') } catch { continue }
    for (const line of chunk.split('\n')) {
      if (!line.includes('"reasoning"') && !line.includes('"text"')) continue
      let event
      try { event = JSON.parse(line) } catch { continue }
      if (event?.type !== 'assistant/message') continue
      for (const part of event?.data?.message?.content ?? []) {
        if (part?.type === 'reasoning' && typeof part.text === 'string' && part.text.trim() !== '') {
          texts.push(part.text)
        }
        if (part?.type === 'text' && typeof part.text === 'string') {
          // 我回复里用 *（…）* 写下的中文心声——比 reasoning 更适合直接说出口。
          for (const match of part.text.matchAll(/[*_]\s*（([^）]{4,40})）\s*[*_]/g)) {
            voiced.push(match[1].trim())
          }
        }
      }
    }
  }
  return { texts, voiced }
}

const CJK = /[\u4e00-\u9fff]/g
const usable = (line) => {
  if (line.length < 6 || line.length > 40) return false
  if (/[`{}<>\\]|https?:|\.(js|ts|json|mjs|md)\b/.test(line)) return false
  const cjk = (line.match(CJK) ?? []).length
  return cjk / line.length >= 0.6
}

function pickLine({ texts, voiced }) {
  // 第一优先：写出来的中文心声（去重、最近 60 条内随机，避开上次说过的那句）。
  const pool = [...new Set(voiced.filter(usable))].slice(-60)
  const lastPath = join(homedir(), '.dsh', 'pets', '.last-say.json')
  let last = ''
  try { last = JSON.parse(readFileSync(lastPath, 'utf8')).text ?? '' } catch { /* 第一次跑 */ }
  const fresh = pool.filter((line) => line !== last)
  const chosen = fresh.length > 0 ? fresh : pool
  if (chosen.length > 0) return chosen[Math.floor(Math.random() * chosen.length)]
  // 兜底：思考里偶尔出现的中文片段。
  const sentences = []
  for (const text of texts.slice(-3)) {
    for (const raw of text.split(/[。！？!?\n]+/)) {
      const line = raw.replace(/^[\s*（(]+|[\s*）)]+$/g, '').trim()
      if (usable(line)) sentences.push(line)
    }
  }
  if (sentences.length === 0) return null
  return sentences[Math.floor(Math.random() * sentences.length)]
}

async function findPort(explicit) {
  const candidates = explicit ? [explicit] : ['49429', '64751', '62953', '3080']
  for (const port of candidates) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/live2d-pet/catalog`, { signal: AbortSignal.timeout(800) })
      if (response.ok) return port
    } catch { /* try next */ }
  }
  return null
}

const log = newestSessionLog(join(homedir(), '.dsh', 'sessions'))
if (log === null) { console.error('找不到会话日志'); process.exit(1) }
const sources = reasoningTexts(log)
if (sources.texts.length === 0 && sources.voiced.length === 0) {
  console.error('最近没有可用的心声')
  process.exit(2)
}
const line = pickLine(sources)
if (line === null) { console.error('没抽到合格的句子'); process.exit(3) }
console.log(line)
if (dry) process.exit(0)

const port = await findPort(argOf('--port'))
if (port === null) { console.error('找不到 DSH 端口（用 --port 指定）'); process.exit(4) }
const response = await fetch(`http://127.0.0.1:${port}/api/live2d-pet/say`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ text: line }),
})
if (response.ok) {
  try {
    writeFileSync(join(homedir(), '.dsh', 'pets', '.last-say.json'), JSON.stringify({ text: line, at: Date.now() }))
  } catch { /* 记不住就算了 */ }
}
console.log(response.ok ? `已推送 → :${port}` : `推送失败 ${response.status}`)
