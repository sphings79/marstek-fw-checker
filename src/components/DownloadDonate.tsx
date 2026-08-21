import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadIcon from '@mui/icons-material/Download'
import FavoriteIcon from '@mui/icons-material/Favorite'
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

type Archive =
  | { kind: 'checking' }
  | { kind: 'archived'; url: string }
  | { kind: 'not-archived' }
  | { kind: 'donating' }
  | { kind: 'donated'; number: number; url: string }
  | { kind: 'queued'; number: number; url: string }
  | { kind: 'failed'; message: string }

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * Combined Download + donate control. Downloading also contributes the firmware
 * to the community archive (unless it is already archived) — a single action so
 * users don't download without donating.
 */
export function DownloadDonate({
  url,
  filename,
  target,
}: {
  url: string
  filename: string
  target: ArchiveTarget
}) {
  const [archive, setArchive] = useState<Archive>({ kind: 'checking' })

  useEffect(() => {
    let alive = true
    setArchive({ kind: 'checking' })
    checkArchive(target.deviceType, target.archiveType, target.version).then((r) => {
      if (!alive) return
      if (r.exists && r.githubUrl) setArchive({ kind: 'archived', url: r.githubUrl })
      else setArchive({ kind: 'not-archived' })
    })
    return () => {
      alive = false
    }
  }, [target.deviceType, target.archiveType, target.version])

  async function donate() {
    setArchive({ kind: 'donating' })
    try {
      const metadata = {
        ...target.metadata,
        deviceType: target.deviceType,
        version: target.version,
        ...(target.submitType ? { firmwareType: target.submitType } : {}),
      }
      const result = await submitToArchive(metadata, obfuscateDeviceInfo(target.device))
      if (result.success && result.issueNumber && result.issueUrl) {
        setArchive({ kind: 'donated', number: result.issueNumber, url: result.issueUrl })
      } else if (result.existingIssue) {
        setArchive({ kind: 'queued', number: result.existingIssue.number, url: result.existingIssue.url })
      } else {
        throw new Error(result.message || 'Donation failed')
      }
    } catch (e) {
      setArchive({ kind: 'failed', message: (e as Error).message })
    }
  }

  // Whether donating is still applicable (not already in the archive / queued).
  const donatable = archive.kind === 'not-archived' || archive.kind === 'failed'
  const busy = archive.kind === 'donating'

  function onDownloadAndDonate() {
    triggerDownload(url, filename)
    if (donatable) donate() // downloading contributes to the archive too
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {donatable ? (
          <>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              disabled={busy}
              onClick={onDownloadAndDonate}
            >
              Download &amp; donate
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              startIcon={<FavoriteIcon />}
              disabled={busy}
              onClick={donate}
            >
              Donate only
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={busy}
            onClick={() => triggerDownload(url, filename)}
          >
            Download
          </Button>
        )}
      </Stack>

      <Box sx={{ mt: 0.75, minHeight: 20 }}>
        {archive.kind === 'checking' && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">
              Checking archive…
            </Typography>
          </Stack>
        )}

        {archive.kind === 'archived' && (
          <Typography variant="caption" color="success.main" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 15 }} /> Already in the{' '}
            <Link href={archive.url} target="_blank" rel="noopener" color="inherit" underline="always">
              community archive
            </Link>
          </Typography>
        )}

        {archive.kind === 'not-archived' && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <FavoriteIcon sx={{ fontSize: 14 }} /> Downloading also donates this to the community archive
          </Typography>
        )}

        {archive.kind === 'donating' && (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <CircularProgress size={12} />
            <Typography variant="caption" color="text.secondary">
              Donating to archive…
            </Typography>
          </Stack>
        )}

        {archive.kind === 'donated' && (
          <Typography variant="caption" color="success.main" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 15 }} /> Downloaded · donated to archive (
            <Link href={archive.url} target="_blank" rel="noopener" color="inherit" underline="always">
              #{archive.number}
            </Link>
            )
          </Typography>
        )}

        {archive.kind === 'queued' && (
          <Typography variant="caption" color="success.main" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon sx={{ fontSize: 15 }} /> Downloaded · already queued for archive (
            <Link href={archive.url} target="_blank" rel="noopener" color="inherit" underline="always">
              #{archive.number}
            </Link>
            )
          </Typography>
        )}

        {archive.kind === 'failed' && (
          <Typography variant="caption" color="warning.main">
            Downloaded · archive donation failed ({archive.message}). Click Download again to retry.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
