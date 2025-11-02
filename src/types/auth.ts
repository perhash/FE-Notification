export interface User {
  id: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'RIDER' | 'CUSTOMER';
  isActive: boolean;
  adminProfile?: {
    id: string;
    name: string;
    company?: string;
  };
  riderProfile?: {
    id: string;
    name: string;
    phone: string;
    isActive: boolean;
  };
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    token: string;
    user: User;
  };
}

export interface VerifyTokenResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
