import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import UpgradeIcon from '@mui/icons-material/Upgrade'
import { deviceImage } from '../lib/deviceImage.ts'
import { getFirmwareInfo, firmwareUpdateSummary, type Device, type UpdateSummary } from '../lib/api.ts'

type Check = { kind: 'checking' } | { kind: 'done'; summary: UpdateSummary } | { kind: 'error' }

export function DeviceCard({
  device,
  token,
  email,
  onOpen,
}: {
  device: Device
  token: string
  email: string
  onOpen: (d: Device) => void
}) {
  const img = deviceImage(device)
  const [check, setCheck] = useState<Check>({ kind: 'checking' })

  // Non-blocking per-card firmware check: the card renders immediately and the
  // update badge fills in when the check returns, so the overview isn't delayed.
  useEffect(() => {
    let alive = true
    setCheck({ kind: 'checking' })
    getFirmwareInfo(device, token, email)
      .then((fw) => alive && setCheck({ kind: 'done', summary: firmwareUpdateSummary(fw) }))
      .catch(() => alive && setCheck({ kind: 'error' }))
    return () => {
      alive = false
    }
  }, [device, token, email])

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => onOpen(device)} sx={{ height: '100%' }}>
        <Box
          sx={{
            height: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
            p: 1.5,
          }}
        >
          <Box
            component="img"
            src={img.src}
            alt={img.alt}
            loading="lazy"
            sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          />
        </Box>
        <CardContent>
          <Typography variant="h2" sx={{ fontSize: '1.05rem', mb: 0.5 }} noWrap>
            {device.name || `Device ${device.devid}`}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={device.type || 'Unknown'} />
            {device.version != null && <Chip size="small" variant="outlined" label={`v${device.version}`} />}
          </Stack>

          {check.kind === 'checking' && (
            <Stack direction="row" spacing={0.75} alignItems="center">
              <CircularProgress size={12} />
              <Typography variant="caption" color="text.secondary">
                Checking for updates…
              </Typography>
            </Stack>
          )}
          {check.kind === 'done' && check.summary.hasUpdate && (
            <Chip
              size="small"
              color="warning"
              icon={<UpgradeIcon />}
              label={`Update: ${check.summary.modules.map((m) => `${m.label} ${m.version}`).join(', ')}`}
              sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.4 } }}
            />
          )}
          {check.kind === 'done' && !check.summary.hasUpdate && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <CheckCircleIcon sx={{ fontSize: 15 }} /> Up to date
            </Typography>
          )}
          {check.kind === 'error' && (
            <Typography variant="caption" color="text.secondary">
              Tap to view firmware
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
