import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import ArchiveIcon from '@mui/icons-material/Inventory2'
import {
  checkArchive,
  submitToArchive,
  obfuscateDeviceInfo,
  type Device,
} from '../lib/api.ts'

export interface ArchiveTarget {
  deviceType: string // archive device type (device.type)
  archiveType: string // folder type for the existence check ('' for flat devices)
  submitType?: string // firmwareType sent on submit (defaults to archiveType)
  version: string
  metadata: Record<string, unknown>
  device: Device
}

type State =
  | { kind: 'checking' }
  | { kind: 'archived'; url: string }
  | { kind: 'not-archived' }
  | { kind: 'submitting' }
  | { kind: 'submitted'; number: number; url: string }
  | { kind: 'queued'; number: number; url: string }
  | { kind: 'error'; message: string }

export function ArchiveActions({ target }: { target: ArchiveTarget }) {
  const [state, setState] = useState<State>({ kind: 'checking' })

  useEffect(() => {
    let alive = true
    setState({ kind: 'checking' })
    checkArchive(target.deviceType, target.archiveType, target.version).then((r) => {
      if (!alive) return
      if (r.exists && r.githubUrl) setState({ kind: 'archived', url: r.githubUrl })
      else setState({ kind: 'not-archived' })
    })
    return () => {
      alive = false
    }
  }, [target.deviceType, target.archiveType, target.version])

  async function submit() {
    setState({ kind: 'submitting' })
    try {
      const metadata = {
        ...target.metadata,
        deviceType: target.deviceType,
        version: target.version,
        ...(target.submitType ? { firmwareType: target.submitType } : {}),
      }
      const result = await submitToArchive(metadata, obfuscateDeviceInfo(target.device))
      if (result.success && result.issueNumber && result.issueUrl) {
        setState({ kind: 'submitted', number: result.issueNumber, url: result.issueUrl })
      } else if (result.existingIssue) {
        setState({ kind: 'queued', number: result.existingIssue.number, url: result.existingIssue.url })
      } else {
        throw new Error(result.message || 'Submission failed')
      }
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }

  switch (state.kind) {
    case 'checking':
      return <Chip size="small" icon={<CircularProgress size={12} />} label="Checking archive…" />
    case 'archived':
      return (
        <Chip
          size="small"
          color="success"
          icon={<CheckCircleIcon />}
          label="Archived"
          component={Link}
          href={state.url}
          target="_blank"
          rel="noopener"
          clickable
        />
      )
    case 'not-archived':
      return (
        <Button size="small" variant="outlined" startIcon={<CloudUploadIcon />} onClick={submit}>
          Submit for archive
        </Button>
      )
    case 'submitting':
      return <Chip size="small" icon={<CircularProgress size={12} />} label="Submitting…" />
    case 'submitted':
      return (
        <Chip
          size="small"
          color="success"
          icon={<ArchiveIcon />}
          label={`Submitted · #${state.number}`}
          component={Link}
          href={state.url}
          target="_blank"
          rel="noopener"
          clickable
        />
      )
    case 'queued':
      return (
        <Chip
          size="small"
          color="warning"
          label={`Already queued · #${state.number}`}
          component={Link}
          href={state.url}
          target="_blank"
          rel="noopener"
          clickable
        />
      )
    case 'error':
      return (
        <Box>
          <Chip size="small" color="error" label="Submit failed" onClick={submit} />
        </Box>
      )
  }
}
