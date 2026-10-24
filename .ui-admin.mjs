// Временная проверка: /admin → вход суперпользователя → заглушка панели.
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const APP = 'http://localhost:5173'
const PORT = 9339
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const profile = await mkdtemp(path.join(process.cwd(), '.chrome-ui-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-crash-reporter',
  '--disable-breakpad', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--remote-allow-origins=*',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' })

let ws
try {
  let version
  for (let i = 0; i < 80; i += 1) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break }
    catch { await sleep(150) }
  }
  ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const handler = pending.get(message.id)
    if (!handler) return
    pending.delete(message.id)
    message.error ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const current = ++id
    pending.set(current, { resolve, reject })
    ws.send(JSON.stringify({ id: current, method, params, ...(sessionId ? { sessionId } : {}) }))
  })
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || 'Runtime error')
    return response.result.value
  }
  await send('Page.enable', {}, sessionId)
  await send('Runtime.enable', {}, sessionId)
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId)

  await send('Page.navigate', { url: `${APP}/admin` }, sessionId)
  await sleep(2000)

  const before = await evaluate(`({
    path: location.pathname,
    hasForm: Boolean(document.querySelector('form')),
    title: document.querySelector('h1')?.textContent?.trim() || null,
  })`)

  await evaluate(`(() => {
    const setValue = (selector, value) => {
      const input = document.querySelector(selector);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue('#admin-email', ${JSON.stringify(process.env.ADMIN_EMAIL)});
    setValue('#admin-password', ${JSON.stringify(process.env.ADMIN_PASSWORD)});
    document.querySelector('form').requestSubmit();
  })()`)

  let after = null
  for (let i = 0; i < 80; i += 1) {
    await sleep(250)
    after = await evaluate(`({
      path: location.pathname,
      body: document.body.innerText.slice(0, 500),
      role: [...document.querySelectorAll('.user-info li')].map((li) => li.textContent.replace(/\\s+/g, ' ').trim()),
      token: Boolean(localStorage.getItem('access_token')),
      error: document.querySelector('[role="alert"]')?.textContent?.trim() || null,
    })`)
    if (after.body.includes('суперпользователь')) break
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  await writeFile('admin-login.png', Buffer.from(shot.data, 'base64'))
  console.log(JSON.stringify({ before, after }, null, 2))
} finally {
  try { ws?.close() } catch {}
  chrome.kill('SIGKILL')
  await rm(profile, { recursive: true, force: true })
}
