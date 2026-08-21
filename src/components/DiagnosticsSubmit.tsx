import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import BugReportIcon from '@mui/icons-material/BugReport'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import {
  getAdvancedSettings,
  submitDiagnostics,
  firmwareParams,
  communicationParams,
  hamedataUrl,
  type Device,
} from '../lib/api.ts'

type State =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'done'; number: number; url: string }
  | { kind: 'error'; message: string }

/**
 * Bottom-of-dialog button that bundles the raw API responses, the API-tester
 * URLs and the advanced settings and posts them to the maintainer's PRIVATE
 * diagnostics repo (not publicly visible).
 */
export function DiagnosticsSubmit({
  device,
  token,
  email,
  firmwareResponse,
  communicationResponse,
}: {
  device: Device
  token: string
  email: string
  firmwareResponse: unknown
  communicationResponse: unknown
}) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function submit() {
    setState({ kind: 'submitting' })
    try {
      let advancedSettings: unknown
      try {
        advancedSettings = await getAdvancedSettings(device, token)
      } catch (e) {
        advancedSettings = { error: (e as Error).message }
      }
      const payload = {
        device,
        apiUrls: {
          firmware: hamedataUrl(firmwareParams(device, token, email)),
          communication: hamedataUrl(communicationParams(device, token, email)),
        },
        firmwareResponse,
        communicationResponse,
        advancedSettings,
        meta: {
          userAgent: navigator.userAgent,
          submittedAt: new Date().toISOString(),
          source: 'firmware-details',
        },
      }
      const r = await submitDiagnostics(payload)
      if (r.success && r.issueNumber && r.issueUrl) {
        setState({ kind: 'done', number: r.issueNumber, url: r.issueUrl })
      } else {
        throw new Error(r.error || 'Submission failed')
      }
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Divider sx={{ mb: 2 }} />
      {state.kind === 'done' ? (
        <Typography variant="body2" color="success.main" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 16 }} /> Diagnostics submitted (#{state.number})
        </Typography>
      ) : (
        <Button
          variant="outlined"
          size="small"
          color="secondary"
          startIcon={state.kind === 'submitting' ? <CircularProgress size={16} /> : <BugReportIcon />}
          onClick={submit}
          disabled={state.kind === 'submitting'}
        >
          {state.kind === 'submitting' ? 'Submitting…' : 'Submit RAW data'}
        </Button>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        Sends the raw API responses, the tester URLs and the advanced settings to the maintainer's{' '}
        <strong>private</strong> diagnostics repo (not publicly visible) — helps debug device-specific issues.
      </Typography>
      {state.kind === 'error' && (
        <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
          Failed: {state.message}
        </Typography>
      )}
      {state.kind === 'done' && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          <Link href={state.url} target="_blank" rel="noopener">
            View submission
          </Link>{' '}
          (visible only to the maintainer)
        </Typography>
      )}
    </Box>
  )
}
