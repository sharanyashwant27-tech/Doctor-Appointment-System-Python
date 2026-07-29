import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Doctor, doctorsApi } from '@services/endpoints';
import { useDebounce } from '@hooks/useDebounce';

const SPECIALTY_CATEGORIES = [
  'All',
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
];

export default function DoctorSearch() {
  const [q, setQ] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [city, setCity] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState('');
  const dq = useDebounce(q, 300);

  useEffect(() => {
    doctorsApi
      .list({ q: dq || undefined, specialty: specialty || undefined, city: city || undefined } as Record<string, string>)
      .then(setDoctors)
      .catch(() => setError('Failed to load doctors'));
  }, [dq, specialty, city]);

  const grouped = useMemo(() => {
    const map = new Map<string, Doctor[]>();
    for (const d of doctors) {
      const key = d.specialty || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [doctors]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: doctors.length };
    for (const d of doctors) {
      const s = d.specialty || 'Other';
      c[s] = (c[s] || 0) + 1;
    }
    return c;
  }, [doctors]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Find doctors</Typography>
      <Typography color="text.secondary">
        Browse by specialty category — medicine, cardiology, dermatology, and more.
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {SPECIALTY_CATEGORIES.map((cat) => {
          const selected = (cat === 'All' && !specialty) || specialty === cat;
          const count = cat === 'All' ? undefined : counts[cat];
          return (
            <Chip
              key={cat}
              label={count != null ? `${cat} (${count})` : cat}
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => setSpecialty(cat === 'All' ? '' : cat)}
              clickable
            />
          );
        })}
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField label="Search name / keyword" fullWidth value={q} onChange={(e) => setQ(e.target.value)} />
        <TextField label="City" fullWidth value={city} onChange={(e) => setCity(e.target.value)} placeholder="Mumbai, Delhi…" />
      </Stack>

      {doctors.length === 0 && !error && (
        <Alert severity="info">No doctors match these filters. Try another specialty or clear search.</Alert>
      )}

      {grouped.map(([cat, list]) => (
        <Stack key={cat} spacing={1.5}>
          <Typography variant="h6" sx={{ mt: 1 }}>
            {cat}
            <Typography component="span" color="text.secondary" variant="body2" sx={{ ml: 1 }}>
              {list.length} doctor{list.length === 1 ? '' : 's'}
            </Typography>
          </Typography>
          {list.map((d) => (
            <Card key={d.id}>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography variant="h6">{d.full_name || `Doctor #${d.id}`}</Typography>
                    <Typography color="text.secondary">
                      {d.specialty} · {d.city || '—'} · {d.experience_years}+ yrs · ★ {d.rating_avg?.toFixed?.(1) ?? d.rating_avg}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {d.qualification ? `${d.qualification} · ` : ''}
                      {d.bio || 'Verified MediBook clinician'}
                      {d.is_verified ? ' · Verified' : ' · Pending verification'}
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="primary" sx={{ whiteSpace: 'nowrap' }}>
                    ₹{d.consultation_fee}
                  </Typography>
                </Stack>
              </CardContent>
              <CardActions>
                <Button component={RouterLink} to={`/patient/doctors/${d.id}`} variant="contained">
                  View & book
                </Button>
              </CardActions>
            </Card>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
