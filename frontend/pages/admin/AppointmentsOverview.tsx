import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { Appointment, appointmentsApi } from '@services/endpoints';

export default function AppointmentsOverview() {
  const [rows, setRows] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    appointmentsApi
      .list()
      .then(setRows)
      .catch(() => setError('Failed to load appointments'));
  }, []);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'patient_name', headerName: 'Patient', flex: 1 },
    { field: 'doctor_name', headerName: 'Doctor', flex: 1 },
    { field: 'scheduled_at', headerName: 'When', flex: 1, valueGetter: (_v, row) => new Date(row.scheduled_at).toLocaleString() },
    { field: 'status', headerName: 'Status', width: 130 },
  ];

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">Appointments</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
