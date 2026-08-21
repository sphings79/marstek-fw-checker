import { createTheme } from '@mui/material/styles'

// Light + dark colour schemes with a runtime toggle. Uses MUI's CSS-variable
// engine so switching is instant and the choice persists (localStorage).
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1769d6' },
        secondary: { main: '#7b3fe4' },
        success: { main: '#2e7d32' },
        warning: { main: '#ed6c02' },
        error: { main: '#d32f2f' },
        background: { default: '#f3f5f9', paper: '#ffffff' },
        text: { primary: '#1b2430', secondary: '#5b6672' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#4f9dff' },
        secondary: { main: '#9c6bff' },
        success: { main: '#4caf50' },
        warning: { main: '#ff9800' },
        error: { main: '#f4523b' },
        background: { default: '#0f1419', paper: '#1a2029' },
        text: { primary: '#e6e9ee', secondary: '#9aa4b2' },
      },
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
        root: ({ theme }) => ({
          backgroundImage: 'none',
          border: `1px solid ${theme.palette.divider}`,
        }),
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
})
