import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@services/endpoints';
import { getAccessToken } from '@services/client';

const RESOURCES = [
  { value: 'users', labelKey: 'admin.export.users' },
  { value: 'appointments', labelKey: 'admin.export.appointments' },
  { value: 'payments', labelKey: 'admin.export.payments' },
  { value: 'audit_logs', labelKey: 'admin.export.auditLogs' },
] as const;

const FORMATS = [
  { value: 'csv', labelKey: 'admin.export.csv' },
  { value: 'xlsx', labelKey: 'admin.export.xlsx' },
  { value: 'pdf', labelKey: 'admin.export.pdf' },
] as const;

export default function ExportCenter() {
  const { t } = useTranslation();
  const [resource, setResource] = useState('users');
  const [format, setFormat] = useState('csv');

  async function download() {
    const token = getAccessToken();
    const url = adminApi.exportUrl(resource, format);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token || ''}` } });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${resource}.${format}`;
    a.click();
  }

  return (
    <Stack spacing={2} maxWidth={420}>
      <Typography variant="h4">{t('admin.export.title')}</Typography>
      <TextField
        select
        label={t('admin.export.resource')}
        value={resource}
        onChange={(e) => setResource(e.target.value)}
      >
        {RESOURCES.map((r) => (
          <MenuItem key={r.value} value={r.value}>
            {t(r.labelKey)}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label={t('admin.export.format')}
        value={format}
        onChange={(e) => setFormat(e.target.value)}
      >
        {FORMATS.map((f) => (
          <MenuItem key={f.value} value={f.value}>
            {t(f.labelKey)}
          </MenuItem>
        ))}
      </TextField>
      <Button variant="contained" onClick={() => void download()}>
        {t('admin.export.download')}
      </Button>
    </Stack>
  );
}
