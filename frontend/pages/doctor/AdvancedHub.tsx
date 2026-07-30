import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { advancedApi, Appointment, appointmentsApi, recordsApi } from '@services/endpoints';
import { downloadAuthed, openAuthedPdf, qrImageUrl } from '@services/download';
import { tStatus } from '@/i18n';

function Panel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function DoctorAdvanced() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [threads, setThreads] = useState<Array<{ id: number; patient_id: number; doctor_id: number }>>([]);
  const [threadId, setThreadId] = useState<number | ''>('');
  const [messages, setMessages] = useState<Array<{ id?: number; body: string; sender_user_id: number }>>([]);
  const [body, setBody] = useState('');
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [selectedApptId, setSelectedApptId] = useState<number | ''>('');
  const [qrToken, setQrToken] = useState('');
  const [checkInResult, setCheckInResult] = useState<Record<string, unknown> | null>(null);
  const [patientId, setPatientId] = useState('');
  const [certType, setCertType] = useState('sick_leave');
  const [diagnosis, setDiagnosis] = useState('Viral fever');
  const [certId, setCertId] = useState<number | null>(null);
  const [signature, setSignature] = useState(
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iNjAiPjx0ZXh0IHg9IjEwIiB5PSI0MCIgZm9udC1zaXplPSIyOCI+RHIgU2lnbjwvdGV4dD48L3N2Zz4=',
  );
  const [rxId, setRxId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reload = useCallback(async () => {
    const [threadList, appointmentList] = await Promise.all([
      advancedApi.chatThreads(),
      appointmentsApi.list(),
    ]);
    setThreads(threadList);
    setAppts(appointmentList);
    if (appointmentList.length && !selectedApptId) {
      setSelectedApptId(appointmentList[0].id);
      setPatientId(String(appointmentList[0].patient_id));
    }
  }, [selectedApptId]);

  useEffect(() => {
    reload().catch(() => setErr(t('doctor.advanced.loadFailed')));
    recordsApi
      .list()
      .then((recs) => {
        const rx = recs.flatMap((r) => r.prescriptions || []);
        if (rx[0]) setRxId(String(rx[0].id));
      })
      .catch(() => undefined);
  }, []);

  const selectedAppt = useMemo(
    () => appts.find((a) => a.id === selectedApptId) || null,
    [appts, selectedApptId],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('doctor.advanced.title')}</Typography>
      <Typography color="text.secondary">{t('doctor.advanced.subtitle')}</Typography>
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
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
        <Tab label={t('doctor.advanced.tab.chat')} />
        <Tab label={t('doctor.advanced.tab.qr')} />
        <Tab label={t('doctor.advanced.tab.video')} />
        <Tab label={t('doctor.advanced.tab.certificates')} />
        <Tab label={t('doctor.advanced.tab.erx')} />
      </Tabs>

      <Panel value={tab} index={0}>
        <Stack spacing={2} maxWidth={640}>
          <TextField
            select
            label={t('doctor.advanced.thread')}
            value={threadId}
            onChange={async (e) => {
              const id = Number(e.target.value);
              setThreadId(id);
              try {
                setMessages(await advancedApi.chatMessages(id));
              } catch (ex) {
                setErr(errMsg(ex, t('doctor.advanced.loadMessagesFailed')));
              }
            }}
            fullWidth
            helperText={
              threads.length
                ? t('doctor.advanced.threadHelper')
                : t('doctor.advanced.threadHelperEmpty')
            }
          >
            {threads.map((th) => (
              <MenuItem key={th.id} value={th.id}>
                {t('doctor.advanced.threadItem', { id: th.id, patientId: th.patient_id })}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ maxHeight: 260, overflow: 'auto', bgcolor: 'background.paper', p: 1, borderRadius: 2 }}>
            {messages.map((m, i) => (
              <Typography key={m.id ?? `${m.sender_user_id}-${i}`} variant="body2" sx={{ mb: 0.5 }}>
                {t('doctor.advanced.userLine', { id: m.sender_user_id, body: m.body })}
              </Typography>
            ))}
            {!messages.length && (
              <Typography variant="body2" color="text.secondary">
                {t('doctor.advanced.noMessages')}
              </Typography>
            )}
          </Box>
          <TextField
            label={t('doctor.advanced.reply')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            disabled={!threadId || !body.trim() || busy}
            onClick={async () => {
              try {
                await advancedApi.postChat(Number(threadId), body);
                setBody('');
                setMessages(await advancedApi.chatMessages(Number(threadId)));
                setMsg(t('doctor.advanced.messageSent'));
              } catch (e) {
                setErr(errMsg(e, t('doctor.advanced.sendFailed')));
              }
            }}
          >
            {t('doctor.advanced.send')}
          </Button>
          <Button size="small" onClick={() => reload().catch(() => undefined)}>
            {t('doctor.advanced.refreshThreads')}
          </Button>
        </Stack>
      </Panel>

      <Panel value={tab} index={1}>
        <Stack spacing={2} maxWidth={560}>
          <TextField
            select
            label={t('doctor.advanced.loadQrFromAppt')}
            value={selectedApptId}
            onChange={async (e) => {
              const id = Number(e.target.value);
              setSelectedApptId(id);
              const appt = appts.find((a) => a.id === id);
              if (appt) setPatientId(String(appt.patient_id));
              try {
                const qr = await appointmentsApi.qr(id);
                setQrToken(String(qr.qr_token || ''));
                setMsg(t('doctor.advanced.loadedQr', { id }));
              } catch (ex) {
                setErr(errMsg(ex, t('doctor.advanced.loadQrFailed')));
              }
            }}
            fullWidth
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                #{a.id} · {a.patient_name || `patient ${a.patient_id}`} · {tStatus(t, a.status)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={t('doctor.advanced.scanQrToken')}
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            fullWidth
            helperText={t('doctor.advanced.scanQrHelper')}
          />
          {qrToken && (
            <Box
              component="img"
              alt={t('doctor.advanced.qrPreviewAlt')}
              src={qrImageUrl(qrToken.startsWith('medibook:') ? qrToken : `medibook:checkin:${qrToken}`)}
              sx={{ width: 180, height: 180, bgcolor: '#fff', p: 1, borderRadius: 2 }}
            />
          )}
          <Button
            variant="contained"
            disabled={!qrToken.trim() || busy}
            onClick={async () => {
              try {
                const token = qrToken.includes(':') ? qrToken.split(':').pop() || qrToken : qrToken;
                const r = await appointmentsApi.checkIn(token);
                setCheckInResult(r as Record<string, unknown>);
                setMsg(t('doctor.advanced.checkedIn'));
                await reload();
              } catch (e) {
                setErr(errMsg(e, t('doctor.advanced.checkInFailed')));
              }
            }}
          >
            {t('doctor.advanced.checkIn')}
          </Button>
          {checkInResult && (
            <Card>
              <CardContent>
                <Typography variant="body2" component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(checkInResult, null, 2)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={2}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            select
            label={t('doctor.advanced.appointment')}
            value={selectedApptId}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedApptId(id);
              const appt = appts.find((a) => a.id === id);
              if (appt) setPatientId(String(appt.patient_id));
            }}
            fullWidth
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                #{a.id} · patient {a.patient_id} · {tStatus(t, a.status)}
                {a.consultation_mode === 'online' ? ' · online' : ''}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!selectedApptId || busy}
            onClick={async () => {
              try {
                const room = await advancedApi.videoRoom(Number(selectedApptId));
                setVideoUrl(room.meeting_url);
                window.open(room.meeting_url, '_blank', 'noopener,noreferrer');
                setMsg(t('doctor.advanced.jitsiOpened'));
              } catch (e) {
                setErr(errMsg(e, t('doctor.advanced.videoFailed')));
              }
            }}
          >
            {t('doctor.advanced.openConsult')}
          </Button>
          {videoUrl && (
            <>
              <Button href={videoUrl} target="_blank" rel="noreferrer" variant="outlined">
                {t('doctor.advanced.joinJitsi')}
              </Button>
              <Box
                component="iframe"
                title={t('doctor.advanced.videoIframeTitle')}
                src={videoUrl}
                sx={{ width: '100%', height: 360, border: 0, borderRadius: 2 }}
                allow="camera; microphone; fullscreen; display-capture"
              />
            </>
          )}
          {selectedAppt?.meeting_url && !videoUrl && (
            <Alert severity="info">
              {t('doctor.advanced.savedMeeting')}{' '}
              <a href={selectedAppt.meeting_url} target="_blank" rel="noreferrer">
                {selectedAppt.meeting_url}
              </a>
            </Alert>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={3}>
        <Stack spacing={2} maxWidth={520}>
          <TextField
            label={t('doctor.advanced.patientProfileId')}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            helperText={t('doctor.advanced.patientIdHelper')}
          />
          <TextField
            select
            label={t('doctor.advanced.certType')}
            value={certType}
            onChange={(e) => setCertType(e.target.value)}
          >
            <MenuItem value="fitness">{t('doctor.advanced.fitness')}</MenuItem>
            <MenuItem value="sick_leave">{t('doctor.advanced.sickLeave')}</MenuItem>
            <MenuItem value="travel">{t('doctor.advanced.travel')}</MenuItem>
          </TextField>
          <TextField
            label={t('doctor.advanced.diagnosis')}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              const pid = Number(patientId || selectedAppt?.patient_id);
              if (!pid) {
                setErr(t('doctor.advanced.patientIdRequired'));
                return;
              }
              try {
                const c = await advancedApi.createCertificate({
                  patient_id: pid,
                  cert_type: certType,
                  diagnosis,
                  remarks: t('doctor.advanced.certRemarks'),
                  appointment_id: selectedApptId ? Number(selectedApptId) : undefined,
                });
                setCertId(c.id);
                setMsg(t('doctor.advanced.certCreated', { id: c.id }));
              } catch (e) {
                setErr(errMsg(e, t('doctor.advanced.certFailed')));
              }
            }}
          >
            {t('doctor.advanced.generateCert')}
          </Button>
          {certId && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                onClick={async () => {
                  try {
                    await openAuthedPdf(`/api/v1/advanced/certificates/${certId}.pdf`);
                  } catch (e) {
                    setErr(errMsg(e, t('doctor.advanced.pdfOpenFailed')));
                  }
                }}
              >
                {t('doctor.advanced.openPdf')}
              </Button>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    await downloadAuthed(
                      `/api/v1/advanced/certificates/${certId}.pdf`,
                      `certificate-${certId}.pdf`,
                    );
                    setMsg(t('doctor.advanced.certDownloaded'));
                  } catch (e) {
                    setErr(errMsg(e, t('doctor.advanced.downloadFailed')));
                  }
                }}
              >
                {t('doctor.advanced.downloadPdf')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Panel>

      <Panel value={tab} index={4}>
        <Stack spacing={2} maxWidth={560}>
          <TextField
            label={t('doctor.advanced.prescriptionId')}
            value={rxId}
            onChange={(e) => setRxId(e.target.value)}
            helperText={t('doctor.advanced.rxHelper')}
          />
          <TextField
            label={t('doctor.advanced.signature')}
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            multiline
            minRows={2}
          />
          <Button
            variant="contained"
            disabled={!rxId || busy}
            onClick={async () => {
              try {
                const bundle = await advancedApi.erxBundle(Number(rxId), signature);
                setMsg(t('doctor.advanced.erxBundled', { signed: bundle.signed }));
                if (bundle.pdf_base64) {
                  const a = document.createElement('a');
                  a.href = `data:application/pdf;base64,${bundle.pdf_base64}`;
                  a.download = `eprescription-${rxId}.pdf`;
                  a.click();
                }
              } catch (e) {
                setErr(errMsg(e, t('doctor.advanced.erxFailed')));
              }
            }}
          >
            {t('doctor.advanced.signErx')}
          </Button>
        </Stack>
      </Panel>
    </Stack>
  );
}
