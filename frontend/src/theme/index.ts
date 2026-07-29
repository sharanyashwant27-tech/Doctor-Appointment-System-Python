import { createTheme, PaletteMode } from '@mui/material';
import { brand } from './palette';

/** MediBook MUI theme — vibrant green brand (light/dark). */
export function createAppTheme(mode: PaletteMode) {
  const isLight = mode === 'light';
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? brand.greenDeep : brand.green,
        light: brand.mint,
        dark: brand.forest,
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: isLight ? brand.forest : brand.teal,
        light: brand.ice,
        dark: '#004D40',
        contrastText: '#FFFFFF',
      },
      success: {
        main: brand.green,
        light: brand.mint,
        dark: brand.forest,
      },
      background: {
        default: isLight ? brand.wash : '#06241A',
        paper: isLight ? '#FFFFFF' : '#0C3328',
      },
      text: {
        primary: isLight ? '#0A2E22' : '#E8FBEF',
        secondary: isLight ? '#2E6B55' : '#9AD9BF',
      },
      divider: isLight ? 'rgba(0, 168, 68, 0.18)' : 'rgba(105, 240, 174, 0.16)',
    },
    typography: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      h1: { fontFamily: '"Source Serif 4", Georgia, serif' },
      h2: { fontFamily: '"Source Serif 4", Georgia, serif' },
      h3: { fontFamily: '"Source Serif 4", Georgia, serif' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isLight
              ? `radial-gradient(1200px 600px at 10% -10%, ${brand.washStrong} 0%, transparent 55%),
                 radial-gradient(900px 500px at 100% 0%, rgba(0, 200, 83, 0.14) 0%, transparent 50%),
                 linear-gradient(180deg, ${brand.wash} 0%, #F7FDF9 40%, ${brand.wash} 100%)`
              : `radial-gradient(1000px 500px at 0% 0%, rgba(0, 200, 83, 0.22) 0%, transparent 50%),
                 radial-gradient(800px 400px at 100% 10%, rgba(29, 233, 182, 0.12) 0%, transparent 45%),
                 linear-gradient(180deg, #06241A 0%, #0A2E22 100%)`,
            backgroundAttachment: 'fixed',
            minHeight: '100vh',
          },
          '::selection': {
            background: isLight ? brand.mint : brand.greenDeep,
            color: isLight ? brand.forest : '#fff',
          },
          a: {
            color: isLight ? brand.greenDeep : brand.mint,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, borderRadius: 10 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${brand.green} 0%, ${brand.greenDeep} 100%)`,
            boxShadow: '0 6px 16px rgba(0, 200, 83, 0.28)',
            '&:hover': {
              background: `linear-gradient(135deg, ${brand.mint} 0%, ${brand.green} 55%, ${brand.greenDeep} 100%)`,
              boxShadow: '0 8px 20px rgba(0, 200, 83, 0.36)',
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          colorPrimary: {
            background: isLight
              ? `linear-gradient(90deg, ${brand.greenDeep} 0%, ${brand.green} 55%, #00E676 100%)`
              : `linear-gradient(90deg, #004D40 0%, ${brand.forest} 50%, ${brand.greenDeep} 100%)`,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          colorPrimary: {
            backgroundColor: isLight ? brand.greenDeep : brand.green,
            color: '#fff',
          },
          outlined: {
            borderColor: isLight ? 'rgba(0, 168, 68, 0.45)' : 'rgba(105, 240, 174, 0.4)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: isLight ? '1px solid rgba(0, 200, 83, 0.12)' : '1px solid rgba(105, 240, 174, 0.12)',
            boxShadow: isLight
              ? '0 4px 18px rgba(0, 105, 92, 0.06)'
              : '0 4px 18px rgba(0, 0, 0, 0.35)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: isLight ? brand.greenDeep : brand.mint,
          },
        },
      },
    },
  });
}

export { brand } from './palette';
