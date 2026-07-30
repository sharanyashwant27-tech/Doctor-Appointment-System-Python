import { Alert, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { advancedApi, modulesApi } from '@services/endpoints';

export default function HospitalsAdmin() {
  const { t } = useTranslation();
  const [hospitals, setHospitals] = useState<Array<Record<string, unknown>>>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string; hospital_id?: number }>>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function reload() {
    setHospitals(await advancedApi.hospitals());
    setBranches(await modulesApi.branches());
  }

  useEffect(() => {
    reload().catch(() => setErr(t('admin.hospitals.loadFailed')));
  }, [t]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('admin.hospitals.title')}</Typography>
      <Typography color="text.secondary">{t('admin.hospitals.subtitle')}</Typography>
      {msg && <Alert severity="success">{msg}</Alert>}
      {err && <Alert severity="error">{err}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label={t('admin.hospitals.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField label={t('admin.hospitals.code')} value={code} onChange={(e) => setCode(e.target.value)} />
        <TextField label={t('admin.hospitals.city')} value={city} onChange={(e) => setCity(e.target.value)} />
        <Button
          variant="contained"
          onClick={async () => {
            await advancedApi.createHospital({ name, code, city });
            setName('');
            setCode('');
            setCity('');
            await reload();
            setMsg(t('admin.hospitals.created'));
          }}
        >
          {t('admin.hospitals.add')}
        </Button>
      </Stack>

      {hospitals.map((h) => (
        <Card key={String(h.id)}>
          <CardContent>
            <Typography variant="h6">
              {String(h.name)} ({String(h.code)})
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {String(h.city || '')} · {String(h.address || '')}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
              {branches.map((b) => (
                <Button
                  key={b.id}
                  size="small"
                  variant="outlined"
                  onClick={async () => {
                    await advancedApi.attachBranch(b.id, Number(h.id));
                    await reload();
                    setMsg(t('admin.hospitals.attached', { name: b.name }));
                  }}
                >
                  {t('admin.hospitals.attach', { name: b.name })}
                </Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
