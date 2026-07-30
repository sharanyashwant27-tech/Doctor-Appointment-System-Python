import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@services/endpoints';

type Row = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export default function UsersManagement() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .users()
      .then((data) => setRows(data as Row[]))
      .catch(() => setError(t('admin.users.loadFailed')));
  }, [t]);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'id', headerName: t('admin.users.colId'), width: 70 },
      { field: 'full_name', headerName: t('admin.users.colName'), flex: 1 },
      { field: 'email', headerName: t('admin.users.colEmail'), flex: 1 },
      { field: 'role', headerName: t('admin.users.colRole'), width: 120 },
      { field: 'is_active', headerName: t('admin.users.colActive'), width: 100 },
    ],
    [t],
  );

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">{t('admin.users.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
