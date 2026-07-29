import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { adminApi } from '@services/endpoints';

type Row = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export default function UsersManagement() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .users()
      .then((data) => setRows(data as Row[]))
      .catch(() => setError('Failed to load users'));
  }, []);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'full_name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'Email', flex: 1 },
    { field: 'role', headerName: 'Role', width: 120 },
    { field: 'is_active', headerName: 'Active', width: 100 },
  ];

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">Users</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
