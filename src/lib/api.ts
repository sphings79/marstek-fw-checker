// Typed client for the Marstek firmware backend.
//
// All Marstek cloud calls go through the same server-side proxy the vanilla tool
// used (/.netlify/functions/marstek-proxy) — required because the browser cannot
// call eu.hamedata.com directly (CORS) and because the GitHub archive endpoints
// need a server-held token. The proxy is provided by marstek-server.js in prod
// and forwarded by the Vite dev server in development.

import { md5 } from './md5.ts'

const PROXY = '/.netlify/functions/marstek-proxy'

export interface Device {
  devid: string
  name?: string
  type?: string
  version?: string | number
  sn?: string
  mac?: string
  date?: string
  [k: string]: unknown
}

export interface AuthResult {
  token: string
  devices: Device[]
  rawAuthResponse: string
}

/** Build the proxied hamedata URL and return the parsed JSON (falls back to text). */
async function proxyGet(params: Record<string, string>): Promise<any> {
  const url = `${PROXY}?${new URLSearchParams(params).toString()}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Log in with email + password, returning the token and the merged device list. */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const pwd = md5(password)
  const authData = await proxyGet({
    endpoint: '/app/Solar/v2_get_device.php',
    pwd,
    mailbox: email,
  })

  const rawAuthResponse = typeof authData === 'string' ? authData : JSON.stringify(authData, null, 2)
  const token: string =
    (authData && authData.token) || (typeof authData === 'string' ? authData.trim() : '')
  if (!token) throw new Error('No authentication token received. Check email and password.')

  const basic: Device[] = (authData && authData.data) || []
  const detailed = await getDeviceList(token, email)
  const devices = basic.map((d) => {
    const extra = detailed.find((x) => x.devid === d.devid)
    return extra ? { ...d, ...extra } : d
  })

  return { token, devices, rawAuthResponse }
}

/** Detailed device list (adds type/version/etc). */
export async function getDeviceList(token: string, email: string): Promise<Device[]> {
  const data = await proxyGet({
    endpoint: '/ems/api/v1/getDeviceList',
    token,
    mailbox: email,
  })
  if (data && data.code === 1 && Array.isArray(data.data)) return data.data
  return []
}

/** Build the system-firmware request params (endpoint + query) for a device. */
export function firmwareParams(
  device: Device,
  token: string,
  email: string,
): Record<string, string> {
  const type = device.type
  const isB2500D = type === 'HMJ-2'
  const isCT = type === 'HME-3' || type === 'HME-4'

  let params: Record<string, string>
  if (isB2500D) {
    params = {
      endpoint: '/app/neng/v2_get_otadevice_b2500.php',
      m: '100',
      subversion: '0',
      uid: device.devid,
      lang: 'English',
      click: 'true',
      token,
      mailbox: email,
      device_type: type!,
    }
  } else if (isCT) {
    params = {
      endpoint: '/ems/api/v1/checkAcCoupleOta',
      m: '100',
      uid: device.devid,
      lang: 'English',
      click: 'true',
      token,
      device_type: type!,
      mailbox: email,
    }
  } else {
    params = {
      endpoint: '/ems/api/v2/checkSmallBalconyOTA',
      uid: device.devid,
      lang: 'English',
      token,
      device_type: type || 'HMG-50',
      mailbox: email,
      click: 'false',
      is_fourDigit: '{"control":false,"bms":false,"micro":false,"mppt":false}',
      m: '100',
      sbv: '0',
      mppt: '0',
      inv: '0',
    }
  }
  return params
}

/** System firmware (Control/BMS/MPPT/Micro), CT (AcCouple) or B2500 depending on type. */
export async function getFirmwareInfo(device: Device, token: string, email: string): Promise<any> {
  return proxyGet(firmwareParams(device, token, email))
}

export interface UpdateSummary {
  hasUpdate: boolean
  modules: { label: string; version: string }[]
}

/**
 * Summarize which modules have a firmware update available (and their new
 * versions) from a checkSmallBalconyOTA / checkAcCoupleOta response. Only
 * modules the server actually offers an update for are listed (that's all the
 * API returns — the unchanged modules come back empty).
 */
export function firmwareUpdateSummary(fw: any): UpdateSummary {
  const modules: { label: string; version: string }[] = []
  // CT devices: single firmware with a flat `newVerion`.
  if (fw?.newVerion && typeof fw.data === 'string') {
    return { hasUpdate: true, modules: [{ label: 'Firmware', version: String(fw.newVerion) }] }
  }
  const data = fw?.data
  const map: [string, string][] = [
    ['control', 'Control'],
    ['bms', 'BMS'],
    ['mppt', 'MPPT'],
    ['micro', 'Micro'],
    ['dcdc', 'DCDC'],
    ['led', 'LED'],
    ['charger', 'Charger'],
  ]
  for (const [slot, label] of map) {
    const s = data?.[slot]
    if (s && typeof s === 'object' && s.version) modules.push({ label, version: String(s.version) })
  }
  return { hasUpdate: modules.length > 0, modules }
}

/** Query params for the FC41D communication-module OTA endpoint (getCheckWifiOta). */
export function communicationParams(
  device: Device,
  token: string,
  email: string,
): Record<string, string> {
  return {
    endpoint: '/ems/api/v1/getCheckWifiOta',
    uid: device.devid,
    devid: device.devid,
    device_type: device.type || '',
    lang: 'English',
    mailbox: email,
    token,
    click: 'false',
    version: '202001010000',
  }
}

/** FC41D communication-module firmware (getCheckWifiOta). */
export async function getCommunicationFirmware(
  device: Device,
  token: string,
  email: string,
): Promise<any> {
  return proxyGet(communicationParams(device, token, email))
}

/** Submit a raw diagnostic dump to the maintainer's PRIVATE diagnostics repo. */
export async function submitDiagnostics(payload: Record<string, unknown>): Promise<{
  success?: boolean
  issueNumber?: number
  issueUrl?: string
  error?: string
}> {
  const res = await fetch('/.netlify/functions/submit-diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to submit diagnostics')
  return data
}

/** Read-only advanced device settings (getAdvance). */
export async function getAdvancedSettings(device: Device, token: string): Promise<any> {
  return proxyGet({
    endpoint: '/ems/api/v1/getAdvance',
    token,
    devid: device.devid,
    type: device.type || 'HMG-50',
    app_name: 'marstek',
  })
}

/** Build the full hamedata URL from a params record (endpoint + query). */
export function hamedataUrl(params: Record<string, string>): string {
  const { endpoint, ...rest } = params
  return `https://eu.hamedata.com${endpoint}?${new URLSearchParams(rest).toString()}`
}

/** Run an arbitrary hamedata URL through the proxy (for the advanced API tester). */
export async function testHamedataUrl(fullUrl: string): Promise<{ status: number; response: any }> {
  const u = new URL(fullUrl)
  const endpoint = u.pathname + u.search
  const res = await fetch(`${PROXY}?endpoint=${encodeURIComponent(endpoint)}`, {
    headers: { Accept: 'application/json' },
  })
  const text = await res.text()
  let response: any
  try {
    response = JSON.parse(text)
  } catch {
    response = text
  }
  return { status: res.status, response }
}

export interface CommunicationFirmware {
  hasUpdate: boolean
  version: string | null
  url: string | null
}

/**
 * Normalize getCheckWifiOta responses:
 *   update:   {"code":1,"data":{"version":"…","url":"…rbl"}}
 *   up-to-date: {"code":0,"msg":"固件已经最新"}  (no usable data)
 */
export function parseCommunicationFirmware(resp: any): CommunicationFirmware {
  const empty: CommunicationFirmware = { hasUpdate: false, version: null, url: null }
  if (!resp || resp.error) return empty
  let data = resp.data
  if (Array.isArray(data)) data = data[0]
  if (!data || typeof data !== 'object') return empty
  return { hasUpdate: Boolean(data.url), version: data.version ?? null, url: data.url ?? null }
}

export interface ArchiveStatus {
  exists: boolean
  githubUrl?: string
  path?: string
  firmwareFile?: { name: string; size: number; downloadUrl: string } | null
  error?: string
}

/** Check whether a firmware version is already in the GitHub archive. */
export async function checkArchive(
  deviceType: string,
  firmwareType: string,
  version: string,
): Promise<ArchiveStatus> {
  let url = `/.netlify/functions/check-firmware-archive?deviceType=${encodeURIComponent(
    deviceType,
  )}&version=${encodeURIComponent(String(version))}`
  if (firmwareType && firmwareType.trim()) {
    url += `&firmwareType=${encodeURIComponent(firmwareType)}`
  }
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `Server error (${res.status})`)
    return data
  } catch (e) {
    return { exists: false, error: (e as Error).message }
  }
}

export interface SubmitResult {
  success?: boolean
  issueNumber?: number
  issueUrl?: string
  existingIssue?: { number: number; url: string }
  message?: string
  error?: string
}

/** Submit firmware metadata to the archive (creates a GitHub issue server-side). */
export async function submitToArchive(
  metadata: Record<string, unknown>,
  deviceInfo: Record<string, unknown>,
  notes = 'Submitted via web interface',
): Promise<SubmitResult> {
  const res = await fetch('/.netlify/functions/submit-firmware-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metadata, deviceInfo, submissionNotes: notes }),
  })
  const data = await res.json()
  if (!res.ok && !data.existingIssue) {
    throw new Error(data.error || data.message || 'Failed to submit firmware')
  }
  return data
}

/** True if the text contains Chinese characters (worth offering a translation). */
export function hasChinese(text: string | undefined | null): boolean {
  return !!text && /[一-龥]/.test(text)
}

/** Translate text via the free MyMemory API (CORS-enabled, client-side). */
export async function translateText(text: string, from = 'zh', to = 'en'): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text,
  )}&langpair=${from}|${to}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.responseStatus === 200 && data.responseData?.translatedText) {
    return data.responseData.translatedText as string
  }
  throw new Error('Translation service unavailable')
}

/**
 * Mask a value keeping only the first 2 and last 2 characters
 * ("Haus Mahlsdorf L3 - Alt" -> "Ha*******************lt"). Values of 4 chars or
 * fewer are left as-is. Used for device identifiers AND the device name (users
 * sometimes put their real name / address in the device name).
 */
export function maskValue(v: unknown): string {
  const s = String(v ?? '')
  return s.length > 4 ? s.slice(0, 2) + '*'.repeat(s.length - 4) + s.slice(-2) : s
}

/** Mask sensitive device fields (id, serial, MAC, and the user-chosen name). */
export function obfuscateDeviceInfo(info: Device): Record<string, unknown> {
  const out: Record<string, unknown> = { ...info }
  if (info.devid) out.devid = maskValue(info.devid)
  if (info.sn) out.sn = maskValue(info.sn)
  if (info.mac) out.mac = maskValue(info.mac)
  if (info.name) out.name = maskValue(info.name)
  return out
}
