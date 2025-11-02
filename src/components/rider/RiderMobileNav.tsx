import { Home, Bell, User, LogOut } from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/contexts/NotificationContext";
import { Button } from "@/components/ui/button";

export function RiderMobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate('/login');
  };

  const navItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 min-w-0 ${active ? "text-cyan-600" : "text-gray-500"}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur-lg md:hidden shadow-2xl">
      <div className="flex items-stretch h-16">
        {/* Dashboard Button */}
        <NavLink
          to="/rider"
          end
          className={({ isActive }) =>
            `${navItemClass(isActive)}`
          }
        >
          <Home className="h-6 w-6" />
          <span className="text-xs font-medium">Dashboard</span>
        </NavLink>
        
        {/* Notification Icon */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <NotificationDrawer 
            trigger={
              <button className={`flex flex-col items-center justify-center gap-1 h-full w-full ${isActive('/rider/notifications') ? 'text-cyan-600' : 'text-gray-500'}`}>
                <div className="relative inline-block">
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </div>
                <span className="text-xs font-medium">Notifications</span>
              </button>
            }
          />
        </div>

        {/* Profile Icon */}
        <NavLink
          to="/rider/profile"
          className={({ isActive }) =>
            `${navItemClass(isActive)}`
          }
        >
          <User className="h-6 w-6" />
          <span className="text-xs font-medium">Profile</span>
        </NavLink>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`${navItemClass(false)} hover:text-red-600`}
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
