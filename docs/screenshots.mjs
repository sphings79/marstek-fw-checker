// Regenerate the README screenshots (generic demo data, no login):
//   1) npm run build && npm run server   (backend on :3000, in one shell)
//   2) npm run dev                        (vite on :5173, in another shell)
//   3) npm i -D playwright-core && npx playwright install chromium
//   4) node docs/screenshots.mjs

import { chromium } from 'playwright-core'
const BASE = 'http://localhost:5173/marstek/marstek-fw-checker/'
const OUT = new URL('./screenshots', import.meta.url).pathname
const browser = await chromium.launch()
async function shot(name, query, o = {}) {
  const { width = 1200, height = 900, full = true, wait = 1800 } = o
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await page.goto(BASE + query, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  await ctx.close()
  console.log('shot', name)
}
await shot('01-login', '?demo=login', { full: true })
await shot('02-overview', '?demo=overview', { full: true })
await shot('03-firmware-details', '?demo=details', { width: 1200, height: 1000, full: false, wait: 2800 })
await shot('04-overview-mobile', '?demo=overview', { width: 390, height: 844, full: true })
await browser.close()
console.log('DONE')
