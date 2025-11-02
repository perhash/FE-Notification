import { Outlet } from "react-router-dom";
import { RiderHeader } from "@/components/rider/RiderHeader";
import { RiderMobileNav } from "@/components/rider/RiderMobileNav";

const RiderLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="hidden md:block">
        <RiderHeader />
      </div>
      
      <main className="flex-1 md:p-6 max-w-7xl mx-auto w-full md:pb-6 overflow-x-hidden">
        <Outlet />
      </main>

      <RiderMobileNav />
    </div>
  );
};

export default RiderLayout;
