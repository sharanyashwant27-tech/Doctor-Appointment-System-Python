import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import BrandLink from '@components/BrandLink';
import { useAuthContext } from '@context/AuthContext';
import { dashboardPathForUser } from '@/utils/navigation';

export default function Landing() {
  const { user, isAuthenticated } = useAuthContext();
  const dash = dashboardPathForUser(user);

  return (
    <Box
      className="mb-landing-hero"
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      sx={{
        color: '#fff',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 120%, rgba(255,255,255,0.18) 0%, transparent 45%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Stack spacing={2} maxWidth={560} textAlign="center" sx={{ position: 'relative', zIndex: 1 }}>
        <BrandLink
          variant="h1"
          sx={{
            fontSize: { xs: '2.75rem', md: '3.75rem' },
            fontWeight: 700,
            textShadow: '0 8px 28px rgba(0, 77, 64, 0.35)',
          }}
        />
        <Typography variant="h6" sx={{ opacity: 0.95, fontWeight: 400 }}>
          Book trusted doctors, manage appointments, and keep health records in one place.
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
          {isAuthenticated ? (
            <Button
              component={RouterLink}
              to={dash}
              variant="contained"
              size="large"
              sx={{
                bgcolor: '#fff',
                color: '#00695C',
                '&:hover': { bgcolor: '#E8FBEF', color: '#004D40' },
              }}
            >
              Go to dashboard
            </Button>
          ) : (
            <>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: '#fff',
                  color: '#00695C',
                  '&:hover': { bgcolor: '#E8FBEF', color: '#004D40' },
                }}
              >
                Sign in
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                size="large"
                sx={{
                  color: '#fff',
                  borderColor: 'rgba(255,255,255,0.75)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.16)' },
                }}
              >
                Register
              </Button>
            </>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
