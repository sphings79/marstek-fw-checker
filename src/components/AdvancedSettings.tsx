import { useState } from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { getAdvancedSettings, type Device } from '../lib/api.ts'

// Read-only advanced device settings, fetched lazily on first expand.
export function AdvancedSettings({ device, token }: { device: Device; token: string }) {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    if (loaded || loading) return
    setLoading(true)
    try {
      const r = await getAdvancedSettings(device, token)
      setData(JSON.stringify(r, null, 2))
    } catch (e) {
      setData(`Error: ${(e as Error).message}`)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }

  async function copy() {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{ bgcolor: 'transparent' }}
      onChange={(_, expanded) => expanded && load()}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
        <Typography variant="body2" color="text.secondary">
          Advanced settings
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0 }}>
        {loading && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              Loading…
            </Typography>
          </Stack>
        )}
        {!loading && data && (
          <>
            <Button size="small" startIcon={<ContentCopyIcon />} onClick={copy} sx={{ mb: 1 }}>
              {copied ? 'Copied!' : 'Copy settings'}
            </Button>
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
              {data}
            </Box>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  )
}
