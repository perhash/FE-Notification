import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Package, MapPin, Calendar, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/services/api";
import { getTodayPktDate, formatPktDate, formatPktDateReadable } from "@/utils/timezone";

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

const OrderHistory = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState<string>(getTodayPktDate());

  const { user } = useAuth();
  const riderId = (user as any)?.riderProfile?.id || (user as any)?.profile?.id;
  const navigate = useNavigate();

  // Calculate date range based on time filter (using PKT timezone)
  const getDateRange = () => {
    const todayStr = getTodayPktDate();
    const PKT_OFFSET_HOURS = 5;
    const pktNow = new Date(Date.now() + (PKT_OFFSET_HOURS * 60 * 60 * 1000));
    
    switch (timeFilter) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr };
      case 'week': {
        const dayOfWeek = pktNow.getUTCDay();
        const weekStart = new Date(pktNow);
        weekStart.setUTCDate(pktNow.getUTCDate() - dayOfWeek);
        const weekStartStr = `${weekStart.getUTCFullYear()}-${String(weekStart.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStart.getUTCDate()).padStart(2, '0')}`;
        return { startDate: weekStartStr, endDate: todayStr };
      }
      case 'month': {
        const monthStartStr = `${pktNow.getUTCFullYear()}-${String(pktNow.getUTCMonth() + 1).padStart(2, '0')}-01`;
        return { startDate: monthStartStr, endDate: todayStr };
      }
      case 'year': {
        const yearStartStr = `${pktNow.getUTCFullYear()}-01-01`;
        return { startDate: yearStartStr, endDate: todayStr };
      }
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (!riderId) return;

      const { startDate, endDate } = getDateRange();
      const response = await apiService.getOrders({
        riderId,
        startDate,
        endDate,
        paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
        limit: 1000 // Fetch all orders for the filter range
      }) as any;

      if (response?.success) {
        // Convert order dates to PKT if needed and group by date
        const ordersWithPktDate = (response.data || []).map((order: any) => ({
          ...order,
          date: order.date || formatPktDate(order.createdAt || new Date().toISOString())
        }));
        
        setAllOrders(ordersWithPktDate);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [riderId, timeFilter, paymentStatusFilter]);

  // Update current date when orders change (after filtering)
  useEffect(() => {
    if (allOrders.length > 0) {
      const dates = [...new Set(allOrders.map((o: Order) => o.date))].sort((a, b) => 
        new Date(b).getTime() - new Date(a).getTime()
      );
      const todayPkt = getTodayPktDate();
      // Only update if current date is not in available dates
      if (dates.length > 0 && !dates.includes(currentDate)) {
        // Prefer today if available, otherwise use first date
        setCurrentDate(dates.includes(todayPkt) ? todayPkt : dates[0]);
      }
    }
  }, [allOrders, currentDate]);

  // Group orders by date and get available dates
  const { ordersByDate, availableDates } = useMemo(() => {
    const grouped: Record<string, Order[]> = {};
    allOrders.forEach((order) => {
      const date = order.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(order);
    });

    // Sort orders within each date by creation time (newest first)
    Object.keys(grouped).forEach(date => {
      grouped[date].sort((a, b) => {
        // Sort by originalId or timestamp if available
        return (b.originalId || '').localeCompare(a.originalId || '');
      });
    });

    const dates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return { ordersByDate: grouped, availableDates: dates };
  }, [allOrders]);

  // Get current date orders
  const currentDateOrders = ordersByDate[currentDate] || [];

  // Generate date selector dates (3 left, current, 3 right)
  const dateSelectorDates = useMemo(() => {
    const dates: string[] = [];
    const currentIndex = availableDates.indexOf(currentDate);
    
    // Add 3 dates before current
    for (let i = 3; i >= 1; i--) {
      const targetIndex = currentIndex + i;
      if (targetIndex < availableDates.length) {
        dates.push(availableDates[targetIndex]);
      }
    }
    
    // Add current date
    dates.push(currentDate);
    
    // Add 3 dates after current
    for (let i = 1; i <= 3; i++) {
      const targetIndex = currentIndex - i;
      if (targetIndex >= 0) {
        dates.push(availableDates[targetIndex]);
      }
    }
    
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [availableDates, currentDate]);

  // Navigation handlers
  const handlePreviousDate = () => {
    const currentIndex = availableDates.indexOf(currentDate);
    if (currentIndex < availableDates.length - 1) {
      setCurrentDate(availableDates[currentIndex + 1]);
    }
  };

  const handleNextDate = () => {
    const currentIndex = availableDates.indexOf(currentDate);
    if (currentIndex > 0) {
      setCurrentDate(availableDates[currentIndex - 1]);
    }
  };

  const handleDateSelect = (date: string) => {
    setCurrentDate(date);
  };

  const timeFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
  ];

  const paymentStatusOptions = [
    { value: 'all', label: 'All' },
    { value: 'PAID', label: 'Paid' },
    { value: 'NOT_PAID', label: 'Unpaid' },
    { value: 'OVERPAID', label: 'Overpaid' },
    { value: 'PARTIAL', label: 'Partial' },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 flex-1">
              <Link to="/rider">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Order History</h1>
                <p className="text-sm text-white/90">Your delivery history</p>
              </div>
            </div>
            
            {/* Filter Icon */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Filter className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-0">
                <div className="p-2">
                  <p className="px-3 py-2 text-sm font-semibold text-gray-700">Time Range</p>
                  {timeFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimeFilter(option.value as any);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        timeFilter === option.value
                          ? 'bg-cyan-100 text-cyan-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <p className="px-3 py-2 text-sm font-semibold text-gray-700 mt-2 border-t">Payment Status</p>
                  {paymentStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setPaymentStatusFilter(option.value);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        paymentStatusFilter === option.value
                          ? 'bg-cyan-100 text-cyan-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-t-3xl -mt-10 p-6 min-h-[calc(100vh-300px)]">
          {/* Date Navigation */}
          {!loading && availableDates.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <Button
                  onClick={handlePreviousDate}
                  disabled={availableDates.indexOf(currentDate) >= availableDates.length - 1}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{formatPktDateReadable(currentDate)}</p>
                  <p className="text-xs text-gray-500">{currentDateOrders.length} orders</p>
                </div>
                <Button
                  onClick={handleNextDate}
                  disabled={availableDates.indexOf(currentDate) === 0}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Date Selector (3 left, current, 3 right) */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {dateSelectorDates.map((date) => (
                  <button
                    key={date}
                    onClick={() => handleDateSelect(date)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      date === currentDate
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatPktDateReadable(date).split(',')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : currentDateOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No orders found for {formatPktDateReadable(currentDate)}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDateOrders.map((delivery) => (
                <Link
                  key={delivery.originalId}
                  to={`/rider/orders/${delivery.originalId}`}
                >
                  <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-4 border border-green-100 hover:shadow-lg transition-all duration-300 active:scale-[0.99]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-gray-900">{delivery.id}</p>
                          <Badge className="bg-green-600 text-white">
                            {delivery.status === 'delivered' ? 'Completed' : delivery.status}
                          </Badge>
                        </div>
                        <p className="font-semibold text-gray-800">
                          {delivery.customer}
                        </p>
                        <p className="text-sm text-gray-500">{delivery.phone}</p>
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
                        <span className="line-clamp-1 text-xs">
                          {delivery.address || "Address not available"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <p className="text-xs">{delivery.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-gray-500">
                        {delivery.bottles} bottles
                      </p>
                      <p className="text-xs text-gray-600">
                        Paid: <span className="font-semibold text-green-600">RS. {delivery.paidAmount || 0}</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-700 rounded-3xl p-8 shadow-2xl mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/rider">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-6 w-6" />
                </Button>
              </Link>
              <div>
                <h1 className="text-4xl font-bold text-white">Order History</h1>
                <p className="text-xl text-white/90 mt-2">Your complete delivery history</p>
              </div>
            </div>
            
            {/* Filter Icon */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <Filter className="h-10 w-10" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-0">
                <div className="p-2">
                  <p className="px-3 py-2 text-sm font-semibold text-gray-700">Time Range</p>
                  {timeFilterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimeFilter(option.value as any);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        timeFilter === option.value
                          ? 'bg-cyan-100 text-cyan-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <p className="px-3 py-2 text-sm font-semibold text-gray-700 mt-2 border-t">Payment Status</p>
                  {paymentStatusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setPaymentStatusFilter(option.value);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        paymentStatusFilter === option.value
                          ? 'bg-cyan-100 text-cyan-700 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Date Navigation */}
        {!loading && availableDates.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-8 border border-cyan-100">
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={handlePreviousDate}
                disabled={availableDates.indexOf(currentDate) >= availableDates.length - 1}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <ChevronLeft className="h-5 w-5" />
                Previous Date
              </Button>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatPktDateReadable(currentDate)}</p>
                <p className="text-sm text-gray-500 mt-1">{currentDateOrders.length} orders</p>
              </div>
              <Button
                onClick={handleNextDate}
                disabled={availableDates.indexOf(currentDate) === 0}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                Next Date
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Date Selector (3 left, current, 3 right) */}
            <div className="flex gap-3 justify-center flex-wrap">
              {dateSelectorDates.map((date) => (
                <button
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    date === currentDate
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {formatPktDateReadable(date)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Orders Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            <div className="col-span-2 text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading orders...</p>
            </div>
          ) : currentDateOrders.length === 0 ? (
            <div className="col-span-2 text-center py-16">
              <Package className="h-20 w-20 mx-auto text-gray-300 mb-4" />
              <p className="text-lg text-gray-500">No orders found for {formatPktDateReadable(currentDate)}</p>
            </div>
          ) : (
            currentDateOrders.map((delivery) => (
              <Link key={delivery.originalId} to={`/rider/orders/${delivery.originalId}`}>
                <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-6 border border-green-100 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-bold text-gray-900">{delivery.id}</p>
                        <Badge className="bg-green-600 text-white">
                          {delivery.status === 'delivered' ? 'Completed' : delivery.status}
                        </Badge>
                      </div>
                      <p className="font-semibold text-gray-800 mb-1">{delivery.customer}</p>
                      <p className="text-sm text-gray-500">{delivery.phone}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="line-clamp-2">{delivery.address || 'Address not available'}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Date</p>
                        <div className="flex items-center gap-1 text-sm text-gray-700">
                          <Calendar className="h-4 w-4" />
                          <span>{delivery.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-xl font-bold text-green-700">RS. {delivery.amount}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Bottles</p>
                        <p className="font-semibold">{delivery.bottles}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Paid</p>
                        <p className="font-semibold text-green-600">RS. {delivery.paidAmount || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Status</p>
                        <Badge className={getPaymentStatusBadge(delivery.paymentStatus).className}>
                          {getPaymentStatusBadge(delivery.paymentStatus).text}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderHistory;

