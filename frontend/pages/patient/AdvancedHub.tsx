import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Rating,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { advancedApi, Appointment, appointmentsApi, Doctor, doctorsApi } from '@services/endpoints';
import { downloadAuthed, qrImageUrl } from '@services/download';
import { tStatus } from '@/i18n';

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 2 }}>{children}</Box>;
}

function errMsg(e: unknown, fallback: string) {
  const ax = e as { response?: { data?: { message?: string; detail?: string } } };
  return ax.response?.data?.message || ax.response?.data?.detail || fallback;
}

export default function PatientAdvanced() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [symptoms, setSymptoms] = useState('chest pain and shortness of breath');
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [recs, setRecs] = useState<Array<Record<string, unknown>>>([]);
  const [voice, setVoice] = useState('Book cardiology tomorrow for chest pain');
  const [voiceResult, setVoiceResult] = useState<Record<string, unknown> | null>(null);
  const [assistantMsg, setAssistantMsg] = useState('I have a fever and cough');
  const [assistantReply, setAssistantReply] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [rating, setRating] = useState<number | null>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [chatLog, setChatLog] = useState<Array<{ id?: number; body: string; sender_user_id: number }>>([]);
  const [chatBody, setChatBody] = useState('');
  const [reminders, setReminders] = useState<Array<Record<string, unknown>>>([]);
  const [medName, setMedName] = useState('Amlodipine');
  const [medTime, setMedTime] = useState('09:00');
  const [policies, setPolicies] = useState<Array<Record<string, unknown>>>([]);
  const [ocrText, setOcrText] = useState(
    'Hemoglobin: 13.5 g/dL\nWBC: 6.8\nGlucose fasting: 95 mg/dL\nImpression: Within normal limits.',
  );
  const [ocrFile, setOcrFile] = useState('blood_report.pdf');
  const [ocrOut, setOcrOut] = useState<Record<string, unknown> | null>(null);
  const [appts, setAppts] = useState<Appointment[]>([]);
  const [selectedApptId, setSelectedApptId] = useState<number | ''>('');
  const [videoUrl, setVideoUrl] = useState('');
  const [qrPayload, setQrPayload] = useState<Record<string, unknown> | null>(null);
  const [calendarStatus, setCalendarStatus] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [googleCalendarUrl, setGoogleCalendarUrl] = useState(
    'https://calendar.google.com/calendar/u/0/r/settings/export',
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const reloadAppts = useCallback(async () => {
    const a = await appointmentsApi.list();
    setAppts(a);
    if (a.length && !selectedApptId) setSelectedApptId(a[0].id);
    return a;
  }, [selectedApptId]);

  useEffect(() => {
    doctorsApi
      .list({ limit: 100 } as Record<string, string | number>)
      .then((d) => {
        setDoctors(d);
        if (d[0] && !doctorId) setDoctorId(d[0].id);
      })
      .catch(() => undefined);
    advancedApi.reminders().then(setReminders).catch(() => undefined);
    advancedApi.policies().then(setPolicies).catch(() => undefined);
    advancedApi
      .calendarStatus()
      .then((s) => {
        setCalendarConnected(Boolean(s.connected));
        if (s.google_calendar_url) setGoogleCalendarUrl(String(s.google_calendar_url));
        setCalendarStatus(
          s.connected ? t('patient.advanced.calendarLinked') : t('patient.advanced.calendarNotConnected'),
        );
      })
      .catch(() => undefined);
    reloadAppts().catch(() => undefined);
  }, []);

  const selectedAppt = useMemo(
    () => appts.find((a) => a.id === selectedApptId) || null,
    [appts, selectedApptId],
  );

  const listeningSupported = useMemo(
    () => typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window),
    [],
  );

  async function runTriage() {
    setErr('');
    setBusy(true);
    try {
      const triageResult = await advancedApi.checkSymptoms(symptoms);
      setTriage(triageResult);
      setRecs(await advancedApi.recommend({ symptoms, limit: 5 }));
      setMsg(t('patient.advanced.symptomComplete'));
    } catch (e) {
      setErr(errMsg(e, t('patient.advanced.symptomFailed')));
    } finally {
      setBusy(false);
    }
  }

  async function bookDoctor(doctor_id: number, scheduled_at?: string, reason?: string, online = false) {
    setBusy(true);
    setErr('');
    try {
      const when =
        scheduled_at ||
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const appt = await appointmentsApi.book({
        doctor_id,
        scheduled_at: when,
        reason: reason || symptoms || t('patient.advanced.defaultReason'),
        consultation_mode: online ? 'online' : 'in_person',
      });
      await reloadAppts();
      setSelectedApptId(appt.id);
      setMsg(
        online
          ? t('patient.advanced.bookedOnline', { id: appt.id })
          : t('patient.advanced.booked', { id: appt.id }),
      );
      return appt;
    } catch (e) {
      setErr(errMsg(e, t('patient.advanced.bookingFailed')));
      return null;
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      SpeechRecognition?: new () => SpeechRecognitionLike;
    };
    type SpeechRecognitionLike = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: ((ev: { error?: string }) => void) | null;
      start: () => void;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setErr(t('patient.advanced.speechUnsupported'));
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN';
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setVoice(text);
      advancedApi.voiceParse(text).then(setVoiceResult).catch(() => setErr(t('patient.advanced.voiceParseFailed')));
    };
    rec.onerror = () => setErr(t('patient.advanced.voiceCaptureFailed'));
    rec.start();
    setMsg(t('patient.advanced.listening'));
  }

  async function confirmVoiceBooking() {
    if (!voiceResult) return;
    setBusy(true);
    setErr('');
    try {
      const specialty = String(voiceResult.suggested_specialty || '');
      const when = voiceResult.suggested_datetime ? String(voiceResult.suggested_datetime) : undefined;
      const recList = await advancedApi.recommend({ symptoms: voice || specialty, limit: 1 });
      const top = recList[0];
      if (!top?.doctor_id) {
        setErr(t('patient.advanced.noMatchingDoctor'));
        return;
      }
      await bookDoctor(Number(top.doctor_id), when, t('patient.advanced.voiceBookingReason', { voice }), false);
      setRecs(recList);
    } catch (e) {
      setErr(errMsg(e, t('patient.advanced.voiceBookingFailed')));
    } finally {
      setBusy(false);
    }
  }

  async function startVideo() {
    if (!selectedApptId) {
      setErr(t('patient.advanced.selectApptFirst'));
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const room = await advancedApi.videoRoom(Number(selectedApptId));
      setVideoUrl(room.meeting_url);
      setMsg(t('patient.advanced.videoReady'));
      window.open(room.meeting_url, '_blank', 'noopener,noreferrer');
      await reloadAppts();
    } catch (e) {
      setErr(errMsg(e, t('patient.advanced.videoFailed')));
    } finally {
      setBusy(false);
    }
  }

  async function bookOnlineAndJoin() {
    const cardiology = doctors.find((d) => /cardio/i.test(d.specialty)) || doctors[0];
    if (!cardiology) {
      setErr(t('patient.advanced.noDoctors'));
      return;
    }
    const appt = await bookDoctor(cardiology.id, undefined, t('patient.advanced.onlineConsultReason'), true);
    if (!appt) return;
    setBusy(true);
    try {
      const room = await advancedApi.videoRoom(appt.id);
      setVideoUrl(room.meeting_url);
      window.open(room.meeting_url, '_blank', 'noopener,noreferrer');
      setMsg(t('patient.advanced.onlineBooked'));
    } catch (e) {
      setErr(errMsg(e, t('patient.advanced.bookedVideoFailed')));
    } finally {
      setBusy(false);
    }
  }

  async function showQr() {
    if (!selectedApptId) {
      setErr(t('patient.advanced.selectApptQr'));
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const qr = await appointmentsApi.qr(Number(selectedApptId));
      setQrPayload(qr);
      setMsg(t('patient.advanced.qrReady', { id: selectedApptId }));
    } catch (e) {
      setErr(errMsg(e, t('patient.advanced.qrFailed')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">{t('patient.advanced.title')}</Typography>
      <Typography color="text.secondary">{t('patient.advanced.subtitle')}</Typography>
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

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons allowScrollButtonsMobile>
        <Tab label={t('patient.advanced.tab.symptomAi')} />
        <Tab label={t('patient.advanced.tab.voiceBook')} />
        <Tab label={t('patient.advanced.tab.assistant')} />
        <Tab label={t('patient.advanced.tab.chat')} />
        <Tab label={t('patient.advanced.tab.videoQr')} />
        <Tab label={t('patient.advanced.tab.reminders')} />
        <Tab label={t('patient.advanced.tab.insurance')} />
        <Tab label={t('patient.advanced.tab.ocr')} />
        <Tab label={t('patient.advanced.tab.reviews')} />
        <Tab label={t('patient.advanced.tab.calendar')} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            label={t('patient.advanced.symptomsLabel')}
            multiline
            minRows={3}
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />
          <Button variant="contained" disabled={busy} onClick={runTriage}>
            {t('patient.advanced.checkSymptoms')}
          </Button>
          {triage && (
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {t('patient.advanced.primary', {
                    specialty: (triage.primary as { specialty: string }).specialty,
                  })}
                </Typography>
                <Typography variant="body2">{(triage.primary as { advice: string }).advice}</Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  {String(triage.disclaimer)}
                </Typography>
              </CardContent>
            </Card>
          )}
          {recs.map((r) => (
            <Card key={String(r.doctor_id)}>
              <CardContent>
                <Typography fontWeight={600}>
                  {String(r.full_name)} · {String(r.specialty)}
                </Typography>
                <Typography variant="body2">
                  {t('patient.advanced.scoreLine', {
                    score: String(r.score),
                    fee: String(r.consultation_fee),
                    rating: String(r.rating_avg),
                  })}
                </Typography>
                <Typography variant="caption" display="block">
                  {String(r.reason)}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busy}
                    onClick={() => bookDoctor(Number(r.doctor_id), undefined, symptoms)}
                  >
                    {t('patient.advanced.bookThisDoctor')}
                  </Button>
                  <Button size="small" component={RouterLink} to={`/patient/doctors/${r.doctor_id}`}>
                    {t('patient.advanced.viewProfile')}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            label={t('patient.advanced.voiceTranscript')}
            multiline
            minRows={2}
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            helperText={
              listeningSupported ? t('patient.advanced.voiceHelperChrome') : t('patient.advanced.voiceHelperType')
            }
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" onClick={startVoice} disabled={!listeningSupported || busy}>
              {t('patient.advanced.speak')}
            </Button>
            <Button
              variant="contained"
              disabled={busy}
              onClick={async () => {
                try {
                  setVoiceResult(await advancedApi.voiceParse(voice));
                  setMsg(t('patient.advanced.voiceParsed'));
                } catch (e) {
                  setErr(errMsg(e, t('patient.advanced.parseFailed')));
                }
              }}
            >
              {t('patient.advanced.parseIntent')}
            </Button>
            <Button variant="contained" color="secondary" disabled={!voiceResult || busy} onClick={confirmVoiceBooking}>
              {t('patient.advanced.confirmBook')}
            </Button>
          </Stack>
          {voiceResult && (
            <Alert severity="info">
              {t('patient.advanced.voiceResult', {
                specialty: String(voiceResult.suggested_specialty),
                when: String(voiceResult.suggested_datetime || t('common.emDash')),
                hint: String(voiceResult.doctor_name_hint || t('common.emDash')),
              })}
            </Alert>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            label={t('patient.advanced.askAssistant')}
            value={assistantMsg}
            onChange={(e) => setAssistantMsg(e.target.value)}
            multiline
            minRows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                (async () => {
                  try {
                    const r = await advancedApi.assistant(assistantMsg);
                    setAssistantReply(r.reply);
                  } catch (ex) {
                    setErr(errMsg(ex, t('patient.advanced.assistantFailed')));
                  }
                })();
              }
            }}
          />
          <Button
            variant="contained"
            disabled={busy || !assistantMsg.trim()}
            onClick={async () => {
              try {
                const r = await advancedApi.assistant(assistantMsg);
                setAssistantReply(r.reply);
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.assistantFailed')));
              }
            }}
          >
            {t('common.send')}
          </Button>
          {assistantReply && <Alert severity="success">{assistantReply}</Alert>}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            select
            label={t('patient.advanced.doctor')}
            value={doctorId}
            onChange={(e) => setDoctorId(Number(e.target.value))}
            fullWidth
          >
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.full_name || d.specialty} (#{d.id})
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!doctorId || busy}
            onClick={async () => {
              try {
                const thread = await advancedApi.openThread(Number(doctorId));
                setThreadId(thread.id);
                setChatLog(await advancedApi.chatMessages(thread.id));
                setMsg(t('patient.advanced.chatOpen', { id: thread.id }));
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.chatOpenFailed')));
              }
            }}
          >
            {t('patient.advanced.openChat')}
          </Button>
          {threadId && (
            <>
              <Divider />
              <Box sx={{ maxHeight: 240, overflow: 'auto', bgcolor: 'background.paper', p: 1, borderRadius: 2 }}>
                {chatLog.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {t('patient.advanced.noMessages')}
                  </Typography>
                )}
                {chatLog.map((m, i) => (
                  <Typography key={m.id ?? `${m.sender_user_id}-${i}`} variant="body2" sx={{ mb: 0.5 }}>
                    {t('patient.advanced.userLine', { id: m.sender_user_id, body: m.body })}
                  </Typography>
                ))}
              </Box>
              <TextField
                label={t('patient.advanced.message')}
                value={chatBody}
                onChange={(e) => setChatBody(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                disabled={!chatBody.trim() || busy}
                onClick={async () => {
                  try {
                    await advancedApi.postChat(threadId, chatBody);
                    setChatBody('');
                    setChatLog(await advancedApi.chatMessages(threadId));
                  } catch (e) {
                    setErr(errMsg(e, t('patient.advanced.sendFailed')));
                  }
                }}
              >
                {t('common.send')}
              </Button>
            </>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <Stack spacing={2} maxWidth={720}>
          <TextField
            select
            label={t('patient.advanced.appointment')}
            value={selectedApptId}
            onChange={(e) => setSelectedApptId(Number(e.target.value))}
            fullWidth
            helperText={
              appts.length ? t('patient.advanced.apptHelper') : t('patient.advanced.apptHelperEmpty')
            }
          >
            {appts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                #{a.id} · {tStatus(t, a.status)} · {a.doctor_name || t('patient.advanced.doctor')} ·{' '}
                {a.scheduled_at?.slice(0, 16) || ''}
                {a.consultation_mode === 'online' ? t('patient.advanced.onlineSuffix') : ''}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" disabled={busy || !selectedApptId} onClick={startVideo}>
              {t('patient.advanced.startVideo')}
            </Button>
            <Button variant="outlined" disabled={busy} onClick={bookOnlineAndJoin}>
              {t('patient.advanced.bookOnlineJoin')}
            </Button>
            <Button variant="outlined" disabled={busy || !selectedApptId} onClick={showQr}>
              {t('patient.advanced.showQr')}
            </Button>
            <Button
              size="small"
              onClick={() => reloadAppts().catch(() => setErr(t('patient.advanced.refreshFailed')))}
            >
              {t('patient.advanced.refreshAppts')}
            </Button>
          </Stack>
          {videoUrl && (
            <Stack spacing={1}>
              <Button href={videoUrl} target="_blank" rel="noreferrer" variant="contained" color="secondary">
                {t('patient.advanced.openVideoJitsi')}
              </Button>
              <Box
                component="iframe"
                title={t('patient.advanced.videoIframeTitle')}
                src={videoUrl}
                sx={{ width: '100%', height: 360, border: 0, borderRadius: 2, bgcolor: '#000' }}
                allow="camera; microphone; fullscreen; display-capture"
              />
            </Stack>
          )}
          {selectedAppt?.meeting_url && !videoUrl && (
            <Alert severity="info">
              {t('patient.advanced.existingMeeting')}{' '}
              <a href={selectedAppt.meeting_url} target="_blank" rel="noreferrer">
                {selectedAppt.meeting_url}
              </a>
            </Alert>
          )}
          {qrPayload && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  {t('patient.advanced.checkinQr', { token: String(qrPayload.qr_token || '') })}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('patient.advanced.checkinHint', {
                    token: String(qrPayload.token_number ?? t('common.emDash')),
                  })}
                </Typography>
                <Box
                  component="img"
                  alt={t('patient.advanced.appointmentQrAlt')}
                  src={qrImageUrl(String(qrPayload.checkin_payload || qrPayload.qr_token || ''))}
                  sx={{ width: 220, height: 220, display: 'block', bgcolor: '#fff', p: 1, borderRadius: 2 }}
                />
                <Typography variant="caption" display="block" sx={{ mt: 1, wordBreak: 'break-all' }}>
                  {String(qrPayload.checkin_payload || qrPayload.qr_token)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <Stack spacing={2} maxWidth={480}>
          <TextField
            label={t('patient.advanced.medicine')}
            value={medName}
            onChange={(e) => setMedName(e.target.value)}
          />
          <TextField
            label={t('patient.advanced.timeHhmm')}
            value={medTime}
            onChange={(e) => setMedTime(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              try {
                await advancedApi.createReminder({
                  medicine_name: medName,
                  schedule_time: medTime.length === 5 ? `${medTime}:00` : medTime,
                });
                setReminders(await advancedApi.reminders());
                setMsg(t('patient.advanced.reminderSaved'));
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.reminderFailed')));
              }
            }}
          >
            {t('patient.advanced.addReminder')}
          </Button>
          {reminders.map((r) => (
            <Typography key={String(r.id)} variant="body2">
              {String(r.medicine_name)} @ {String(r.schedule_time)}
              {r.dosage ? ` · ${String(r.dosage)}` : ''}
            </Typography>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={6}>
        <Stack spacing={2} maxWidth={520}>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              try {
                await advancedApi.addPolicy({
                  provider: t('patient.advanced.demoProvider'),
                  policy_number: `POL-${Date.now().toString().slice(-6)}`,
                  coverage_percent: 80,
                });
                setPolicies(await advancedApi.policies());
                setMsg(t('patient.advanced.policyAdded'));
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.policyFailed')));
              }
            }}
          >
            {t('patient.advanced.addDemoPolicy')}
          </Button>
          {policies.map((p) => (
            <Card key={String(p.id)}>
              <CardContent>
                <Typography>
                  {String(p.provider)} · {String(p.policy_number)} · {String(p.coverage_percent)}%
                </Typography>
                <Button
                  size="small"
                  sx={{ mt: 1 }}
                  onClick={async () => {
                    try {
                      const c = await advancedApi.submitClaim({
                        policy_id: Number(p.id),
                        amount: 1200,
                        appointment_id: selectedApptId ? Number(selectedApptId) : undefined,
                      });
                      setMsg(
                        t('patient.advanced.claimResult', {
                          ref: c.claim_ref,
                          status: tStatus(t, c.status),
                        }),
                      );
                    } catch (e) {
                      setErr(errMsg(e, t('patient.advanced.claimFailed')));
                    }
                  }}
                >
                  {t('patient.advanced.fileClaim')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={7}>
        <Stack spacing={2} maxWidth={640}>
          <TextField
            label={t('patient.advanced.filename')}
            value={ocrFile}
            onChange={(e) => setOcrFile(e.target.value)}
          />
          <TextField
            label={t('patient.advanced.reportText')}
            multiline
            minRows={5}
            value={ocrText}
            onChange={(e) => setOcrText(e.target.value)}
          />
          <Button variant="outlined" component="label">
            {t('patient.advanced.uploadFile')}
            <input
              hidden
              type="file"
              accept=".txt,.csv,.pdf,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setOcrFile(file.name);
                try {
                  const text = await file.text();
                  if (text.trim()) setOcrText(text.slice(0, 8000));
                  setMsg(t('patient.advanced.loadedFile', { name: file.name }));
                } catch {
                  setMsg(t('patient.advanced.attachedFile', { name: file.name }));
                }
              }}
            />
          </Button>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              try {
                const r = await advancedApi.ocrScan(ocrFile, ocrText);
                setOcrOut(r);
                setMsg(t('patient.advanced.ocrComplete'));
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.ocrFailed')));
              }
            }}
          >
            {t('patient.advanced.runOcr')}
          </Button>
          {ocrOut && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2">{t('patient.advanced.findings')}</Typography>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{JSON.stringify(ocrOut.findings, null, 2)}</pre>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {String(ocrOut.extracted_text)}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={8}>
        <Stack spacing={2} maxWidth={520}>
          <TextField
            select
            label={t('patient.advanced.doctor')}
            value={doctorId}
            onChange={(e) => setDoctorId(Number(e.target.value))}
            fullWidth
          >
            {doctors.map((d) => (
              <MenuItem key={d.id} value={d.id}>
                {d.full_name || d.specialty}
              </MenuItem>
            ))}
          </TextField>
          <Rating value={rating} onChange={(_, v) => setRating(v)} />
          <TextField
            label={t('patient.advanced.comment')}
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
          />
          <Button
            variant="contained"
            disabled={!doctorId || !rating || busy}
            onClick={async () => {
              try {
                await advancedApi.submitReview({
                  doctor_id: Number(doctorId),
                  rating: rating!,
                  comment: reviewComment,
                  appointment_id: selectedApptId ? Number(selectedApptId) : undefined,
                });
                setMsg(t('patient.advanced.reviewSubmitted'));
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.reviewFailed')));
              }
            }}
          >
            {t('patient.advanced.submitRating')}
          </Button>
        </Stack>
      </TabPanel>

      <TabPanel value={tab} index={9}>
        <Stack spacing={2} maxWidth={560}>
          <Alert severity="info">{t('patient.advanced.calendarInfo')}</Alert>
          <Button
            variant="contained"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr('');
              try {
                const c = await advancedApi.connectCalendar();
                setCalendarConnected(Boolean(c.connected));
                if (c.google_calendar_url) setGoogleCalendarUrl(String(c.google_calendar_url));
                setCalendarStatus(c.message || t('patient.advanced.calendarLinkedDefault'));
                await downloadAuthed('/api/v1/advanced/calendar/export.ics', 'medibook.ics');
                setMsg(t('patient.advanced.calendarConnectedMsg'));
              } catch (e) {
                setErr(errMsg(e, t('patient.advanced.calendarConnectFailed')));
              } finally {
                setBusy(false);
              }
            }}
          >
            {calendarConnected
              ? t('patient.advanced.reconnectCalendar')
              : t('patient.advanced.connectCalendar')}
          </Button>
          {calendarStatus && (
            <Alert severity={calendarConnected ? 'success' : 'info'} onClose={() => setCalendarStatus('')}>
              {calendarStatus}
            </Alert>
          )}
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              disabled={busy}
              onClick={async () => {
                try {
                  await downloadAuthed('/api/v1/advanced/calendar/export.ics', 'medibook.ics');
                  setMsg(t('patient.advanced.icsDownloaded'));
                } catch (e) {
                  setErr(errMsg(e, t('patient.advanced.icsFailed')));
                }
              }}
            >
              {t('patient.advanced.downloadIcs')}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              href={googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('patient.advanced.openGoogleImport')}
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t('patient.advanced.calendarImportHint')}
          </Typography>
        </Stack>
      </TabPanel>
    </Stack>
  );
}
