import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PharmacyMedicine,
  PharmacyOrder,
  PharmacyStats,
  pharmacyApi,
  recordsApi,
} from '@services/endpoints';
import { tStatus } from '@/i18n';

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

function Panel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

type StatKind = 'medicines' | 'low' | 'pending' | 'sales' | 'orders' | 'expiring';

export default function AdminPharmacy() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low' | 'expiring'>('all');
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'pending' | 'today'>('all');
  const [stats, setStats] = useState<PharmacyStats | null>(null);
  const [meds, setMeds] = useState<PharmacyMedicine[]>([]);
  const [suppliers, setSuppliers] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [sku, setSku] = useState('');
  const [medName, setMedName] = useState('');
  const [mrp, setMrp] = useState('50');
  const [stockQty, setStockQty] = useState('100');
  const [reorder, setReorder] = useState('20');
  const [needsRx, setNeedsRx] = useState(false);

  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');

  const [purchaseMedId, setPurchaseMedId] = useState<number | ''>('');
  const [purchaseQty, setPurchaseQty] = useState('50');

  const [rxId, setRxId] = useState('');
  const [rxMatches, setRxMatches] = useState<Array<Record<string, unknown>>>([]);

  const [cart, setCart] = useState<Array<{ medicine_id: number; name: string; qty: number; mrp: number }>>([]);
  const [cartMedId, setCartMedId] = useState<number | ''>('');
  const [cartQty, setCartQty] = useState('1');
  const [customerName, setCustomerName] = useState('');

  const reload = useCallback(async () => {
    const [s, m, sup, o] = await Promise.all([
      pharmacyApi.stats(),
      pharmacyApi.medicines(q ? { q } : undefined),
      pharmacyApi.suppliers(),
      pharmacyApi.orders(),
    ]);
    setStats(s);
    setMeds(m);
    setSuppliers(sup);
    setOrders(o);
    if (m.length && !purchaseMedId) setPurchaseMedId(m[0].id);
    if (m.length && !cartMedId) setCartMedId(m[0].id);
  }, [q, purchaseMedId, cartMedId]);

  useEffect(() => {
    reload().catch((e) => setErr(errMsg(e, t('admin.pharmacy.loadFailed'))));
  }, []);

  const lowStock = useMemo(() => meds.filter((m) => m.low_stock), [meds]);
  const cartTotal = useMemo(() => cart.reduce((s, c) => s + c.mrp * c.qty, 0), [cart]);

  const visibleMeds = useMemo(() => {
    const soon = Date.now() + 60 * 24 * 60 * 60 * 1000;
    if (inventoryFilter === 'low') return meds.filter((m) => m.low_stock);
    if (inventoryFilter === 'expiring') {
      return meds.filter((m) => m.expiry_date && new Date(m.expiry_date).getTime() <= soon);
    }
    return meds;
  }, [meds, inventoryFilter]);

  const visibleOrders = useMemo(() => {
    if (ordersFilter === 'pending') {
      return orders.filter((o) => o.status === 'pending' || o.status === 'ready');
    }
    if (ordersFilter === 'today') {
      const today = new Date().toDateString();
      return orders.filter((o) => {
        const when = o.dispensed_at || o.created_at;
        return when && new Date(when).toDateString() === today;
      });
    }
    return orders;
  }, [orders, ordersFilter]);

  function goToCard(kind: StatKind) {
    switch (kind) {
      case 'medicines':
        setInventoryFilter('all');
        setTab(0);
        break;
      case 'low':
        setInventoryFilter('low');
        setTab(0);
        break;
      case 'pending':
        setOrdersFilter('pending');
        setTab(2);
        break;
      case 'sales':
      case 'orders':
        setOrdersFilter('today');
        setTab(2);
        break;
      case 'expiring':
        setInventoryFilter('expiring');
        setTab(0);
        break;
      default:
        break;
    }
  }

  const statCards: Array<{ kind: StatKind; label: string; value: string | number }> = stats
    ? [
        { kind: 'medicines', label: t('admin.pharmacy.medicines'), value: stats.medicines_count },
        { kind: 'low', label: t('admin.pharmacy.lowStock'), value: stats.low_stock_count },
        { kind: 'pending', label: t('admin.pharmacy.pendingOrders'), value: stats.pending_orders },
        { kind: 'sales', label: t('admin.pharmacy.todaySales'), value: `₹${stats.today_sales}` },
        { kind: 'orders', label: t('admin.pharmacy.todayOrders'), value: stats.today_orders },
        { kind: 'expiring', label: t('admin.pharmacy.expiringSoon'), value: stats.expiring_soon },
      ]
    : [];

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('admin.pharmacy.title')}</Typography>
      <Typography color="text.secondary">{t('admin.pharmacy.subtitle')}</Typography>
      {msg && (
        <Alert severity="success" onClose={() => setMsg('')}>
          {msg}
        </Alert>
      )}
      {err && (
        <Alert severity="error" onClose={() => setErr('')}>
          {err}
        </Alert>
      )}

      {stats && (
        <Grid container spacing={2}>
          {statCards.map(({ kind, label, value }) => (
            <Grid item xs={6} sm={4} md={2} key={kind}>
              <Card
                onClick={() => goToCard(kind)}
                sx={{
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, transform 0.15s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="h5" fontWeight={700}>
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {lowStock.length > 0 && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => goToCard('low')}>
              {t('admin.pharmacy.view')}
            </Button>
          }
        >
          {t('admin.pharmacy.lowStockAlert', {
            items: lowStock.map((m) => `${m.name} (${m.stock_qty})`).join(', '),
          })}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
        <Tab label={t('admin.pharmacy.tabInventory')} />
        <Tab label={t('admin.pharmacy.tabSuppliers')} />
        <Tab label={t('admin.pharmacy.tabOrders')} />
        <Tab label={t('admin.pharmacy.tabPos')} />
      </Tabs>

      <Panel value={tab} index={0}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              size="small"
              label={t('admin.pharmacy.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={() => reload().catch((e) => setErr(errMsg(e, t('admin.pharmacy.refreshFailed'))))}
            >
              {t('admin.pharmacy.searchRefresh')}
            </Button>
            <TextField
              select
              size="small"
              label={t('admin.pharmacy.filter')}
              value={inventoryFilter}
              onChange={(e) => setInventoryFilter(e.target.value as 'all' | 'low' | 'expiring')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">{t('admin.pharmacy.filterAllMeds')}</MenuItem>
              <MenuItem value="low">{t('admin.pharmacy.filterLowStock')}</MenuItem>
              <MenuItem value="expiring">{t('admin.pharmacy.filterExpiring')}</MenuItem>
            </TextField>
          </Stack>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('admin.pharmacy.addMedicine')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                <TextField size="small" label={t('admin.pharmacy.sku')} value={sku} onChange={(e) => setSku(e.target.value)} />
                <TextField
                  size="small"
                  label={t('admin.pharmacy.name')}
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                />
                <TextField size="small" label={t('admin.pharmacy.mrp')} value={mrp} onChange={(e) => setMrp(e.target.value)} />
                <TextField
                  size="small"
                  label={t('admin.pharmacy.initialStock')}
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                />
                <TextField
                  size="small"
                  label={t('admin.pharmacy.reorderLevel')}
                  value={reorder}
                  onChange={(e) => setReorder(e.target.value)}
                />
                <TextField
                  select
                  size="small"
                  label={t('admin.pharmacy.needsRx')}
                  value={needsRx ? 'yes' : 'no'}
                  onChange={(e) => setNeedsRx(e.target.value === 'yes')}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="no">{t('common.no')}</MenuItem>
                  <MenuItem value="yes">{t('common.yes')}</MenuItem>
                </TextField>
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      await pharmacyApi.createMedicine({
                        sku,
                        name: medName,
                        mrp: Number(mrp),
                        stock_qty: Number(stockQty),
                        reorder_level: Number(reorder),
                        requires_prescription: needsRx,
                      });
                      setSku('');
                      setMedName('');
                      setMsg(t('admin.pharmacy.medicineAdded'));
                      await reload();
                    } catch (e) {
                      setErr(errMsg(e, t('admin.pharmacy.createFailed')));
                    }
                  }}
                >
                  {t('admin.pharmacy.add')}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('admin.pharmacy.receiveStock')}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <TextField
                  select
                  size="small"
                  label={t('admin.pharmacy.medicine')}
                  value={purchaseMedId}
                  onChange={(e) => setPurchaseMedId(Number(e.target.value))}
                  sx={{ minWidth: 220 }}
                >
                  {meds.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {t('admin.pharmacy.medicineStockOption', { name: m.name, qty: m.stock_qty })}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label={t('admin.pharmacy.qty')}
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(e.target.value)}
                />
                <Button
                  variant="contained"
                  disabled={!purchaseMedId}
                  onClick={async () => {
                    try {
                      await pharmacyApi.purchase({
                        medicine_id: Number(purchaseMedId),
                        qty: Number(purchaseQty),
                      });
                      setMsg(t('admin.pharmacy.stockReceived'));
                      await reload();
                    } catch (e) {
                      setErr(errMsg(e, t('admin.pharmacy.purchaseFailed')));
                    }
                  }}
                >
                  {t('admin.pharmacy.receive')}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('admin.pharmacy.colSku')}</TableCell>
                <TableCell>{t('admin.pharmacy.colName')}</TableCell>
                <TableCell>{t('admin.pharmacy.colStock')}</TableCell>
                <TableCell>{t('admin.pharmacy.colMrp')}</TableCell>
                <TableCell>{t('admin.pharmacy.colExpiry')}</TableCell>
                <TableCell>{t('admin.pharmacy.colFlags')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleMeds.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.sku}</TableCell>
                  <TableCell>
                    {m.name}
                    {m.generic_name ? ` (${m.generic_name})` : ''}
                  </TableCell>
                  <TableCell>{m.stock_qty}</TableCell>
                  <TableCell>₹{m.mrp}</TableCell>
                  <TableCell>{m.expiry_date || t('common.emDash')}</TableCell>
                  <TableCell>
                    {m.low_stock && (
                      <Chip size="small" color="warning" label={tStatus(t, 'low')} sx={{ mr: 0.5 }} />
                    )}
                    {m.requires_prescription && <Chip size="small" label={tStatus(t, 'rx')} />}
                  </TableCell>
                </TableRow>
              ))}
              {visibleMeds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography color="text.secondary">{t('admin.pharmacy.noMedsFilter')}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Stack>
      </Panel>

      <Panel value={tab} index={1}>
        <Stack spacing={2} maxWidth={640}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              label={t('admin.pharmacy.supplierName')}
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
            />
            <TextField
              size="small"
              label={t('admin.pharmacy.phone')}
              value={supPhone}
              onChange={(e) => setSupPhone(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={async () => {
                try {
                  await pharmacyApi.createSupplier({ name: supName, phone: supPhone });
                  setSupName('');
                  setSupPhone('');
                  setMsg(t('admin.pharmacy.supplierAdded'));
                  await reload();
                } catch (e) {
                  setErr(errMsg(e, t('admin.pharmacy.supplierFailed')));
                }
              }}
            >
              {t('admin.pharmacy.addSupplier')}
            </Button>
          </Stack>
          {suppliers.map((s) => (
            <Card key={String(s.id)}>
              <CardContent>
                <Typography fontWeight={600}>{String(s.name)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {String(s.contact || t('common.emDash'))} · {String(s.phone || t('common.emDash'))} ·{' '}
                  {String(s.email || '')}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Panel>

      <Panel value={tab} index={2}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <TextField
              size="small"
              label={t('admin.pharmacy.prescriptionId')}
              value={rxId}
              onChange={(e) => setRxId(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={async () => {
                try {
                  setRxMatches(await pharmacyApi.matchRx(Number(rxId)));
                } catch (e) {
                  setErr(errMsg(e, t('admin.pharmacy.matchFailed')));
                }
              }}
            >
              {t('admin.pharmacy.matchCatalog')}
            </Button>
            <Button
              variant="contained"
              disabled={!rxId || !rxMatches.length}
              onClick={async () => {
                try {
                  const items = rxMatches
                    .map((row) => {
                      const matched = row.matched_medicine as PharmacyMedicine | null;
                      if (!matched) return null;
                      return { medicine_id: matched.id, qty: matched.pack_size || 1 };
                    })
                    .filter(Boolean) as Array<{ medicine_id: number; qty: number }>;
                  if (!items.length) {
                    setErr(t('admin.pharmacy.noCatalogMatches'));
                    return;
                  }
                  const o = await pharmacyApi.dispenseFromRx({
                    prescription_id: Number(rxId),
                    items,
                    mark_paid: true,
                  });
                  setMsg(
                    t('admin.pharmacy.dispensedOrder', {
                      orderNumber: o.order_number,
                      amount: o.total_amount,
                    }),
                  );
                  setRxMatches([]);
                  await reload();
                } catch (e) {
                  setErr(errMsg(e, t('admin.pharmacy.dispenseFailed')));
                }
              }}
            >
              {t('admin.pharmacy.dispenseMatched')}
            </Button>
            <Button
              size="small"
              onClick={async () => {
                try {
                  const recs = await recordsApi.list();
                  const rx = recs.flatMap((r) => r.prescriptions || []);
                  if (rx[0]) {
                    setRxId(String(rx[0].id));
                    setMsg(t('admin.pharmacy.loadedRx', { id: rx[0].id }));
                  } else setErr(t('admin.pharmacy.noRxInRecords'));
                } catch (e) {
                  setErr(errMsg(e, t('admin.pharmacy.loadRecordsFailed')));
                }
              }}
            >
              {t('admin.pharmacy.loadSampleRx')}
            </Button>
          </Stack>
          {rxMatches.map((row, i) => (
            <Typography key={i} variant="body2">
              {t('admin.pharmacy.rxMatchLine', {
                name: String(row.rx_name),
                dose: row.rx_dose ? String(row.rx_dose) : '',
                matched: (row.matched_medicine as PharmacyMedicine | null)?.name || t('admin.pharmacy.noMatch'),
              })}
            </Typography>
          ))}

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h6">{t('admin.pharmacy.orders')}</Typography>
            <TextField
              select
              size="small"
              label={t('admin.pharmacy.filter')}
              value={ordersFilter}
              onChange={(e) => setOrdersFilter(e.target.value as 'all' | 'pending' | 'today')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="all">{t('admin.pharmacy.filterAllOrders')}</MenuItem>
              <MenuItem value="pending">{t('admin.pharmacy.filterPendingReady')}</MenuItem>
              <MenuItem value="today">{t('admin.pharmacy.filterToday')}</MenuItem>
            </TextField>
          </Stack>
          {visibleOrders.length === 0 && (
            <Typography color="text.secondary">{t('admin.pharmacy.noOrdersFilter')}</Typography>
          )}
          {visibleOrders.map((o) => (
            <Card key={o.id}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography fontWeight={600}>
                    {o.order_number} · ₹{o.total_amount}
                  </Typography>
                  <Chip
                    size="small"
                    label={tStatus(t, o.status)}
                    color={o.status === 'pending' ? 'warning' : 'success'}
                  />
                  <Chip size="small" variant="outlined" label={tStatus(t, o.payment_status)} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {o.patient_name || t('admin.pharmacy.walkIn')} · Rx #{o.prescription_id || t('common.emDash')} ·{' '}
                  {o.items.map((it) => `${it.medicine_name}×${it.qty}`).join(', ')}
                </Typography>
                {['pending', 'ready'].includes(o.status) && (
                  <Button
                    size="small"
                    sx={{ mt: 1 }}
                    variant="contained"
                    onClick={async () => {
                      try {
                        await pharmacyApi.dispenseOrder(o.id);
                        setMsg(t('admin.pharmacy.orderDispensed', { orderNumber: o.order_number }));
                        await reload();
                      } catch (e) {
                        setErr(errMsg(e, t('admin.pharmacy.dispenseFailed')));
                      }
                    }}
                  >
                    {t('admin.pharmacy.dispenseNow')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Panel>

      <Panel value={tab} index={3}>
        <Stack spacing={2} maxWidth={640}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label={t('admin.pharmacy.medicine')}
              value={cartMedId}
              onChange={(e) => setCartMedId(Number(e.target.value))}
              sx={{ minWidth: 220 }}
            >
              {meds
                .filter((m) => !m.requires_prescription)
                .map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {t('admin.pharmacy.posOption', { name: m.name, mrp: m.mrp, qty: m.stock_qty })}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              size="small"
              label={t('admin.pharmacy.qty')}
              value={cartQty}
              onChange={(e) => setCartQty(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={() => {
                const m = meds.find((x) => x.id === cartMedId);
                if (!m) return;
                setCart((prev) => {
                  const existing = prev.find((p) => p.medicine_id === m.id);
                  if (existing) {
                    return prev.map((p) =>
                      p.medicine_id === m.id ? { ...p, qty: p.qty + Number(cartQty) } : p,
                    );
                  }
                  return [...prev, { medicine_id: m.id, name: m.name, qty: Number(cartQty), mrp: m.mrp }];
                });
              }}
            >
              {t('admin.pharmacy.addToCart')}
            </Button>
          </Stack>
          <TextField
            size="small"
            label={t('admin.pharmacy.customerName')}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          {cart.map((c) => (
            <Typography key={c.medicine_id} variant="body2">
              {t('admin.pharmacy.cartLine', {
                name: c.name,
                qty: c.qty,
                total: (c.mrp * c.qty).toFixed(2),
              })}
            </Typography>
          ))}
          <Typography fontWeight={700}>{t('admin.pharmacy.total', { amount: cartTotal.toFixed(2) })}</Typography>
          <Button
            variant="contained"
            disabled={!cart.length}
            onClick={async () => {
              try {
                const o = await pharmacyApi.walkIn({
                  items: cart.map((c) => ({ medicine_id: c.medicine_id, qty: c.qty })),
                  customer_name: customerName || undefined,
                  mark_paid: true,
                });
                setMsg(t('admin.pharmacy.saleDone', { orderNumber: o.order_number, amount: o.total_amount }));
                setCart([]);
                setCustomerName('');
                await reload();
              } catch (e) {
                setErr(errMsg(e, t('admin.pharmacy.saleFailed')));
              }
            }}
          >
            {t('admin.pharmacy.completeSale')}
          </Button>
        </Stack>
      </Panel>
    </Stack>
  );
}
