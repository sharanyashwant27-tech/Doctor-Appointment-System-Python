import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doctorsApi, patientsApi } from '@services/endpoints';
import { useAuthContext } from '@context/AuthContext';

export default function Profile() {
  const { t } = useTranslation();
  const { user, refreshMe } = useAuthContext();
  const [form, setForm] = useState({ full_name: '', phone: '', specialty: '', city: '', bio: '', address: '', blood_group: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm((f) => ({ ...f, full_name: user?.full_name || '' }));
    if (user?.role === 'patient') {
      patientsApi.me().then((p) => {
        setForm((f) => ({
          ...f,
          full_name: p.full_name || user.full_name,
          phone: p.phone || '',
          address: p.address || '',
          blood_group: p.blood_group || '',
        }));
      }).catch(() => undefined);
    }
    if (user?.role === 'doctor') {
      doctorsApi.list().then((list) => {
        const mine = list.find((d) => d.email === user.email);
        if (mine) {
          setForm((f) => ({
            ...f,
            full_name: mine.full_name || user.full_name,
            phone: mine.phone || '',
            specialty: mine.specialty,
            city: mine.city || '',
            bio: mine.bio || '',
          }));
        }
      }).catch(() => undefined);
    }
  }, [user]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      if (user?.role === 'patient') {
        await patientsApi.updateMe({
          full_name: form.full_name,
          phone: form.phone,
          address: form.address,
          blood_group: form.blood_group,
        });
      } else if (user?.role === 'doctor') {
        await doctorsApi.updateProfile({
          specialty: form.specialty,
          city: form.city,
          bio: form.bio,
        });
      }
      await refreshMe();
      setMsg(t('shared.profile.updated'));
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('shared.profile.updateFailed'));
    }
  }

  return (
    <Stack spacing={2} maxWidth={480} component="form" onSubmit={onSubmit}>
      <Typography variant="h4">{t('shared.profile.title')}</Typography>
      <Typography color="text.secondary">
        {t('shared.profile.meta', {
          email: user?.email || '',
          role: user?.role ? t(`roles.${user.role}`) : '',
        })}
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {msg && <Alert severity="success">{msg}</Alert>}
      <TextField label={t('shared.profile.fullName')} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      {(user?.role === 'patient' || user?.role === 'doctor') && (
        <TextField label={t('shared.profile.phone')} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      )}
      {user?.role === 'patient' && (
        <>
          <TextField label={t('shared.profile.address')} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <TextField label={t('shared.profile.bloodGroup')} value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
        </>
      )}
      {user?.role === 'doctor' && (
        <>
          <TextField label={t('shared.profile.specialty')} value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          <TextField label={t('shared.profile.city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField label={t('shared.profile.bio')} multiline minRows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </>
      )}
      {user?.role !== 'admin' && (
        <Button type="submit" variant="contained">
          {t('shared.profile.save')}
        </Button>
      )}
    </Stack>
  );
}
