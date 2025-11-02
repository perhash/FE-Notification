import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'RIDER';
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  redirectTo 
}) => {
  const { isAuthenticated, isAdmin, isRider, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If role is required, check if user has the correct role
  if (requiredRole) {
    const hasRequiredRole = 
      (requiredRole === 'ADMIN' && isAdmin) || 
      (requiredRole === 'RIDER' && isRider);

    if (!hasRequiredRole) {
      // Redirect to appropriate dashboard based on user's actual role
      const redirectPath = isAdmin ? '/admin' : isRider ? '/rider' : '/';
      return <Navigate to={redirectPath} replace />;
    }
  }

  // If redirectTo is specified and user doesn't have required role, redirect
  if (redirectTo && requiredRole) {
    const hasRequiredRole = 
      (requiredRole === 'ADMIN' && isAdmin) || 
      (requiredRole === 'RIDER' && isRider);

    if (!hasRequiredRole) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  return <>{children}</>;
};

// Convenience components for specific roles
export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="ADMIN">
    {children}
  </ProtectedRoute>
);

export const RiderRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute requiredRole="RIDER">
    {children}
  </ProtectedRoute>
);
