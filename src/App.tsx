import { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import LogoutIcon from '@mui/icons-material/Logout'
import MemoryIcon from '@mui/icons-material/Memory'
import { Login } from './components/Login.tsx'
import { DeviceCard } from './components/DeviceCard.tsx'
import { FirmwareDetails } from './components/FirmwareDetails.tsx'
import { Footer } from './components/Footer.tsx'
import type { AuthResult, Device } from './lib/api.ts'

interface Session {
  token: string
  email: string
  devices: Device[]
}

export function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [selected, setSelected] = useState<Device | null>(null)

  function onLogin(result: AuthResult, email: string) {
    setSession({ token: result.token, email, devices: result.devices })
  }

  function logout() {
    setSession(null)
    setSelected(null)
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Toolbar>
          <MemoryIcon color="primary" sx={{ mr: 1.5 }} />
          <Typography variant="h1" sx={{ fontSize: '1.15rem', flexGrow: 1 }}>
            Marstek Firmware Downloader
          </Typography>
          {session && (
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, py: { xs: 2, sm: 3 }, width: '100%' }}>
        {!session ? (
          <Login onSuccess={onLogin} />
        ) : (
          <>
            <Typography variant="h2" sx={{ mb: 2 }}>
              Your Devices
            </Typography>
            {session.devices.length === 0 ? (
              <Typography color="text.secondary">No devices found on this account.</Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: 2,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                }}
              >
                {session.devices.map((d) => (
                  <DeviceCard key={d.devid} device={d} onOpen={setSelected} />
                ))}
              </Box>
            )}
          </>
        )}
      </Container>

      <Footer />

      {session && selected && (
        <FirmwareDetails
          device={selected}
          token={session.token}
          email={session.email}
          onClose={() => setSelected(null)}
        />
      )}
    </Box>
  )
}
