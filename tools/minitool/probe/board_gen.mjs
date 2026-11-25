#!/usr/bin/env node
// board_gen.mjs - generate a PNG through the ChatGPT (Codex) subscription image endpoint.
// This host has no direct route to chatgpt.com, so the request is tunnelled through a local
// HTTP proxy (CONNECT + TLS) and sent exactly as the dsh-image-gen codex vendor does.
//
//   node board_gen.mjs --prompt-file prompt.txt --out board.png [--size 1536x1024] [--proxy http://127.0.0.1:7897]
//
// Credentials come from ~/.dsh/.credentials.yaml -> refs.OPENAI_CODEX_SUBSCRIPTION_OAUTH.

import { createConnection } from 'node:net'
import { connect as tlsConnect } from 'node:tls'
import { once } from 'node:events'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const HOST = 'chatgpt.com'
const MODEL = 'gpt-image-2.6-flare'
const ENDPOINT = '/backend-api/codex/images/generations'
const USER_AGENT = 'codex_cli_rs/0.55.0 (Windows 10; x86_64) Terminal/1.0'

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(name)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}

const promptFile = opt('--prompt-file')
const out = opt('--out')
const size = opt('--size')
const proxy = new URL(opt('--proxy', process.env.HTTPS_PROXY || 'http://127.0.0.1:7897'))

if (!promptFile || !out) {
  console.error('usage: node board_gen.mjs --prompt-file <txt> --out <png> [--size 1536x1024] [--proxy url]')
  process.exit(2)
}

const credText = readFileSync(path.join(homedir(), '.dsh', '.credentials.yaml'), 'utf8')
const credLine = credText.match(/OPENAI_CODEX_SUBSCRIPTION_OAUTH:[ \t]*'(.*)'[ \t]*$/m)
if (!credLine) throw new Error('no OPENAI_CODEX_SUBSCRIPTION_OAUTH in ~/.dsh/.credentials.yaml')
const blob = JSON.parse(credLine[1])

const payload = JSON.stringify({
  prompt: readFileSync(promptFile, 'utf8').trim(),
  model: MODEL,
  ...(size ? { size } : {}),
})

/** Open a CONNECT tunnel through the proxy; resolves with the raw socket. */
function tunnel(target) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: proxy.hostname, port: Number(proxy.port) }, () => {
      socket.write('CONNECT ' + target + ' HTTP/1.1\r\nHost: ' + target + '\r\n\r\n')
    })
    let buffered = Buffer.alloc(0)
    const onData = (chunk) => {
      buffered = Buffer.concat([buffered, chunk])
      const end = buffered.indexOf('\r\n\r\n')
      if (end < 0) return
      const status = buffered.subarray(0, end).toString().split('\r\n')[0]
      if (!/^HTTP\/1\.[01] 200/.test(status)) {
        socket.destroy()
        return reject(new Error('proxy CONNECT failed: ' + status))
      }
      socket.removeListener('data', onData)
      const rest = buffered.subarray(end + 4)
      if (rest.length > 0) socket.unshift(rest)
      resolve(socket)
    }
    socket.on('data', onData)
    socket.on('error', reject)
  })
}

/** Decode a chunked transfer body. */
function dechunk(buf) {
  const parts = []
  let i = 0
  while (i < buf.length) {
    const lineEnd = buf.indexOf('\r\n', i)
    if (lineEnd < 0) break
    const len = parseInt(buf.subarray(i, lineEnd).toString(), 16)
    if (!Number.isFinite(len) || len <= 0) break
    parts.push(buf.subarray(lineEnd + 2, lineEnd + 2 + len))
    i = lineEnd + 2 + len + 2
  }
  return Buffer.concat(parts)
}

const socket = await tunnel(HOST + ':443')
const tls = tlsConnect({ socket, servername: HOST })
await once(tls, 'secureConnect')

const request = [
  'POST ' + ENDPOINT + ' HTTP/1.1',
  'host: ' + HOST,
  'authorization: Bearer ' + blob.access,
  'chatgpt-account-id: ' + blob.accountId,
  'originator: codex_cli_rs',
  'user-agent: ' + USER_AGENT,
  'content-type: application/json',
  'accept: application/json',
  'content-length: ' + Buffer.byteLength(payload),
  'connection: close',
  '',
  payload,
].join('\r\n')

tls.setTimeout(900000, () => tls.destroy(new Error('(timeout after 15 min)')))
tls.write(request)

const chunks = []
tls.on('data', (chunk) => chunks.push(chunk))
try {
  await once(tls, 'end')
} catch (error) {
  if (chunks.length === 0) throw error
}

const raw = Buffer.concat(chunks)
const headerEnd = raw.indexOf('\r\n\r\n')
if (headerEnd < 0) throw new Error('no response headers')
const head = raw.subarray(0, headerEnd).toString()
const status = Number(head.split(' ')[1])
const chunked = /^transfer-encoding:\s*chunked/im.test(head)
const body = chunked ? dechunk(raw.subarray(headerEnd + 4)) : raw.subarray(headerEnd + 4)

if (status !== 200) {
  console.error('HTTP ' + status + ': ' + body.toString('utf8').slice(0, 400))
  process.exit(1)
}

const parsed = JSON.parse(body.toString('utf8'))
const first = (parsed.data || [])[0]
if (!first || !first.b64_json) {
  console.error('no image in response: ' + JSON.stringify(parsed).slice(0, 400))
  process.exit(1)
}
const png = Buffer.from(first.b64_json, 'base64')
mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
writeFileSync(out, png)
console.log('OK ' + out + ' ' + png.length + ' bytes')
