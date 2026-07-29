import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from '@components/ThemeToggle';
import { useAuthContext } from '@context/AuthContext';

const NAV: Record<string, Array<{ to: string; label: string }>> = {
  patient: [
    { to: '/patient', label: 'Dashboard' },
    { to: '/patient/doctors', label: 'Find doctors' },
    { to: '/patient/appointments', label: 'Appointments' },
    { to: '/patient/records', label: 'Records' },
    { to: '/patient/clinical', label: 'Clinical' },
    { to: '/patient/waiting-list', label: 'Waitlist' },
    { to: '/patient/payments', label: 'Payments' },
    { to: '/patient/advanced', label: 'Advanced' },
  ],
  doctor: [
    { to: '/doctor', label: 'Dashboard' },
    { to: '/doctor/queue', label: 'Queue' },
    { to: '/doctor/availability', label: 'Availability' },
    { to: '/doctor/calendar', label: 'Calendar' },
    { to: '/doctor/records', label: 'Records' },
    { to: '/doctor/prescriptions/new', label: 'Prescribe' },
    { to: '/doctor/earnings', label: 'Earnings' },
    { to: '/doctor/advanced', label: 'Advanced' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/doctors', label: 'Doctors' },
    { to: '/admin/org', label: 'Org' },
    { to: '/admin/hospitals', label: 'Hospitals' },
    { to: '/admin/appointments', label: 'Appointments' },
    { to: '/admin/payments', label: 'Payments' },
    { to: '/admin/audit', label: 'Audit' },
    { to: '/admin/export', label: 'Export' },
  ],
};

export default function DashboardLayout({ title }: { title?: string }) {
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || 'patient';
  const links = NAV[role] || [];

  return (
    <Box minHeight="100vh" display="flex" flexDirection="column" sx={{ bgcolor: 'transparent' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Typography
            variant="h6"
            component={RouterLink}
            to={role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/patient'}
            sx={{ color: 'inherit', textDecoration: 'none', mr: 2, fontWeight: 700 }}
          >
            MediBook{title ? ` · ${title}` : ''}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, flexWrap: 'wrap' }}>
            {links.map((l) => (
              <Button
                key={l.to}
                color="inherit"
                size="small"
                component={RouterLink}
                to={l.to}
                sx={{ opacity: location.pathname === l.to ? 1 : 0.8, fontWeight: location.pathname === l.to ? 700 : 400 }}
              >
                {l.label}
              </Button>
            ))}
          </Stack>
          <Button color="inherit" size="small" component={RouterLink} to="/notifications">
            Alerts
          </Button>
          <Button color="inherit" size="small" component={RouterLink} to="/profile">
            Profile
          </Button>
          <Typography variant="body2" sx={{ mx: 1, display: { xs: 'none', md: 'block' } }}>
            {user?.full_name || user?.email || ''}
          </Typography>
          <ThemeToggle />
          <Button
            color="inherit"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
