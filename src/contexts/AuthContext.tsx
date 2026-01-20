import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService } from '@/services/api';
import { User, LoginResponse, VerifyTokenResponse } from '@/types/auth';
import { customerSyncService } from '@/services/customerSync';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isRider: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          // Verify token with backend
          try {
            const response = await apiService.verifyToken() as VerifyTokenResponse;
            if (response.success) {
              // Token is valid, update user data
              setUser(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
              
              // Start periodic sync if admin
              if (response.data.user.role === 'ADMIN') {
                customerSyncService.startPeriodicSync();
              }
            } else {
              // Token is invalid, clear auth state
              clearAuthState();
            }
          } catch (error) {
            console.error('Token verification failed:', error);
            clearAuthState();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuthState();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    // Cleanup: stop periodic sync on unmount
    return () => {
      customerSyncService.stopPeriodicSync();
    };
  }, []);

  const clearAuthState = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiService.login({ email, password }) as LoginResponse;
      
      if (response.success) {
        const { token: newToken, user: newUser } = response.data;
        
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        // Fetch and store customers in IndexedDB on login
        if (newUser.role === 'ADMIN') {
          customerSyncService.syncCustomers().catch((error) => {
            console.error('Failed to sync customers on login:', error);
          });
          
          // Start periodic sync (6 hours)
          customerSyncService.startPeriodicSync();
        }
        
        return { success: true };
      } else {
        return { success: false, message: response.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed. Please check your credentials.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Stop periodic sync
      customerSyncService.stopPeriodicSync();
      
      // Call logout API if token exists
      if (token) {
        await apiService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
    }
  };

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'ADMIN';
  const isRider = user?.role === 'RIDER';

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    isRider,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
