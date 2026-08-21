import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import StarIcon from '@mui/icons-material/StarBorder'
import { REPO, PROJECT_LINKS } from '../lib/projectLinks.ts'

export function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        mt: 6,
        py: 3,
        px: 2,
        textAlign: 'center',
        borderTop: '1px solid',
        borderColor: 'divider',
        color: 'text.secondary',
      }}
    >
      <Button
        variant="outlined"
        size="small"
        color="inherit"
        startIcon={<StarIcon />}
        href={REPO}
        target="_blank"
        rel="noopener"
        sx={{ mb: 2 }}
      >
        Star on GitHub
      </Button>

      <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
        {PROJECT_LINKS.map((l) => (
          <Link key={l.href} href={l.href} target="_blank" rel="noopener" underline="hover" color="inherit">
            {l.label}
          </Link>
        ))}
      </Stack>

      <Typography variant="body2" sx={{ mt: 1.5 }}>
        Maintained by{' '}
        <Link href="https://github.com/sphings79" target="_blank" rel="noopener" underline="hover">
          sphings79
        </Link>{' '}
        ·{' '}
        <Link href={REPO} target="_blank" rel="noopener" underline="hover">
          Source
        </Link>
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
        Fork of the original tool by Remko Weijnen · Original repo: github.com/rweijnen/marstek-fw-checker
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
        Unofficial community tool — not affiliated with Marstek. Shows available firmware, not whether your
        device needs updating.
      </Typography>
    </Box>
  )
}
