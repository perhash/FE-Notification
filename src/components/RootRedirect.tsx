import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isAdmin, isRider, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If authenticated, redirect based on role
  if (isAuthenticated) {
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    } else if (isRider) {
      return <Navigate to="/rider" replace />;
    }
  }

  // If not authenticated, show login page
  return <Navigate to="/login" replace />;
};

export default RootRedirect;
