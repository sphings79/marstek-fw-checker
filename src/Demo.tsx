// Screenshot/demo screens (?demo=login|overview|details) with generic data —
// used only to produce README screenshots without exposing real device data.
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import MemoryIcon from '@mui/icons-material/Memory'
import { Login } from './components/Login.tsx'
import { DeviceCard } from './components/DeviceCard.tsx'
import { FirmwareDetails } from './components/FirmwareDetails.tsx'
import { Footer } from './components/Footer.tsx'
import { ColorModeToggle } from './components/ColorModeToggle.tsx'
import type { Device } from './lib/api.ts'

const venusD: Device = { devid: '0000', name: 'MST_VNSD_1a2b', type: 'VNSD-0', version: '150' }
const ct: Device = { devid: '0001', name: 'AstraMeter CT002', type: 'HME-4', version: '121' }

const demoFirmware = {
  code: 1,
  show: 0,
  msg: 'success',
  data: {
    control: {
      version: '150',
      url: 'https://static-eu.marstekenergy.com/uploads/ota/control_0150.bin',
      remark: '1、优化了德国电表连接\n2、修复HTTP升级异常问题',
    },
    bms: '',
    mppt: '',
    micro: '',
  },
}
const demoComm = {
  code: 1,
  show: 0,
  msg: 'ok',
  data: { version: '202512040647', url: 'https://static-eu.marstekenergy.com/uploads/ota/fc41d.rbl' },
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="default"
        sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Toolbar>
          <MemoryIcon color="primary" sx={{ mr: 1.5 }} />
          <Typography variant="h1" sx={{ fontSize: '1.15rem', flexGrow: 1 }}>
            Marstek Firmware Downloader
          </Typography>
          <ColorModeToggle />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 }, width: '100%' }}>
        {children}
      </Container>
      <Footer />
    </Box>
  )
}

export function Demo() {
  const screen = new URLSearchParams(location.search).get('demo')

  if (screen === 'details') {
    return (
      <Shell>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Your Devices
        </Typography>
        <FirmwareDetails
          device={venusD}
          token="demo"
          email="demo@example.com"
          onClose={() => {}}
          demoResponses={{ firmware: demoFirmware, communication: demoComm }}
        />
      </Shell>
    )
  }

  if (screen === 'overview') {
    return (
      <Shell>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Your Devices
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Download and donate firmware <strong>before you install the update</strong>. Once the update is
          triggered on the device, Marstek stops serving the download link.
        </Alert>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          }}
        >
          <DeviceCard
            device={venusD}
            token="demo"
            email=""
            onOpen={() => {}}
            demoSummary={{ hasUpdate: true, modules: [{ label: 'Control', version: '150' }] }}
          />
          <DeviceCard
            device={ct}
            token="demo"
            email=""
            onOpen={() => {}}
            demoSummary={{ hasUpdate: false, modules: [] }}
          />
        </Box>
      </Shell>
    )
  }

  // default: login
  return (
    <Shell>
      <Login onSuccess={() => {}} />
    </Shell>
  )
}
