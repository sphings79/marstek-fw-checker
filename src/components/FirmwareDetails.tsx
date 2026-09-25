import { useEffect, useMemo, useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  getFirmwareInfo,
  getCommunicationFirmware,
  parseCommunicationFirmware,
  maskValue,
  asObject,
  type Device,
} from '../lib/api.ts'
import { DownloadDonate, type ArchiveTarget } from './DownloadDonate.tsx'
import { deviceImage } from '../lib/deviceImage.ts'
import { ReleaseNote } from './ReleaseNote.tsx'
import { ApiTester } from './ApiTester.tsx'
import { AdvancedSettings } from './AdvancedSettings.tsx'
import { DiagnosticsSubmit } from './DiagnosticsSubmit.tsx'

interface FwEntry {
  key: string
  label: string
  version: string
  url?: string
  filename: string
  note?: string
  archive?: ArchiveTarget
}

function filenameFromUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback
  try {
    return new URL(url).pathname.split('/').pop() || fallback
  } catch {
    return fallback
  }
}

// Build the list of downloadable firmware entries from the two API responses.
function buildEntries(device: Device, fw: unknown, comm: unknown): FwEntry[] {
  const entries: FwEntry[] = []
  const deviceType = device.type || ''
  const response = asObject(fw)
  const data = response?.data

  // CT devices (HME-3/HME-4): single firmware, flat archive layout.
  if (response?.newVerion && typeof data === 'string') {
    const version = String(response.newVerion)
    entries.push({
      key: 'ct',
      label: 'Firmware',
      version,
      url: data,
      filename: filenameFromUrl(data, `firmware_v${version}.bin`),
      note: (response.english || response.chinese) as string | undefined,
      archive: {
        deviceType,
        archiveType: '',
        version,
        device,
        metadata: { deviceName: maskValue(device.name || ""), url: data, apiResponse: fw },
      },
    })
  }

  // Standard modules.
  const modules: { slot: string; label: string; archiveType: string; submitType?: string }[] = [
    { slot: 'control', label: 'Control (EMS)', archiveType: 'Control' },
    { slot: 'bms', label: 'BMS', archiveType: 'BMS' },
    { slot: 'mppt', label: 'MPPT', archiveType: 'MPPT' },
    // Micro is archived under "Micro" but submitted as MPPT (a valid submit
    // type); the archive re-derives the real type from the API response.
    { slot: 'micro', label: 'Inverter (Micro)', archiveType: 'Micro', submitType: 'MPPT' },
  ]
  for (const m of modules) {
    const slot = asObject(asObject(data)?.[m.slot])
    if (slot && slot.version) {
      const version = String(slot.version)
      const url = slot.url as string | undefined
      entries.push({
        key: m.slot,
        label: m.label,
        version,
        url,
        filename: filenameFromUrl(url, `${m.slot}_v${version}.bin`),
        note: (slot.remark || slot.chinese) as string | undefined,
        archive: {
          deviceType,
          archiveType: m.archiveType,
          submitType: m.submitType,
          version,
          device,
          metadata: {
            firmwareType: m.archiveType,
            url,
            remark: slot.remark,
            chinese: slot.chinese,
            apiResponse: fw,
          },
        },
      })
    }
  }

  // FC41D communication module.
  const c = parseCommunicationFirmware(comm)
  if (c.hasUpdate && c.url) {
    const version = String(c.version)
    entries.push({
      key: 'fc41d',
      label: 'Communication Module (FC41D)',
      version,
      url: c.url,
      filename: filenameFromUrl(c.url, `FC41D_v${version}.rbl`),
      archive: {
        deviceType,
        archiveType: 'FC41D',
        submitType: 'FC41D',
        version,
        device,
        metadata: { firmwareType: 'FC41D', deviceName: maskValue(device.name || ""), url: c.url, apiResponse: comm },
      },
    })
  }

  return entries
}

interface Responses {
  firmware: unknown
  communication: unknown
}

interface LiveResult {
  device: Device
  token: string
  email: string
  entries: FwEntry[]
  raw: Responses | null
  error: string | null
}

export function FirmwareDetails({
  device,
  token,
  email,
  onClose,
  demoResponses,
}: {
  device: Device
  token: string
  email: string
  onClose: () => void
  demoResponses?: Responses // screenshot/demo mode
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  // The live result remembers which device/token/email it belongs to, so a
  // change of any of them reads as loading until the new answer is in.
  const [live, setLive] = useState<LiveResult | null>(null)

  const demo = useMemo(
    () =>
      demoResponses && {
        entries: buildEntries(device, demoResponses.firmware, demoResponses.communication),
        raw: demoResponses,
        error: null,
      },
    [device, demoResponses],
  )
  const current =
    live && live.device === device && live.token === token && live.email === email ? live : null
  const shown = demo ?? current
  const loading = !shown
  const error = shown?.error ?? null
  const entries = shown?.entries ?? []
  const raw = shown?.raw ?? null

  useEffect(() => {
    if (demoResponses) return
    let alive = true
    const done = (result: Omit<LiveResult, 'device' | 'token' | 'email'>) =>
      alive && setLive({ device, token, email, ...result })
    Promise.allSettled([
      getFirmwareInfo(device, token, email),
      getCommunicationFirmware(device, token, email),
    ]).then(([fwRes, commRes]) => {
      if (fwRes.status === 'rejected') {
        done({ entries: [], raw: null, error: fwRes.reason?.message || 'Failed to load firmware data' })
        return
      }
      const fw = fwRes.value
      const comm = commRes.status === 'fulfilled' ? commRes.value : { error: String(commRes.reason?.message) }
      done({ entries: buildEntries(device, fw, comm), raw: { firmware: fw, communication: comm }, error: null })
    })
    return () => {
      alive = false
    }
  }, [device, token, email, demoResponses])

  const img = deviceImage(device)

  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2, pb: 1 }}>
        <Box component="img" src={img.src} alt={img.alt} sx={{ height: 40, mr: 1.5 }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h2" sx={{ fontSize: '1.1rem' }} noWrap>
            {device.name || `Device ${device.devid}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {device.type || 'Unknown'} · v{device.version ?? '?'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close">
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <DialogContent>
        {loading && (
          <Stack alignItems="center" spacing={2} sx={{ py: 5 }}>
            <CircularProgress />
            <Typography color="text.secondary">Checking Marstek servers…</Typography>
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && entries.length === 0 && (
          <Alert severity="success">No firmware updates available from Marstek servers for this device.</Alert>
        )}

        {!loading && !error && entries.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Download this firmware <strong>before installing the update</strong>. Once you start the update
            on the device, Marstek stops serving the download link.
          </Alert>
        )}

        {!loading &&
          entries.map((e) => (
            <Box key={e.key} sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {e.label}
                </Typography>
                <Chip size="small" color="warning" label={`v${e.version}`} />
              </Stack>
              {e.note && <ReleaseNote note={e.note} />}
              {e.url && e.archive ? (
                <DownloadDonate url={e.url} filename={e.filename} target={e.archive} />
              ) : e.url ? (
                <Link href={e.url} target="_blank" rel="noopener">
                  Download
                </Link>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No download URL provided by the server.
                </Typography>
              )}
              <Divider sx={{ mt: 2 }} />
            </Box>
          ))}

        {!loading && raw && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" color="text.secondary">
                Raw API responses
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0 }}>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b0e12' : '#eef1f5'),
                  border: '1px solid',
                  borderColor: 'divider',
                  fontSize: 11,
                  overflowX: 'auto',
                  maxHeight: 320,
                }}
              >
                {JSON.stringify(raw, null, 2)}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {!loading && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent' }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
              <Typography variant="body2" color="text.secondary">
                API tester (advanced)
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0 }}>
              <ApiTester device={device} token={token} email={email} />
            </AccordionDetails>
          </Accordion>
        )}

        {!loading && <AdvancedSettings device={device} token={token} />}

        {!loading && !error && (
          <DiagnosticsSubmit
            device={device}
            token={token}
            email={email}
            firmwareResponse={raw?.firmware}
            communicationResponse={raw?.communication}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
