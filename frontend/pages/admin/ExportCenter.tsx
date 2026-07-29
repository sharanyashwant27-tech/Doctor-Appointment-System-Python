import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { adminApi } from '@services/endpoints';
import { getAccessToken } from '@services/client';

const RESOURCES = ['users', 'appointments', 'payments', 'audit_logs'];
const FORMATS = ['csv', 'xlsx', 'pdf'];

export default function ExportCenter() {
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
      <Typography variant="h4">Export center</Typography>
      <TextField select label="Resource" value={resource} onChange={(e) => setResource(e.target.value)}>
        {RESOURCES.map((r) => (
          <MenuItem key={r} value={r}>
            {r}
          </MenuItem>
        ))}
      </TextField>
      <TextField select label="Format" value={format} onChange={(e) => setFormat(e.target.value)}>
        {FORMATS.map((f) => (
          <MenuItem key={f} value={f}>
            {f.toUpperCase()}
          </MenuItem>
        ))}
      </TextField>
      <Button variant="contained" onClick={() => void download()}>
        Download
      </Button>
    </Stack>
  );
}
