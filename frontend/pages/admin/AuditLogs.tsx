import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { adminApi } from '@services/endpoints';

type Row = {
  id: number;
  actor_user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  created_at?: string;
};

export default function AuditLogs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .audit()
      .then((data) => setRows(data as Row[]))
      .catch(() => setError('Failed to load audit logs'));
  }, []);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'action', headerName: 'Action', flex: 1 },
    { field: 'entity_type', headerName: 'Entity', width: 140 },
    { field: 'entity_id', headerName: 'Entity ID', width: 120 },
    { field: 'actor_user_id', headerName: 'Actor', width: 100 },
    {
      field: 'created_at',
      headerName: 'When',
      flex: 1,
      valueGetter: (_v, row) => (row.created_at ? new Date(row.created_at).toLocaleString() : ''),
    },
  ];

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">Audit logs</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
