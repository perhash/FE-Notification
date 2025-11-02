import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CreateOrderDialog } from "@/components/admin/CreateOrderDialog";
import { Package, MapPin, Droplet, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";

// Helper function to get payment status badge
const getPaymentStatusBadge = (status?: string, paid?: boolean) => {
  if (paid) return { text: 'PAID', className: 'bg-green-100 text-green-700' };
  const paymentStatus = status?.toUpperCase();
  switch (paymentStatus) {
    case 'PAID':
      return { text: 'PAID', className: 'bg-green-100 text-green-700' };
    case 'NOT_PAID':
      return { text: 'NOT PAID', className: 'bg-red-100 text-red-700' };
    case 'PARTIAL':
      return { text: 'PARTIAL', className: 'bg-orange-100 text-orange-700' };
    default:
      return { text: 'NOT PAID', className: 'bg-red-100 text-red-700' };
  }
};

const Orders = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await apiService.getOrders(statusFilter === "all" ? undefined : { status: statusFilter }) as any;
        if (response?.success) {
          setOrders(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    // Fetch initial orders
    fetchOrders();

    // Set up Supabase real-time subscription
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Order change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            // New order added - refetch to get full order details
            fetchOrders();
          } else if (payload.eventType === 'UPDATE') {
            // Order updated - refresh data
            fetchOrders();
          } else if (payload.eventType === 'DELETE') {
            // Order deleted - remove from list
            setOrders((prev) => prev.filter((order: any) => {
              const orderId = order.originalId || order.id.replace('#', '');
              return orderId !== payload.old.id;
            }));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [statusFilter]);

  const filteredOrders = [...orders]
    .filter((order: any) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        order.id?.toLowerCase().includes(query) ||
        order.customer?.toLowerCase().includes(query) ||
        order.phone?.toLowerCase().includes(query) ||
        order.address?.toLowerCase().includes(query)
      );
    })
    .sort((a: any, b: any) => {
      // Unassigned first
      const aUnassigned = (a.rider === 'Not assigned' || !a.rider);
      const bUnassigned = (b.rider === 'Not assigned' || !b.rider);
      if (aUnassigned !== bUnassigned) return aUnassigned ? -1 : 1;
      const orderRank = (p?: string) => p === 'high' ? 0 : p === 'normal' || p === 'medium' ? 1 : p === 'low' ? 2 : 1;
      const ar = orderRank(a.priority);
      const br = orderRank(b.priority);
      if (ar !== br) return ar - br;
      // FIFO within same priority by created date if available, else keep as-is
      if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
      return 0;
    });

  // Calculate metrics
  const totalOrders = filteredOrders.length;
  const createdOrders = filteredOrders.filter((o: any) => o.status?.toLowerCase() === 'created').length;
  const assignedOrders = filteredOrders.filter((o: any) => o.status?.toLowerCase() === 'assigned').length;
  const deliveredOrders = filteredOrders.filter((o: any) => o.status?.toLowerCase() === 'delivered').length;

  return (
    <div className="space-y-6">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Top Blue Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6">
          {/* Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Droplet className="h-8 w-8 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Orders</h1>
              <p className="text-sm text-white/90">Manage all delivery orders</p>
            </div>
          </div>

          {/* Metrics 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{totalOrders}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{createdOrders}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Created</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{assignedOrders}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Assigned</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{deliveredOrders}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Delivered</p>
            </div>
          </div>
        </div>

        {/* White Section */}
        <div className="bg-white rounded-t-3xl -mt-5 p-6 space-y-4">
          {/* Actions */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <CreateOrderDialog />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Order Cards */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order: any) => {
                const orderId = order.originalId || order.id?.replace('#', '') || order.id;
                const isDelivered = order.status?.toLowerCase() === 'delivered';
                const isAssigned = order.status?.toLowerCase() === 'assigned';
                const isCreated = order.status?.toLowerCase() === 'created';
                const hasRider = order.rider && order.rider !== 'Not assigned';
                const isWalkIn = order.orderType === 'WALKIN' || order.customer === 'Walk-in Customer' || order.customer?.name === 'Walk-in Customer';

                return (
                  <Link key={orderId} to={`/admin/orders/${orderId}`}>
                    <div className={`bg-gradient-to-br from-white rounded-2xl p-4 border shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.99] ${
                      isDelivered ? 'to-green-50/30 border-green-100' : 
                      isAssigned ? 'to-cyan-50/30 border-cyan-100' : 
                      'to-blue-50/30 border-blue-100'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900">{order.id}</p>
                            <Badge className={
                              isDelivered ? 'bg-green-600 text-white' :
                              isAssigned ? 'bg-cyan-100 text-cyan-700' :
                              'bg-blue-100 text-blue-700'
                            }>
                              {order.status || 'Created'}
                            </Badge>
                          </div>
                          <p className="font-semibold text-gray-800">{order.customer}</p>
                          {order.phone && <p className="text-sm text-gray-500">{order.phone}</p>}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            isDelivered ? 'text-green-700' : 
                            isAssigned ? 'text-cyan-700' : 
                            'text-blue-700'
                          }`}>
                            RS. {order.amount || order.totalAmount || 0}
                          </p>
                          <p className="text-sm text-gray-500">{order.bottles || order.numberOfBottles} bottles</p>
                          {!isDelivered && !hasRider && !isWalkIn && (
                            <Badge variant="destructive" className="mt-2 cursor-pointer">
                              Assign
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">
                          {order.address || [order.customer?.houseNo, order.customer?.streetNo, order.customer?.area, order.customer?.city].filter(Boolean).join(' ') || "Address not available"}
                        </span>
                      </div>
                      {hasRider && (
                        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                          Rider: {order.rider}
                        </div>
                      )}
                      {order.priority && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded-md ${
                            order.priority === 'high' ? 'bg-red-100 text-red-700' :
                            (order.priority === 'normal' || order.priority === 'medium') ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>{order.priority}</span>
                          {isDelivered && (
                            <Badge className={getPaymentStatusBadge(order.paymentStatus, order.paid).className}>
                              {getPaymentStatusBadge(order.paymentStatus, order.paid).text}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block max-w-4xl mx-auto">
        {/* Blue Gradient Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-8 shadow-2xl rounded-3xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
              <Droplet className="h-12 w-12 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Orders</h1>
              <p className="text-white/90 mt-1">Manage all delivery orders</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Package className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{totalOrders}</p>
              <p className="text-sm text-white/80 mt-1">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Package className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{createdOrders}</p>
              <p className="text-sm text-white/80 mt-1">Created</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Package className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{assignedOrders}</p>
              <p className="text-sm text-white/80 mt-1">Assigned</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Package className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{deliveredOrders}</p>
              <p className="text-sm text-white/80 mt-1">Delivered</p>
            </div>
          </div>
        </div>

        {/* White Container */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cyan-100">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <CardTitle>All Orders ({filteredOrders.length})</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-[300px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="created">Created</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                  <CreateOrderDialog />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredOrders.map((order: any) => {
                    const orderId = order.originalId || order.id?.replace('#', '') || order.id;
                    const isDelivered = order.status?.toLowerCase() === 'delivered';
                    const isAssigned = order.status?.toLowerCase() === 'assigned';
                    const hasRider = order.rider && order.rider !== 'Not assigned';
                    const isWalkIn = order.orderType === 'WALKIN' || order.customer === 'Walk-in Customer' || order.customer?.name === 'Walk-in Customer';

                    return (
                      <Link key={orderId} to={`/admin/orders/${orderId}`}>
                        <Card className={`${order.paid ? 'bg-green-50 hover:bg-green-50/80' : 'hover:bg-muted/50'} transition-colors`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{order.id}</p>
                                  <Badge variant={isDelivered ? "default" : isAssigned ? "secondary" : "outline"}>
                                    {order.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{order.customer}</p>
                                <p className="text-xs text-muted-foreground">Rider: {order.rider || 'Not assigned'}</p>
                                <div className="flex items-center gap-2 pt-1">
                                  {order.priority && (
                                    <span className={`px-2 py-0.5 text-xs rounded-md ${
                                      order.priority === 'high' ? 'bg-red-100 text-red-700' :
                                      (order.priority === 'normal' || order.priority === 'medium') ? 'bg-green-100 text-green-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>{order.priority}</span>
                                  )}
                                  {isDelivered && (
                                    <Badge className={getPaymentStatusBadge(order.paymentStatus, order.paid).className}>
                                      {getPaymentStatusBadge(order.paymentStatus, order.paid).text}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="font-medium">{order.bottles || order.numberOfBottles} bottles</p>
                                <p className="text-lg font-bold">RS. {order.amount || order.totalAmount || 0}</p>
                                <p className="text-xs text-muted-foreground">{order.date}</p>
                                {!isDelivered && !hasRider && !isWalkIn && (
                                  <div className="pt-2">
                                    <Badge className="cursor-pointer" variant="destructive">Assign</Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Orders;