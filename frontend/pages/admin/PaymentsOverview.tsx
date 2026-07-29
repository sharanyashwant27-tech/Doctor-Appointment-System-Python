import { Alert, Button, Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { Payment, paymentsApi } from '@services/endpoints';

export default function PaymentsOverview() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      setRows(await paymentsApi.list());
    } catch {
      setError('Failed to load payments');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'invoice_number', headerName: 'Invoice', flex: 1 },
    { field: 'amount', headerName: 'Amount', width: 120 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'patient_name', headerName: 'Patient', flex: 1 },
    {
      field: 'actions',
      type: 'actions',
      width: 100,
      getActions: (params) =>
        params.row.status === 'success'
          ? [
              <GridActionsCellItem
                key="refund"
                label="Refund"
                onClick={async () => {
                  await paymentsApi.refund(params.row.id);
                  await load();
                }}
                showInMenu
              />,
            ]
          : [],
    },
  ];

  return (
    <Stack spacing={2} height={520}>
      <Typography variant="h4">Payments</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <DataGrid rows={rows} columns={columns} pageSizeOptions={[10, 25]} initialState={{ pagination: { paginationModel: { pageSize: 10 } } }} />
    </Stack>
  );
}
