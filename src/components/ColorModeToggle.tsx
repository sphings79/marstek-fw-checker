import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useColorScheme } from '@mui/material/styles'
import DarkModeIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeIcon from '@mui/icons-material/LightModeOutlined'

export function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()
  // `mode` is undefined on the very first (pre-hydration) render.
  if (!mode) return <IconButton color="inherit" disabled sx={{ opacity: 0 }} />

  const resolved = mode === 'system' ? systemMode : mode
  const next = resolved === 'dark' ? 'light' : 'dark'

  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton color="inherit" onClick={() => setMode(next)} aria-label="Toggle light/dark mode">
        {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
