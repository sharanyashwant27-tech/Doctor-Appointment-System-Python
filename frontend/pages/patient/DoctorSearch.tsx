import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Doctor, doctorsApi } from '@services/endpoints';
import { useDebounce } from '@hooks/useDebounce';
import { DOCTOR_SPECIALTIES } from '@components/FindDoctorsNavMenu';

function specialtyLabel(t: (k: string) => string, specialty: string) {
  if (specialty === 'Other') return t('findDoctors.otherSpecialty');
  const key = `specialty.${specialty}`;
  const translated = t(key);
  return translated === key ? specialty : translated;
}

export default function DoctorSearch() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('specialty') || '';
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | false>(initialSpecialty || false);
  const dq = useDebounce(q, 300);

  useEffect(() => {
    doctorsApi
      .list({ q: dq || undefined, city: city || undefined, limit: 200 } as Record<string, string | number>)
      .then(setDoctors)
      .catch(() => setError(t('patient.doctors.loadFailed')));
  }, [dq, city, t]);

  useEffect(() => {
    const s = searchParams.get('specialty');
    if (s) setExpanded(s);
  }, [searchParams]);

  const grouped = useMemo(() => {
    const map = new Map<string, Doctor[]>();
    for (const d of doctors) {
      const key = d.specialty || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    }
    const fromData = Array.from(map.keys());
    const ordered = DOCTOR_SPECIALTIES.filter((s) => fromData.includes(s));
    const extras = fromData.filter((s) => !(DOCTOR_SPECIALTIES as readonly string[]).includes(s)).sort();
    return [...ordered, ...extras].map((cat) => [cat, map.get(cat) || []] as [string, Doctor[]]);
  }, [doctors]);

  const filteredGrouped = useMemo(() => {
    if (!dq && !city) return grouped;
    return grouped
      .map(([cat, list]) => {
        const next = list.filter((d) => {
          const hay = `${d.full_name || ''} ${d.specialty} ${d.city || ''} ${d.bio || ''}`.toLowerCase();
          const okQ = !dq || hay.includes(dq.toLowerCase());
          const okCity = !city || (d.city || '').toLowerCase().includes(city.toLowerCase());
          return okQ && okCity;
        });
        return [cat, next] as [string, Doctor[]];
      })
      .filter(([, list]) => list.length > 0);
  }, [grouped, dq, city]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.doctors.title')}</Typography>
      <Typography color="text.secondary">{t('patient.doctors.subtitle')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          label={t('patient.doctors.search')}
          fullWidth
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <TextField
          label={t('patient.doctors.city')}
          fullWidth
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('patient.doctors.cityPlaceholder')}
        />
      </Stack>

      {filteredGrouped.length === 0 && !error && (
        <Alert severity="info">{t('patient.doctors.noMatch')}</Alert>
      )}

      <Box>
        {filteredGrouped.map(([cat, list]) => (
          <Accordion
            key={cat}
            disableGutters
            expanded={expanded === cat}
            onChange={(_, isExpanded) => {
              setExpanded(isExpanded ? cat : false);
              if (isExpanded) {
                setSearchParams({ specialty: cat });
              } else if (searchParams.get('specialty') === cat) {
                setSearchParams({});
              }
            }}
            sx={{
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '12px !important',
              overflow: 'hidden',
              '&:before': { display: 'none' },
              bgcolor: 'background.paper',
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', pr: 1 }}>
                <Typography fontWeight={700} sx={{ flexGrow: 1 }}>
                  {specialtyLabel(t, cat)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {list.length === 1
                    ? t('patient.doctors.countOne', { count: list.length })
                    : t('patient.doctors.countMany', { count: list.length })}
                </Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <List disablePadding>
                {list.map((d) => (
                  <ListItemButton
                    key={d.id}
                    component={RouterLink}
                    to={`/patient/doctors/${d.id}`}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      border: '1px solid',
                      borderColor: 'rgba(0, 200, 83, 0.14)',
                    }}
                  >
                    <ListItemText
                      primary={d.full_name || t('findDoctors.doctorFallback', { id: d.id })}
                      secondary={t('patient.doctors.metaLine', {
                        city: d.city || t('common.emDash'),
                        years: d.experience_years,
                        rating: Number(d.rating_avg || 0).toFixed(1),
                        fee: d.consultation_fee,
                      })}
                    />
                    <Button size="small" variant="contained" component="span">
                      {t('patient.doctors.view')}
                    </Button>
                  </ListItemButton>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    </Stack>
  );
}
