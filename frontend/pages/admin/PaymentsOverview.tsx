import { Alert, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Payment, paymentsApi } from '@services/endpoints';
import { tStatus } from '@/i18n';

export default function PaymentsOverview() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setRows(await paymentsApi.list());
    } catch {
      setError(t('admin.payments.loadFailed'));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'id', headerName: t('admin.payments.colId'), width: 70 },
      { field: 'invoice_number', headerName: t('admin.payments.colInvoice'), flex: 1 },
      { field: 'amount', headerName: t('admin.payments.colAmount'), width: 120 },
      {
        field: 'status',
        headerName: t('admin.payments.colStatus'),
        width: 120,
        valueGetter: (_v, row) => tStatus(t, row.status),
      },
      {
        field: 'gateway',
        headerName: t('admin.payments.colMode'),
        width: 100,
        valueGetter: (_v, row) => (row.payment_mode || row.gateway || 'upi').toUpperCase(),
      },
      { field: 'patient_name', headerName: t('admin.payments.colPatient'), flex: 1 },
      {
        field: 'actions',
        type: 'actions',
        width: 100,
        getActions: (params) =>
          params.row.status === 'success'
            ? [
                <GridActionsCellItem
                  key="refund"
                  label={t('admin.payments.refund')}
                  onClick={async () => {
                    await paymentsApi.refund(params.row.id);
                    await load();
                  }}
                  showInMenu
                />,
              ]
            : [],
      },
    ],
    [t],
  );

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">{t('admin.payments.title')}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
