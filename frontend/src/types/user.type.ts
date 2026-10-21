export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  gender?: string | null;
  avatarUrl?: string | null;
  role: string;
  isActive?: boolean;
};
