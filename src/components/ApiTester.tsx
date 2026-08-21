import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import {
  firmwareParams,
  communicationParams,
  hamedataUrl,
  testHamedataUrl,
  type Device,
} from '../lib/api.ts'

// Advanced power-user tool: edit a hamedata URL and re-run it through the proxy.
export function ApiTester({ device, token, email }: { device: Device; token: string; email: string }) {
  const firmwareUrl = hamedataUrl(firmwareParams(device, token, email))
  const commUrl = hamedataUrl(communicationParams(device, token, email))

  const [url, setUrl] = useState(firmwareUrl)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    try {
      const r = await testHamedataUrl(url.trim())
      setResult(JSON.stringify(r, null, 2))
    } catch (e) {
      setResult(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Edit the URL and re-run it through the proxy. Preload:
      </Typography>
      <Stack direction="row" spacing={1} sx={{ my: 1 }} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="outlined" onClick={() => setUrl(firmwareUrl)}>
          Firmware URL
        </Button>
        <Button size="small" variant="outlined" onClick={() => setUrl(commUrl)}>
          FC41D URL
        </Button>
      </Stack>

      <TextField
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        size="small"
        slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
      />

      <Button
        variant="contained"
        size="small"
        startIcon={<PlayArrowIcon />}
        onClick={run}
        disabled={loading}
        sx={{ mt: 1 }}
      >
        {loading ? 'Testing…' : 'Test API call'}
      </Button>

      {result && (
        <Box
          component="pre"
          sx={{
            mt: 1.5,
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
          {result}
        </Box>
      )}
    </Box>
  )
}
