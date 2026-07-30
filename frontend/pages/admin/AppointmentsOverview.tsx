import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Appointment, appointmentsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function AppointmentsOverview() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    appointmentsApi
      .list()
      .then(setRows)
      .catch(() => setError(t('admin.appointments.loadFailed')));
  }, [t]);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'id', headerName: t('admin.appointments.colId'), width: 70 },
      { field: 'patient_name', headerName: t('admin.appointments.colPatient'), flex: 1 },
      { field: 'doctor_name', headerName: t('admin.appointments.colDoctor'), flex: 1 },
      {
        field: 'scheduled_at',
        headerName: t('admin.appointments.colWhen'),
        flex: 1,
        valueGetter: (_v, row) => new Date(row.scheduled_at).toLocaleString(),
      },
      {
        field: 'status',
        headerName: t('admin.appointments.colStatus'),
        width: 130,
        valueGetter: (_v, row) => tStatus(t, row.status),
      },
    ],
    [t],
  );

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">{t('admin.appointments.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
