import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AdminSidebar />
        </div>

        <div className="flex flex-1 flex-col w-full">
          {/* Hide header on mobile */}
          <div className="hidden md:block">
            <AdminHeader />
          </div>
          
          <main className="flex-1 p-0  md:p-4 md:p-6 pb-20 md:pb-6 overflow-x-hidden">
            <Outlet />
          </main>

          {/* Mobile Bottom Navigation */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            <AdminMobileNav />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
