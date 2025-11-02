import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Package, DollarSign, UserPlus } from "lucide-react";

const Notifications = () => {
  const notifications = [
    {
      id: 1,
      type: "order",
      title: "New Order Received",
      message: "Order #1245 from Ramesh Kumar",
      time: "2 minutes ago",
      unread: true,
      icon: Package,
    },
    {
      id: 2,
      type: "payment",
      title: "Payment Received",
      message: "RS. 500 received from Priya Sharma",
      time: "15 minutes ago",
      unread: true,
      icon: DollarSign,
    },
    {
      id: 3,
      type: "delivery",
      title: "Delivery Completed",
      message: "Rider Ali completed delivery #1234",
      time: "1 hour ago",
      unread: false,
      icon: Bell,
    },
    {
      id: 4,
      type: "customer",
      title: "New Customer Added",
      message: "Vikram Singh joined the platform",
      time: "2 hours ago",
      unread: false,
      icon: UserPlus,
    },
    {
      id: 5,
      type: "payment",
      title: "Payment Received",
      message: "RS. 1200 received from Anjali Patel",
      time: "3 hours ago",
      unread: false,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">Stay updated with latest activities</p>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const Icon = notification.icon;
          return (
            <Card
              key={notification.id}
              className={`hover:bg-muted/50 transition-colors ${
                notification.unread ? "border-l-4 border-l-primary" : ""
              }`}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className={`p-2 rounded-full ${
                  notification.unread ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Icon className={`h-5 w-5 ${
                    notification.unread ? "text-primary" : "text-muted-foreground"
                  }`} />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{notification.title}</p>
                    {notification.unread && (
                      <Badge variant="default" className="shrink-0">New</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
