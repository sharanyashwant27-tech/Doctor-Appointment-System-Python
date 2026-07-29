export type UserRole = 'admin' | 'doctor' | 'patient';

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
} | null;
