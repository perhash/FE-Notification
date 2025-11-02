import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ProtectedRoute, AdminRoute, RiderRoute } from "./components/ProtectedRoute";
import { SplashScreen } from "./components/SplashScreen";
import RootRedirect from "./components/RootRedirect";
import AdminLayout from "./components/layouts/AdminLayout";
import RiderLayout from "./components/layouts/RiderLayout";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import Index from "./pages/Index";
import AdminDashboard from "./pages/admin/Dashboard";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import Riders from "./pages/admin/Riders";
import RiderDetail from "./pages/admin/RiderDetail";
import Orders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import Payments from "./pages/admin/Payments";
import Reports from "./pages/admin/Reports";
import Notifications from "./pages/admin/Notifications";
import Settings from "./pages/admin/Settings";
import DailyClosings from "./pages/admin/DailyClosings";
import RiderDashboard from "./pages/rider/Dashboard";
import RiderOrderDetail from "./pages/rider/OrderDetail";
import RiderPayments from "./pages/rider/Payments";
import RiderProfile from "./pages/rider/Profile";
import RiderOrderHistory from "./pages/rider/OrderHistory";
import AdminProfile from "./pages/admin/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Route - Public */}
        <Route path="/login" element={<Index />} />
        
        {/* Root Route - Redirect based on auth status */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Admin Routes - Protected */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="riders" element={<Riders />} />
          <Route path="riders/:id" element={<RiderDetail />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="daily-closings" element={<DailyClosings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* Rider Routes - Protected */}
        <Route path="/rider" element={
          <RiderRoute>
            <RiderLayout />
          </RiderRoute>
        }>
          <Route index element={<RiderDashboard />} />
          <Route path="orders/:id" element={<RiderOrderDetail />} />
          <Route path="history" element={<RiderOrderHistory />} />
          <Route path="payments" element={<RiderPayments />} />
          <Route path="profile" element={<RiderProfile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {showSplash ? (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      ) : (
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner 
                position={isMobile ? "top-center" : "bottom-right"}
                duration={4000}
                richColors
              />
              <PWAUpdatePrompt />
              <AppRoutes />
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      )}
    </QueryClientProvider>
  );
};

export default App;
