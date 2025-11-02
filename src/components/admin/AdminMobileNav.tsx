import { useState } from "react";
import { Home, Package, Grid3x3, Bell, LogOut, Users, TruckIcon, DollarSign, BarChart3, Settings, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ChevronUp, ChevronDown } from "lucide-react";

export function AdminMobileNav() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate('/login');
  };

  const allMenuItems = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Customers", url: "/admin/customers", icon: Users },
    { title: "Riders", url: "/admin/riders", icon: TruckIcon },
    { title: "Orders", url: "/admin/orders", icon: Package },
    { title: "Payments", url: "/admin/payments", icon: DollarSign },
    { title: "Reports", url: "/admin/reports", icon: BarChart3 },
    { title: "Profile", url: "/admin/profile", icon: User },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ];

  const navItemClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 min-w-0 ${active ? "text-cyan-600" : "text-gray-500"}`;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/90 backdrop-blur-lg md:hidden shadow-2xl">
        <div className="flex items-stretch h-16">
          {/* Dashboard Button */}
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `${navItemClass(isActive)}`
            }
          >
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">Dashboard</span>
          </NavLink>
          
          {/* Orders Button */}
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `${navItemClass(isActive)}`
            }
          >
            <Package className="h-6 w-6" />
            <span className="text-xs font-medium">Orders</span>
          </NavLink>

          {/* Six-dot Menu */}
          <Drawer open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DrawerTrigger asChild>
              <button className={`flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 min-w-0 text-gray-500 hover:text-cyan-600 transition-colors`}>
                <div className="relative">
                  <Grid3x3 className="h-6 w-6" />
                  {isMenuOpen ? (
                    <ChevronDown className="h-3 w-3 absolute -bottom-1 right-0" />
                  ) : (
                    <ChevronUp className="h-3 w-3 absolute -bottom-1 right-0" />
                  )}
                </div>
                <span className="text-xs font-medium">Menu</span>
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh] h-auto">
              <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-gray-300" />
              <DrawerHeader className="text-center">
                <DrawerTitle className="text-xl font-bold">Navigation Menu</DrawerTitle>
                <DrawerDescription className="text-sm text-gray-500">
                  Select a section to navigate
                </DrawerDescription>
              </DrawerHeader>
              <div className="grid grid-cols-2 gap-3 p-4 pb-6">
                {allMenuItems.map((item) => (
                  <DrawerClose key={item.title} asChild>
                    <NavLink
                      to={item.url}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-cyan-50 hover:border-cyan-300 transition-all"
                    >
                      <item.icon className="h-6 w-6 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">{item.title}</span>
                    </NavLink>
                  </DrawerClose>
                ))}
              </div>
            </DrawerContent>
          </Drawer>
          
          {/* Notification Icon */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <NotificationDrawer 
              trigger={
                <button className="flex flex-col items-center justify-center gap-1 h-full w-full text-gray-500 hover:text-cyan-600">
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

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-3 flex-1 min-w-0 text-gray-500 hover:text-red-600 transition-colors`}
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
