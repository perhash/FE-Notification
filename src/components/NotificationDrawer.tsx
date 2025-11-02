import React from 'react';
import { Bell, CheckCheck, Truck, Package, DollarSign, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatPktRelativeTime, formatPktDateTime12Hour, formatPktTime12Hour } from '@/utils/timezone';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface NotificationDrawerProps {
  trigger?: React.ReactNode;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ trigger }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  // Check if mobile
  const [isMobile, setIsMobile] = React.useState(false);
  
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleNotificationClick = async (notification: any) => {
    try {
      // Mark as read first (wait for it to complete)
      if (!notification.isRead) {
        console.log('Marking notification as read:', notification.id);
        await markAsRead(notification.id);
        console.log('Notification marked as read successfully');
      }

      // Close drawer
      setOpen(false);

      // Navigate to order if it exists
      const orderId = notification.data?.orderId;
      if (orderId) {
        // Check if admin or rider based on current path
        const isAdmin = window.location.pathname.includes('/admin');
        const path = isAdmin ? `/admin/orders/${orderId}` : `/rider/orders/${orderId}`;
        
        console.log('Navigating to:', path);
        // Small delay to ensure state updates complete
        setTimeout(() => {
          navigate(path);
        }, 100);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
      // Still navigate even if mark as read fails
      const orderId = notification.data?.orderId;
      if (orderId) {
        const isAdmin = window.location.pathname.includes('/admin');
        const path = isAdmin ? `/admin/orders/${orderId}` : `/rider/orders/${orderId}`;
        navigate(path);
      }
      setOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatPktRelativeTime(dateString);
    } catch {
      return '';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ORDER_ASSIGNED':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'ORDER_DELIVERED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'PAYMENT_RECEIVED':
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case 'ORDER_CREATED':
        return <Package className="h-5 w-5 text-cyan-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? (
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
      )}
        <SheetContent 
        side={isMobile ? "bottom" : "right"}
        className={`${isMobile ? "rounded-t-3xl h-[75vh] pb-20 [&_.absolute.right-4.top-4]:hidden" : "w-[540px]"}`}
      >
        {/* Close button for mobile */}
        {isMobile && (
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        )}
        
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold">Notifications</SheetTitle>
              <SheetDescription className="mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </SheetDescription>
            </div>
          </div>
          {unreadCount > 0 && (
            <div className="flex justify-end mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs flex items-center gap-1"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </Button>
            </div>
          )}
        </SheetHeader>

        <ScrollArea className={isMobile ? "h-[calc(100vh-220px)]" : "h-[calc(100vh-120px)]"}>
          <div className={isMobile ? "space-y-2 pb-4 px-2" : "space-y-2 pb-4 -mx-6 px-6"}>
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${
                    !notification.isRead ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      !notification.isRead ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-semibold text-sm ${!notification.isRead ? 'font-bold text-blue-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatPktTime12Hour(notification.createdAt)} • {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};


