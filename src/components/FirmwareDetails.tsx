import { useEffect, useState } from 'react'
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
  type Device,
} from '../lib/api.ts'
import { DownloadDonate, type ArchiveTarget } from './DownloadDonate.tsx'
import { deviceImage } from '../lib/deviceImage.ts'
import { ReleaseNote } from './ReleaseNote.tsx'
import { ApiTester } from './ApiTester.tsx'
import { AdvancedSettings } from './AdvancedSettings.tsx'

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
function buildEntries(device: Device, fw: any, comm: any): FwEntry[] {
  const entries: FwEntry[] = []
  const deviceType = device.type || ''
  const data = fw?.data

  // CT devices (HME-3/HME-4): single firmware, flat archive layout.
  if (fw?.newVerion && typeof data === 'string') {
    const version = String(fw.newVerion)
    entries.push({
      key: 'ct',
      label: 'Firmware',
      version,
      url: data,
      filename: filenameFromUrl(data, `firmware_v${version}.bin`),
      note: fw.english || fw.chinese,
      archive: {
        deviceType,
        archiveType: '',
        version,
        device,
        metadata: { deviceName: device.name, url: data, apiResponse: fw },
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
    const slot = data?.[m.slot]
    if (slot && slot.version) {
      const version = String(slot.version)
      entries.push({
        key: m.slot,
        label: m.label,
        version,
        url: slot.url,
        filename: filenameFromUrl(slot.url, `${m.slot}_v${version}.bin`),
        note: slot.remark || slot.chinese,
        archive: {
          deviceType,
          archiveType: m.archiveType,
          submitType: m.submitType,
          version,
          device,
          metadata: {
            firmwareType: m.archiveType,
            url: slot.url,
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
        metadata: { firmwareType: 'FC41D', deviceName: device.name, url: c.url, apiResponse: comm },
      },
    })
  }

  return entries
}

export function FirmwareDetails({
  device,
  token,
  email,
  onClose,
}: {
  device: Device
  token: string
  email: string
  onClose: () => void
}) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<FwEntry[]>([])
  const [raw, setRaw] = useState<{ firmware: any; communication: any } | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    Promise.allSettled([
      getFirmwareInfo(device, token, email),
      getCommunicationFirmware(device, token, email),
    ]).then(([fwRes, commRes]) => {
      if (!alive) return
      if (fwRes.status === 'rejected') {
        setError(fwRes.reason?.message || 'Failed to load firmware data')
        setLoading(false)
        return
      }
      const fw = fwRes.value
      const comm = commRes.status === 'fulfilled' ? commRes.value : { error: String(commRes.reason?.message) }
      setEntries(buildEntries(device, fw, comm))
      setRaw({ firmware: fw, communication: comm })
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [device, token, email])

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
      </DialogContent>
    </Dialog>
  )
}
