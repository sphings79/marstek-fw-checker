import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { authenticate, type AuthResult } from '../lib/api.ts'

export function Login({ onSuccess }: { onSuccess: (r: AuthResult, email: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await authenticate(email.trim(), password)
      onSuccess(result, email.trim())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card sx={{ maxWidth: 460, mx: 'auto', mt: { xs: 2, sm: 4 } }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <LockOutlinedIcon color="primary" />
          <Typography variant="h2">Login to Marstek Account</Typography>
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }}>
          Log in with your <strong>Marstek app account</strong> — the same email and password you use in the
          Marstek app. The details you enter are used <strong>only for this query</strong> and are{' '}
          <strong>never stored</strong>.
        </Alert>
        <Alert severity="warning" sx={{ mb: 2.5 }}>
          Unofficial community tool, not affiliated with Marstek. Using it logs you out of the official
          Marstek app on your phone (single-session limit).
        </Alert>

        <Box component="form" onSubmit={submit}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="username"
              helperText="The email you use for the Marstek app"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              helperText="Your Marstek app password"
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !email || !password}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {loading ? 'Logging in…' : 'Login'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
