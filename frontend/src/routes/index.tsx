import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@components/ProtectedRoute';
import RoleGuard from '@components/RoleGuard';
import AuthLayout from '../layouts/AuthLayout';
import PatientLayout from '../layouts/PatientLayout';
import DoctorLayout from '../layouts/DoctorLayout';
import AdminLayout from '../layouts/AdminLayout';
import SharedLayout from '../layouts/SharedLayout';
import Landing from '@pages/auth/Landing';
import Login from '@pages/auth/Login';
import Register from '@pages/auth/Register';
import ForgotPassword from '@pages/auth/ForgotPassword';
import ResetPassword from '@pages/auth/ResetPassword';
import VerifyEmail from '@pages/auth/VerifyEmail';
import PatientDashboard from '@pages/patient/Dashboard';
import DoctorSearch from '@pages/patient/DoctorSearch';
import DoctorDetail from '@pages/patient/DoctorDetail';
import MyAppointments from '@pages/patient/MyAppointments';
import MedicalRecords from '@pages/patient/MedicalRecords';
import ClinicalHistory from '@pages/patient/ClinicalHistory';
import WaitingListPage from '@pages/patient/WaitingList';
import Payments from '@pages/patient/Payments';
import PatientAdvanced from '@pages/patient/AdvancedHub';
import DoctorDashboard from '@pages/doctor/Dashboard';
import AvailabilityManager from '@pages/doctor/AvailabilityManager';
import AppointmentQueue from '@pages/doctor/AppointmentQueue';
import DoctorCalendar from '@pages/doctor/Calendar';
import PatientRecords from '@pages/doctor/PatientRecords';
import WritePrescription from '@pages/doctor/WritePrescription';
import Earnings from '@pages/doctor/Earnings';
import DoctorAdvanced from '@pages/doctor/AdvancedHub';
import AdminDashboard from '@pages/admin/Dashboard';
import UsersManagement from '@pages/admin/UsersManagement';
import DoctorsVerification from '@pages/admin/DoctorsVerification';
import AppointmentsOverview from '@pages/admin/AppointmentsOverview';
import PaymentsOverview from '@pages/admin/PaymentsOverview';
import AuditLogs from '@pages/admin/AuditLogs';
import ExportCenter from '@pages/admin/ExportCenter';
import DepartmentsBranches from '@pages/admin/DepartmentsBranches';
import HospitalsAdmin from '@pages/admin/Hospitals';
import Profile from '@pages/shared/Profile';
import Notifications from '@pages/shared/Notifications';
import NotFound from '@pages/shared/NotFound';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<SharedLayout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Route>

        <Route element={<RoleGuard roles={['patient']} />}>
          <Route path="/patient" element={<PatientLayout />}>
            <Route index element={<PatientDashboard />} />
            <Route path="doctors" element={<DoctorSearch />} />
            <Route path="doctors/:id" element={<DoctorDetail />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="records" element={<MedicalRecords />} />
            <Route path="clinical" element={<ClinicalHistory />} />
            <Route path="waiting-list" element={<WaitingListPage />} />
            <Route path="payments" element={<Payments />} />
            <Route path="advanced" element={<PatientAdvanced />} />
          </Route>
        </Route>

        <Route element={<RoleGuard roles={['doctor']} />}>
          <Route path="/doctor" element={<DoctorLayout />}>
            <Route index element={<DoctorDashboard />} />
            <Route path="availability" element={<AvailabilityManager />} />
            <Route path="queue" element={<AppointmentQueue />} />
            <Route path="calendar" element={<DoctorCalendar />} />
            <Route path="records" element={<PatientRecords />} />
            <Route path="prescriptions/new" element={<WritePrescription />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="advanced" element={<DoctorAdvanced />} />
          </Route>
        </Route>

        <Route element={<RoleGuard roles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="doctors" element={<DoctorsVerification />} />
            <Route path="org" element={<DepartmentsBranches />} />
            <Route path="hospitals" element={<HospitalsAdmin />} />
            <Route path="appointments" element={<AppointmentsOverview />} />
            <Route path="payments" element={<PaymentsOverview />} />
            <Route path="audit" element={<AuditLogs />} />
            <Route path="export" element={<ExportCenter />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
