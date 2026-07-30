# Advanced Features

All routes under `/api/v1/advanced/...`. UI: **Advanced** in patient/doctor nav; **Hospitals** for admin.

| Feature | How it works |
|---------|----------------|
| AI Symptom Checker | Rule engine maps symptoms → specialty + urgency (`POST /symptoms/check`) |
| Smart Appointment Recommendation | Scores verified doctors by specialty match, rating, fee |
| Voice Appointment Booking | Web Speech API + `POST /voice/parse` intent extraction |
| Face Login | Demo descriptor hash enroll/login (`/face/enroll`, `/face/login`) |
| QR Code Check-in | Existing QR token + doctor Advanced check-in UI |
| Live Video Consultation | Jitsi Meet room per appointment (`POST /video/{id}/room`) |
| Chat with Doctor | Thread + messages between patient and doctor |
| e-Prescription | Signed PDF bundle (`POST /eprescription/{id}/bundle`) |
| OCR Medical Report Scanner | Demo OCR extract + lab findings JSON |
| Medicine Reminder | Schedule + Celery task `dispatch_medicine_reminders` |
| Multi-Hospital Support | `hospitals` + branch `hospital_id` attach |
| Doctor Rating System | Patient reviews update `doctors.rating` |
| Insurance Integration | Policies + auto-approved demo claims |
| Google Calendar Sync | ICS export + Import in Google Calendar (no OAuth client required) |
| Digital Signature | Stored signatures on Rx / certificates |
| Medical Certificate Generator | PDF certificates (fitness / sick leave / travel) |
| AI Health Assistant | Conversational triage assistant (`POST /assistant/chat`) |

Demo engines are **rule-based** (no paid LLM required). Swap `health_assistant_reply` / OCR with real providers when keys are available.
