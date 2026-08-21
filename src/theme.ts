import { createTheme } from '@mui/material/styles'

// Modern dark theme, tuned to feel close to the Venus Control tool so the two
// sibling apps look like one family.
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4f9dff' },
    secondary: { main: '#9c6bff' },
    success: { main: '#4caf50' },
    warning: { main: '#ff9800' },
    error: { main: '#f4523b' },
    background: {
      default: '#0f1419',
      paper: '#1a2029',
    },
    text: {
      primary: '#e6e9ee',
      secondary: '#9aa4b2',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.9rem', fontWeight: 700 },
    h2: { fontSize: '1.35rem', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.06)' },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
})
