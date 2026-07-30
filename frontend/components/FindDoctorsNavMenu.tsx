import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import { useNavigate } from 'react-router-dom';
import { Doctor, doctorsApi } from '@services/endpoints';

export const DOCTOR_SPECIALTIES = [
  'Cardiology',
  'General Medicine',
  'Internal Medicine',
  'Dermatology',
  'Orthopedics',
  'Neurology',
  'Pediatrics',
  'Gynecology',
  'Obstetrics',
  'ENT',
  'Ophthalmology',
  'Gastroenterology',
  'Pulmonology',
  'Psychiatry',
  'Urology',
  'Oncology',
  'Endocrinology',
  'Nephrology',
  'Dentistry',
] as const;

/** App-bar dropdown: Find doctors → specialty → doctor names. */
export default function FindDoctorsNavMenu() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [subAnchor, setSubAnchor] = useState<null | HTMLElement>(null);
  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);

  const open = Boolean(anchorEl);
  const subOpen = Boolean(subAnchor);

  useEffect(() => {
    doctorsApi
      .list({ limit: 200 } as Record<string, string | number>)
      .then(setDoctors)
      .catch(() => setDoctors([]));
  }, []);

  const bySpecialty = useMemo(() => {
    const map = new Map<string, Doctor[]>();
    for (const d of doctors) {
      const key = d.specialty || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    }
    return map;
  }, [doctors]);

  const specialties = useMemo(() => {
    const fromData = Array.from(bySpecialty.keys());
    const ordered = DOCTOR_SPECIALTIES.filter((s) => fromData.includes(s));
    const extras = fromData.filter((s) => !DOCTOR_SPECIALTIES.includes(s as (typeof DOCTOR_SPECIALTIES)[number]));
    return [...ordered, ...extras.sort()];
  }, [bySpecialty]);

  function closeAll() {
    setAnchorEl(null);
    setSubAnchor(null);
    setActiveSpecialty(null);
  }

  async function openSpecialty(event: React.MouseEvent<HTMLElement>, specialty: string) {
    setActiveSpecialty(specialty);
    setSubAnchor(event.currentTarget);
    if (!bySpecialty.has(specialty) || (bySpecialty.get(specialty)?.length ?? 0) === 0) {
      setLoading(true);
      try {
        const list = await doctorsApi.list({ specialty, limit: 50 } as Record<string, string | number>);
        setDoctors((prev) => {
          const others = prev.filter((d) => d.specialty !== specialty);
          return [...others, ...list];
        });
      } finally {
        setLoading(false);
      }
    }
  }

  const doctorsInActive = activeSpecialty ? bySpecialty.get(activeSpecialty) || [] : [];

  return (
    <>
      <Button
        color="inherit"
        size="small"
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{ fontWeight: open ? 700 : 400, opacity: open ? 1 : 0.9 }}
      >
        Find doctors
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeAll}
        MenuListProps={{ dense: true, sx: { minWidth: 220 } }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem
          onClick={() => {
            closeAll();
            navigate('/patient/doctors');
          }}
        >
          <ListItemText primary="Browse all specialties" secondary="Open find doctors page" />
        </MenuItem>
        <Divider />
        {specialties.map((specialty) => (
          <MenuItem
            key={specialty}
            selected={activeSpecialty === specialty}
            onClick={(e) => openSpecialty(e, specialty)}
            sx={{ pr: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <LocalHospitalOutlinedIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary={specialty}
              secondary={`${bySpecialty.get(specialty)?.length ?? 0} doctor(s)`}
            />
            <ArrowRightIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />
          </MenuItem>
        ))}
        {specialties.length === 0 && (
          <MenuItem disabled>
            <Typography variant="body2">No specialties loaded</Typography>
          </MenuItem>
        )}
      </Menu>

      <Menu
        anchorEl={subAnchor}
        open={subOpen}
        onClose={() => {
          setSubAnchor(null);
          setActiveSpecialty(null);
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        MenuListProps={{ dense: true, sx: { minWidth: 260, maxHeight: 420 } }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle2" color="primary">
            {activeSpecialty}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Select a doctor
          </Typography>
        </Box>
        <Divider />
        {loading && (
          <MenuItem disabled>
            <CircularProgress size={18} sx={{ mr: 1 }} /> Loading…
          </MenuItem>
        )}
        {!loading &&
          doctorsInActive.map((d) => (
            <MenuItem
              key={d.id}
              onClick={() => {
                closeAll();
                navigate(`/patient/doctors/${d.id}`);
              }}
            >
              <ListItemText
                primary={d.full_name || `Doctor #${d.id}`}
                secondary={`${d.city || '—'} · ₹${d.consultation_fee} · ★ ${Number(d.rating_avg || 0).toFixed(1)}`}
              />
            </MenuItem>
          ))}
        {!loading && doctorsInActive.length === 0 && (
          <MenuItem
            onClick={() => {
              closeAll();
              navigate(`/patient/doctors?specialty=${encodeURIComponent(activeSpecialty || '')}`);
            }}
          >
            <ListItemText primary="No doctors listed" secondary="Open category page" />
          </MenuItem>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            closeAll();
            navigate(`/patient/doctors?specialty=${encodeURIComponent(activeSpecialty || '')}`);
          }}
        >
          <ListItemText primary={`View all in ${activeSpecialty}`} />
        </MenuItem>
      </Menu>
    </>
  );
}
