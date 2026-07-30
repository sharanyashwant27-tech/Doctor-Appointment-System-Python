import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi
      .audit()
      .then((data) => setRows(data as Row[]))
      .catch(() => setError(t('admin.audit.loadFailed')));
  }, [t]);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'id', headerName: t('admin.audit.colId'), width: 70 },
      { field: 'action', headerName: t('admin.audit.colAction'), flex: 1 },
      { field: 'entity_type', headerName: t('admin.audit.colEntity'), width: 140 },
      { field: 'entity_id', headerName: t('admin.audit.colEntityId'), width: 120 },
      { field: 'actor_user_id', headerName: t('admin.audit.colActor'), width: 100 },
      {
        field: 'created_at',
        headerName: t('admin.audit.colWhen'),
        flex: 1,
        valueGetter: (_v, row) => (row.created_at ? new Date(row.created_at).toLocaleString() : ''),
      },
    ],
    [t],
  );

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">{t('admin.audit.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
