import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import TranslateIcon from '@mui/icons-material/Translate'
import { hasChinese, translateText } from '../lib/api.ts'

export function ReleaseNote({ note }: { note: string }) {
  const [translation, setTranslation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  async function translate() {
    setLoading(true)
    setFailed(false)
    try {
      setTranslation(await translateText(note))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
        {note}
      </Typography>

      {translation && (
        <Typography
          variant="body2"
          sx={{ mt: 0.75, pl: 1.25, borderLeft: '2px solid', borderColor: 'primary.main', whiteSpace: 'pre-line' }}
        >
          {translation}
          <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            Translation via MyMemory
          </Typography>
        </Typography>
      )}

      {hasChinese(note) && !translation && (
        <Button
          size="small"
          variant="text"
          startIcon={loading ? <CircularProgress size={14} /> : <TranslateIcon />}
          onClick={translate}
          disabled={loading}
          sx={{ mt: 0.25, ml: -0.5 }}
        >
          {loading ? 'Translating…' : failed ? 'Retry translation' : 'Translate'}
        </Button>
      )}
      {failed && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
          Translation service unavailable — try again later.
        </Typography>
      )}
    </Box>
  )
}
