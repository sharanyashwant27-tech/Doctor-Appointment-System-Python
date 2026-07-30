import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { modulesApi } from '@services/endpoints';

export default function ClinicalHistory() {
  const { t } = useTranslation();
  const [allergies, setAllergies] = useState<Array<{ id: number; name: string; severity?: string }>>([]);
  const [vaccines, setVaccines] = useState<Array<{ id: number; vaccine_name: string; dose?: string }>>([]);
  const [labs, setLabs] = useState<Array<{ id: number; title: string }>>([]);
  const [allergyName, setAllergyName] = useState('');
  const [vaccineName, setVaccineName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setAllergies(await modulesApi.allergies());
      setVaccines(await modulesApi.vaccinations());
      setLabs(await modulesApi.labReports());
    } catch {
      setError(t('patient.clinical.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.clinical.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="h6">{t('patient.clinical.allergies')}</Typography>
      {allergies.map((a) => (
        <Typography key={a.id}>
          {a.name} {a.severity ? `(${a.severity})` : ''}
        </Typography>
      ))}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('patient.clinical.allergy')}
          value={allergyName}
          onChange={(e) => setAllergyName(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={async () => {
            await modulesApi.addAllergy({ name: allergyName });
            setAllergyName('');
            await load();
          }}
        >
          {t('patient.clinical.add')}
        </Button>
      </Stack>
      <Typography variant="h6">{t('patient.clinical.vaccinations')}</Typography>
      {vaccines.map((v) => (
        <Typography key={v.id}>
          {v.vaccine_name} {v.dose || ''}
        </Typography>
      ))}
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          label={t('patient.clinical.vaccine')}
          value={vaccineName}
          onChange={(e) => setVaccineName(e.target.value)}
        />
        <Button
          variant="contained"
          onClick={async () => {
            await modulesApi.addVaccination({ vaccine_name: vaccineName });
            setVaccineName('');
            await load();
          }}
        >
          {t('patient.clinical.add')}
        </Button>
      </Stack>
      <Typography variant="h6">{t('patient.clinical.labReports')}</Typography>
      {labs.map((l) => (
        <Typography key={l.id}>{l.title}</Typography>
      ))}
      <Typography variant="body2" color="text.secondary">
        {t('patient.clinical.uploadHint')}
      </Typography>
    </Stack>
  );
}
