import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Phone, CheckCircle, Clock, DollarSign, Receipt, PlusCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { supabase } from "@/lib/supabase";
import { Droplet } from "lucide-react";
import { getTodayPktDate, formatPktDate } from "@/utils/timezone";

interface Order {
  id: string;
  originalId: string;
  customer: string;
  phone: string;
  bottles: number;
  amount: number;
  status: string;
  priority: string;
  rider: string;
  date: string;
  paid: boolean;
  paidAmount: number;
  currentOrderAmount?: number;
  paymentStatus: string;
  address?: string;
  createdAt?: string | Date;
}

// Helper function to get payment status badge
const getPaymentStatusBadge = (status?: string) => {
  const paymentStatus = status?.toUpperCase();
  switch (paymentStatus) {
    case 'PAID':
      return { text: 'PAID', className: 'bg-green-100 text-green-700' };
    case 'NOT_PAID':
      return { text: 'NOT PAID', className: 'bg-red-100 text-red-700' };
    case 'PARTIAL':
      return { text: 'PARTIAL', className: 'bg-orange-100 text-orange-700' };
    case 'OVERPAID':
      return { text: 'OVERPAID', className: 'bg-purple-100 text-purple-700' };
    case 'REFUND':
      return { text: 'REFUND', className: 'bg-blue-100 text-blue-700' };
    default:
      return { text: 'NOT PAID', className: 'bg-red-100 text-red-700' };
  }
};

const RiderDashboard = () => {
  const [activeTab, setActiveTab] = useState("assigned");
  const [assignedDeliveries, setAssignedDeliveries] = useState<Order[]>([]);
  const [completedDeliveries, setCompletedDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [canCreateOrders, setCanCreateOrders] = useState(false);
  const channelRef = useRef<any>(null);

  const { user } = useAuth();
  const riderId = (user as any)?.riderProfile?.id || (user as any)?.profile?.id;
  const riderName = (user as any)?.riderProfile?.name || (user as any)?.profile?.name || "Rider";

  // Calculate today's delivery metrics from all today's orders (assigned + completed)
  const todayMetrics = useMemo(() => {
    const todayPktDate = getTodayPktDate();
    const allTodayOrders = [...assignedDeliveries, ...completedDeliveries].filter((delivery) => {
      if (!delivery.createdAt) return false;
      const deliveryDate = formatPktDate(delivery.createdAt);
      return deliveryDate === todayPktDate;
    });

    // Total current order amount of today's orders
    const totalCurrentOrderAmount = allTodayOrders.reduce((sum, delivery) => sum + (delivery.currentOrderAmount || 0), 0);

    // Total received amount of today's orders
    const totalReceivedAmount = allTodayOrders.reduce((sum, delivery) => sum + (delivery.paidAmount || 0), 0);

    // Calculate difference: Total Current Order - Total Received
    const difference = totalCurrentOrderAmount - totalReceivedAmount;

    // Dynamic third metric: Recovery or Udhaar
    const isRecovery = difference < 0;
    const thirdMetricAmount = Math.abs(difference);
    const thirdMetricLabel = isRecovery ? "Recovery" : "Udhaar";

    return {
      totalCurrentOrderAmount,
      totalReceivedAmount,
      difference,
      isRecovery,
      thirdMetricAmount,
      thirdMetricLabel
    };
  }, [assignedDeliveries, completedDeliveries]);

  const { totalCurrentOrderAmount, totalReceivedAmount, isRecovery, thirdMetricAmount, thirdMetricLabel } = todayMetrics;

  const fetchRiderData = useCallback(async () => {
    try {
      setLoading(true);
      if (!riderId) return;
      const response = await apiService.getRiderDashboard(riderId) as any;
      if (response?.success) {
        const todayPktDate = getTodayPktDate();

        // Filter assigned deliveries for today only
        const assigned = (response.data?.assignedDeliveries || []) as any[];
        const assignedToday = assigned.filter((delivery: Order) => {
          if (!delivery.createdAt) return false;
          const deliveryDate = formatPktDate(delivery.createdAt);
          return deliveryDate === todayPktDate;
        });

        const rank = (p?: string) => (p === 'high' ? 0 : p === 'normal' ? 1 : p === 'medium' ? 1 : 2);
        assignedToday.sort((a, b) => {
          const ar = rank(a.priority);
          const br = rank(b.priority);
          if (ar !== br) return ar - br;
          return (a.id || '').localeCompare(b.id || '');
        });

        // Filter completed deliveries for today only
        const completed = (response.data?.completedDeliveries || []) as any[];
        const completedToday = completed.filter((delivery: Order) => {
          if (!delivery.createdAt) return false;
          const deliveryDate = formatPktDate(delivery.createdAt);
          return deliveryDate === todayPktDate;
        });

        setAssignedDeliveries(assignedToday);
        setCompletedDeliveries(completedToday);
      }

      // Also refresh user from localStorage to get latest rider flags
      const currentUser = apiService.getCurrentUser();
      if (currentUser?.riderProfile) {
        setCanCreateOrders(!!currentUser.riderProfile.canCreateOrders);
      } else if (currentUser?.profile) {
        setCanCreateOrders(!!currentUser.profile.canCreateOrders);
      }
    } catch (error) {
      console.error('Error fetching rider data:', error);
      setAssignedDeliveries([]);
      setCompletedDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [riderId]);

  useEffect(() => {
    if (!riderId) return;
    fetchRiderData();

    // On first load / refresh, ensure we read canCreateOrders from stored user as well
    const currentUser = apiService.getCurrentUser();
    if (currentUser?.riderProfile) {
      setCanCreateOrders(!!currentUser.riderProfile.canCreateOrders);
    } else if (currentUser?.profile) {
      setCanCreateOrders(!!currentUser.profile.canCreateOrders);
    }

    const channelName = `rider-orders-${riderId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `riderId=eq.${riderId}` },
        (payload) => fetchRiderData())
      .subscribe();

    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [riderId, fetchRiderData]);

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Top Section - Blue Gradient Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6 pb-8 space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center gap-4">
            {/* Profile Circle */}
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Droplet className="h-8 w-8 text-cyan-600" fill="currentColor" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Welcome {riderName}</h1>
              <p className="text-sm text-white/90 mt-1">You have {assignedDeliveries.length} pending deliveries</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true);
                fetchRiderData();
              }}
              disabled={loading}
              className="h-9 w-9 p-0 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Metrics - 3 Rounded Boxes */}
          <div className="grid grid-cols-3 gap-3">
            {/* Today */}
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-3 border border-white/30">
              <div className="flex flex-col items-center justify-center">
                <Package className="h-6 w-6 text-white mb-2" />
                <p className="text-2xl font-bold text-white">{assignedDeliveries.length + completedDeliveries.length}</p>
                <p className="text-xs text-white/80">Today</p>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-3 border  border-white/30">
              <div className="flex flex-col items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white mb-2" />
                <p className="text-2xl font-bold text-white">{completedDeliveries.length}</p>
                <p className="text-xs text-white/80">Done</p>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-3 border border-white/30">
              <div className="flex flex-col items-center justify-center">
                <Clock className="h-6 w-6 text-white mb-2" />
                <p className="text-2xl font-bold text-white">{assignedDeliveries.length}</p>
                <p className="text-xs text-white/80">Pending</p>
              </div>
            </div>
          </div>

          {/* Actions - Mobile (Order history + optional create enroute) */}
          <div className="mt-6 mb-2 flex items-center justify-between">
            <Link to="/rider/history">
              <p className="text-white underline text-sm font-medium">
                Order history
              </p>
            </Link>
            {canCreateOrders && (
              <Link to="/rider/enroute">
                <Button size="sm" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Enroute order
                </Button>
              </Link>
            )}
          </div>

        </div>

        {/* Bottom Section - White Background with Tabs */}
        {/* Bottom Section - White Glassy Tabs Area */}
        <div className="bg-white rounded-t-3xl -mt-10 p-6 min-h-[calc(100vh-300px)] overflow-y-auto shadow-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Toggle Bar */}
            <div className="flex rounded-full border bg-black/20 backdrop-blur-sm shadow-black/70 shadow-inner-sm   p-1 mb-6 shadow-inner">
              <button
                onClick={() => setActiveTab("assigned")}
                className={`flex-1 py-3 px-4 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === "assigned"
                  ? "bg-cyan-600 text-white shadow-md scale-[1.02]"
                  : "text-cyan-700 hover:bg-white/60"
                  }`}
              >
                Assigned ({assignedDeliveries.length})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`flex-1 py-3 px-4 rounded-full font-medium text-sm transition-all duration-300 ${activeTab === "completed"
                  ? "bg-green-600 text-white shadow-md scale-[1.02]"
                  : "text-cyan-700 hover:bg-white/60"
                  }`}
              >
                Completed ({completedDeliveries.length})
              </button>
            </div>

            {/* Today's Delivery Metrics */}
            <div className="grid grid-cols-3 gap-3 mt-4 mb-4 ">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200 h-full">
                <div className="flex flex-col h-full">
                  <p className="text-xs text-blue-700 mb-2">Total Current Order</p>
                  <p className="text-xl font-bold text-blue-900 mt-auto">RS. {totalCurrentOrderAmount}</p>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border border-green-200 h-full">
                <div className="flex flex-col h-full">
                  <p className="text-xs text-green-700 mb-2">Total Received</p>
                  <p className="text-xl font-bold text-green-900 mt-auto">RS. {totalReceivedAmount}</p>
                </div>
              </div>
              <div className={`bg-gradient-to-br rounded-2xl p-4 border h-full ${isRecovery
                  ? 'from-purple-50 to-purple-100 border-purple-200'
                  : 'from-red-50 to-red-100 border-red-200'
                }`}>
                <div className="flex flex-col h-full">
                  <p className={`text-xs mb-2 ${isRecovery ? 'text-purple-700' : 'text-red-700'
                    }`}>{thirdMetricLabel}</p>
                  <p className={`text-xl font-bold mt-auto ${isRecovery ? 'text-purple-900' : 'text-red-900'
                    }`}>RS. {thirdMetricAmount}</p>
                </div>
              </div>
            </div>

            {/* Assigned Deliveries */}
            {activeTab === "assigned" && (
              <div className="space-y-3">
                {assignedDeliveries.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No assigned deliveries</p>
                  </div>
                ) : (
                  assignedDeliveries.map((delivery) => (
                    <Link
                      key={delivery.originalId}
                      to={`/rider/orders/${delivery.originalId}`}
                    >
                      <div className="bg-gradient-to-br from-white to-cyan-50/30 rounded-2xl p-4 border border-cyan-100 hover:shadow-lg transition-all duration-300 active:scale-[0.99]">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-gray-900">{delivery.customer}</p>
                              <Badge className="bg-cyan-100 text-cyan-700">
                                Assigned
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">{delivery.phone}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-cyan-700">
                              RS. {delivery.amount}
                            </p>
                            <p className="text-sm text-gray-500">
                              {delivery.bottles} bottles
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-600" />
                          <span className="line-clamp-2">
                            {delivery.address || "Address not available"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {/* Completed Deliveries */}
            {activeTab === "completed" && (
              <div className="space-y-3 mb-4">
                {completedDeliveries.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No completed deliveries</p>
                  </div>
                ) : (
                  completedDeliveries.map((delivery) => (
                    <Link
                      key={delivery.originalId}
                      to={`/rider/orders/${delivery.originalId}`}
                    >
                      <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-4 border border-green-100 hover:shadow-lg transition-all duration-300 active:scale-[0.99] mb-2">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-gray-900">{delivery.customer}</p>
                              <Badge className="bg-green-600 text-white">
                                Completed
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-green-700">
                              RS. {delivery.amount}
                            </p>
                            <Badge className={getPaymentStatusBadge(delivery.paymentStatus).className + " mt-1"}>
                              {getPaymentStatusBadge(delivery.paymentStatus).text}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-start justify-between text-sm mb-2">
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                            <span className="line-clamp-2">
                              {delivery.address || "Address not available"}
                            </span>
                          </div>
                          <p className="text-gray-600">
                            Paid: <span className="font-semibold text-green-600">RS. {delivery.paidAmount || 0}</span>
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </Tabs>
        </div>

      </div>

      {/* Desktop Layout - Expanded Version */}
      <div className="hidden md:block max-w-7xl mx-auto px-6">
        {/* Top Section */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-700 rounded-3xl p-8 shadow-2xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
              <Droplet className="h-12 w-12 text-cyan-600" fill="currentColor" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white">Welcome {riderName}</h1>
              <p className="text-xl text-white/90 mt-2">You have {assignedDeliveries.length} pending deliveries</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true);
                  fetchRiderData();
                }}
                disabled={loading}
                className="h-10 w-10 p-0 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Metrics - Expanded for Desktop */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-bold text-white">{assignedDeliveries.length + completedDeliveries.length}</p>
                <p className="text-sm text-white/80 mt-1">Total Today</p>
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-bold text-white">{completedDeliveries.length}</p>
                <p className="text-sm text-white/80 mt-1">Completed</p>
              </div>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-bold text-white">{assignedDeliveries.length}</p>
                <p className="text-sm text-white/80 mt-1">Pending</p>
              </div>
            </div>

            {/* <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                  <Phone className="h-8 w-8 text-white" />
                </div>
                <p className="text-4xl font-bold text-white">RS. {completedDeliveries.reduce((sum, d) => sum + (d.amount || 0), 0)}</p>
                <p className="text-sm text-white/80 mt-1">Earnings</p>
              </div>
            </div> */}
          </div>

          {/* Actions - Desktop (Order history + optional create enroute) */}
          <div className="mt-6 mb-2 flex items-center justify-between">
            <Link to="/rider/history">
              <Button className="bg-transparent backdrop-blur-sm text-white border-white rounded-full px-4 py-2 hover:bg-white/20" variant="outline" size="sm">
                View Order History
              </Button>
            </Link>
            {canCreateOrders && (
              <Link to="/rider/enroute">
                <Button size="sm" variant="outline" className="bg-white/10 border-white text-white hover:bg-white/20">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  New enroute order
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Section - White Background */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cyan-100">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex rounded-full border-2 border-cyan-100 bg-cyan-50 p-1 w-fit mx-auto">
              <button
                onClick={() => setActiveTab("assigned")}
                className={`px-8 py-3 rounded-full font-medium transition-all ${activeTab === "assigned"
                  ? "bg-white text-cyan-700 shadow-md"
                  : "text-cyan-600"
                  }`}
              >
                Assigned ({assignedDeliveries.length})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-8 py-3 rounded-full font-medium transition-all ${activeTab === "completed"
                  ? "bg-white text-green-700 shadow-md"
                  : "text-cyan-600"
                  }`}
              >
                Completed ({completedDeliveries.length})
              </button>
            </div>

            {/* Today's Delivery Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 border border-blue-200 h-full">
                <div className="flex items-center gap-4 h-full">
                  <div className="w-14 h-14 bg-blue-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-blue-700 font-medium mb-1">Total Current Order</p>
                    <p className="text-3xl font-bold text-blue-900">RS. {totalCurrentOrderAmount}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-3xl p-6 border border-green-200 h-full">
                <div className="flex items-center gap-4 h-full">
                  <div className="w-14 h-14 bg-green-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-8 w-8 text-green-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-green-700 font-medium mb-1">Total Received</p>
                    <p className="text-3xl font-bold text-green-900">RS. {totalReceivedAmount}</p>
                  </div>
                </div>
              </div>
              <div className={`bg-gradient-to-br rounded-3xl p-6 border h-full ${isRecovery
                  ? 'from-purple-50 to-purple-100 border-purple-200'
                  : 'from-red-50 to-red-100 border-red-200'
                }`}>
                <div className="flex items-center gap-4 h-full">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${isRecovery ? 'bg-purple-200' : 'bg-red-200'
                    }`}>
                    <Package className={`h-8 w-8 ${isRecovery ? 'text-purple-700' : 'text-red-700'
                      }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium mb-1 ${isRecovery ? 'text-purple-700' : 'text-red-700'
                      }`}>{thirdMetricLabel}</p>
                    <p className={`text-3xl font-bold ${isRecovery ? 'text-purple-900' : 'text-red-900'
                      }`}>RS. {thirdMetricAmount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery List */}
            {activeTab === "assigned" && (
              <div className="grid gap-4 grid-cols-2">
                {assignedDeliveries.length === 0 ? (
                  <div className="col-span-2 text-center py-16">
                    <Package className="h-20 w-20 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg text-gray-500">No assigned deliveries</p>
                  </div>
                ) : (
                  assignedDeliveries.map((delivery) => (
                    <Link key={delivery.originalId} to={`/rider/orders/${delivery.originalId}`}>
                      <div className="bg-gradient-to-br from-white to-cyan-50/30 rounded-2xl p-6 border border-cyan-100 hover:shadow-lg transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-bold text-gray-900">{delivery.customer}</p>
                              <Badge className="bg-cyan-100 text-cyan-700">Assigned</Badge>
                            </div>
                            <p className="text-sm text-gray-500">{delivery.phone}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="line-clamp-2">{delivery.address || 'Address not available'}</span>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <p className="text-sm text-gray-500">{delivery.bottles} bottles</p>
                            <p className="font-bold text-xl text-cyan-700">RS. {delivery.amount}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === "completed" && (
              <div className="space-y-6">
                <div className="grid gap-4 grid-cols-2">
                  {completedDeliveries.length === 0 ? (
                    <div className="col-span-2 text-center py-16">
                      <CheckCircle className="h-20 w-20 mx-auto text-gray-300 mb-4" />
                      <p className="text-lg text-gray-500">No completed deliveries</p>
                    </div>
                  ) : (
                    completedDeliveries.map((delivery) => (
                      <Link key={delivery.originalId} to={`/rider/orders/${delivery.originalId}`}>
                        <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-6 border border-green-100 hover:shadow-lg transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-bold text-gray-900">{delivery.customer}</p>
                                <Badge className="bg-green-600 text-white">Completed</Badge>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4 flex-shrink-0" />
                              <span className="line-clamp-2">{delivery.address || 'Address not available'}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Total</p>
                                <p className="font-bold text-xl text-green-700">RS. {delivery.amount}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500 mb-1">Paid</p>
                                <p className="font-bold text-lg text-green-600">RS. {delivery.paidAmount || 0}</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t">
                              <Badge className={getPaymentStatusBadge(delivery.paymentStatus).className}>
                                {getPaymentStatusBadge(delivery.paymentStatus).text}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>


              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderDashboard;
