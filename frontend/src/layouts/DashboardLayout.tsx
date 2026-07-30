import {
  AppBar,
  Box,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ThemeToggle from '@components/ThemeToggle';
import LanguageSwitcher from '@components/LanguageSwitcher';
import BrandLink from '@components/BrandLink';
import FindDoctorsNavMenu from '@components/FindDoctorsNavMenu';
import { useAuthContext } from '@context/AuthContext';
import { useState } from 'react';

type NavItem = { to: string; labelKey: string; menu?: 'find-doctors' };
const DRAWER_WIDTH = 264;

const NAV: Record<string, NavItem[]> = {
  patient: [
    { to: '/patient', labelKey: 'nav.patient.dashboard' },
    { to: '/patient/doctors', labelKey: 'nav.patient.findDoctors', menu: 'find-doctors' },
    { to: '/patient/appointments', labelKey: 'nav.patient.appointments' },
    { to: '/patient/records', labelKey: 'nav.patient.records' },
    { to: '/patient/clinical', labelKey: 'nav.patient.clinical' },
    { to: '/patient/waiting-list', labelKey: 'nav.patient.waitlist' },
    { to: '/patient/payments', labelKey: 'nav.patient.payments' },
    { to: '/patient/pharmacy', labelKey: 'nav.patient.pharmacy' },
    { to: '/patient/advanced', labelKey: 'nav.patient.advanced' },
  ],
  doctor: [
    { to: '/doctor', labelKey: 'nav.doctor.dashboard' },
    { to: '/doctor/queue', labelKey: 'nav.doctor.queue' },
    { to: '/doctor/availability', labelKey: 'nav.doctor.availability' },
    { to: '/doctor/calendar', labelKey: 'nav.doctor.calendar' },
    { to: '/doctor/records', labelKey: 'nav.doctor.records' },
    { to: '/doctor/prescriptions/new', labelKey: 'nav.doctor.prescribe' },
    { to: '/doctor/pharmacy', labelKey: 'nav.doctor.pharmacy' },
    { to: '/doctor/earnings', labelKey: 'nav.doctor.earnings' },
    { to: '/doctor/advanced', labelKey: 'nav.doctor.advanced' },
  ],
  admin: [
    { to: '/admin', labelKey: 'nav.admin.dashboard' },
    { to: '/admin/users', labelKey: 'nav.admin.users' },
    { to: '/admin/doctors', labelKey: 'nav.admin.doctors' },
    { to: '/admin/org', labelKey: 'nav.admin.org' },
    { to: '/admin/hospitals', labelKey: 'nav.admin.hospitals' },
    { to: '/admin/appointments', labelKey: 'nav.admin.appointments' },
    { to: '/admin/payments', labelKey: 'nav.admin.payments' },
    { to: '/admin/pharmacy', labelKey: 'nav.admin.pharmacy' },
    { to: '/admin/audit', labelKey: 'nav.admin.audit' },
    { to: '/admin/export', labelKey: 'nav.admin.export' },
  ],
};

export default function DashboardLayout({ titleKey }: { titleKey?: string }) {
  const { t } = useTranslation();
  const { logout, user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || 'patient';
  const links = NAV[role] || [];
  const suffix = titleKey ? t(titleKey) : undefined;

  function isActive(to: string) {
    return to === `/${role}` ? location.pathname === to : location.pathname.startsWith(to);
  }

  function closeMobileNav() {
    setMobileOpen(false);
  }

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'common.white',
        background: (theme) =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(180deg, #00695C 0%, #008A4B 58%, #004D40 100%)'
            : 'linear-gradient(180deg, #062D24 0%, #004D40 58%, #032019 100%)',
      }}
    >
      <Box sx={{ px: 2.5, py: 2.25 }}>
        <BrandLink suffix={suffix} variant="h6" sx={{ color: '#fff' }} />
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.16)' }} />

      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {user?.full_name || user?.email || ''}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)' }}>
          {suffix}
        </Typography>
      </Box>

      <List component="nav" sx={{ px: 1.5, py: 0.5, flex: 1, overflowY: 'auto' }}>
        {links.map((item) =>
          item.menu === 'find-doctors' ? (
            <FindDoctorsNavMenu
              key={item.to}
              variant="sidebar"
              active={isActive(item.to)}
              onNavigate={closeMobileNav}
            />
          ) : (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              selected={isActive(item.to)}
              onClick={closeMobileNav}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 44,
                color: 'rgba(255,255,255,0.82)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.10)', color: '#fff' },
                '&.Mui-selected': {
                  bgcolor: 'rgba(255,255,255,0.18)',
                  color: '#fff',
                  boxShadow: 'inset 3px 0 0 #A7F3D0',
                },
                '&.Mui-selected:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
              }}
            >
              <ListItemText
                primary={t(item.labelKey)}
                primaryTypographyProps={{ fontSize: 14, fontWeight: isActive(item.to) ? 700 : 500 }}
              />
            </ListItemButton>
          ),
        )}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.16)' }} />
      <List sx={{ px: 1.5, py: 1 }}>
        <ListItemButton
          component={RouterLink}
          to="/notifications"
          selected={location.pathname === '/notifications'}
          onClick={closeMobileNav}
          sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.82)' }}
        >
          <NotificationsOutlinedIcon sx={{ mr: 1.5, fontSize: 20 }} />
          <ListItemText primary={t('nav.alerts')} primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
        <ListItemButton
          component={RouterLink}
          to="/profile"
          selected={location.pathname === '/profile'}
          onClick={closeMobileNav}
          sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.82)' }}
        >
          <PersonOutlineIcon sx={{ mr: 1.5, fontSize: 20 }} />
          <ListItemText primary={t('nav.profile')} primaryTypographyProps={{ fontSize: 14 }} />
        </ListItemButton>
      </List>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 1.5, py: 1.25, bgcolor: 'rgba(0,0,0,0.12)' }}
      >
        <LanguageSwitcher contrast="light" />
        <ThemeToggle />
        <IconButton
          color="inherit"
          aria-label={t('nav.logout')}
          title={t('nav.logout')}
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          <LogoutIcon />
        </IconButton>
      </Stack>
    </Box>
  );

  return (
    <Box minHeight="100vh" sx={{ display: 'flex', bgcolor: 'transparent' }}>
      <AppBar
        position="fixed"
        color="primary"
        elevation={1}
        sx={{ display: { md: 'none' }, zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <BrandLink suffix={suffix} variant="h6" sx={{ color: '#fff' }} />
        </Toolbar>
      </AppBar>

      <Box component="aside" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobileNav}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0 },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 0 },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, pt: { xs: 7, md: 0 } }}>
        <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 3.5 }, px: { xs: 2, sm: 3, lg: 4 } }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
