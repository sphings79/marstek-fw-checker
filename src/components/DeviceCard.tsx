import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { deviceImage } from '../lib/deviceImage.ts'
import type { Device } from '../lib/api.ts'

export function DeviceCard({ device, onOpen }: { device: Device; onOpen: (d: Device) => void }) {
  const img = deviceImage(device)
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => onOpen(device)} sx={{ height: '100%' }}>
        <Box
          sx={{
            height: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.03)',
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
          <Typography variant="caption" color="text.secondary">
            Tap to view firmware
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
