import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';
import BrandLink from '@components/BrandLink';

export default function AuthLayout() {
  return (
    <Box
      minHeight="100vh"
      className="mb-auth-hero"
      sx={{
        py: 6,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.18) 100%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box textAlign="center" sx={{ mb: 2 }}>
          <BrandLink
            variant="h3"
            sx={{
              color: '#fff',
              fontWeight: 700,
              textShadow: '0 4px 18px rgba(0,0,0,0.25)',
            }}
          />
        </Box>
        <Box
          className="mb-green-panel"
          sx={{
            borderRadius: 3,
            p: 0.5,
            boxShadow: '0 16px 40px rgba(0, 77, 64, 0.28)',
          }}
        >
          <Outlet />
        </Box>
      </Container>
    </Box>
  );
}
