import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Phone, Calendar as CalendarIcon, Package, MapPin, DollarSign, Clock, ChevronDown, FileText, Download } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiService } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getTodayPktDate, formatPktDate, formatPktDateTime12Hour, formatPktTime12Hour } from "@/utils/timezone";

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
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    email: string;
    phone: string;
    role: string;
    isActive: boolean;
  };
  orders: Array<{
    id: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    createdAt: string;
    deliveredAt?: string;
    customer: {
      name: string;
      phone: string;
    };
  }>;
}

interface RiderStats {
  totalDeliveries: number;
  todaysDeliveries: number;
  todaysPending: number;
  weeklyDeliveries: number;
  monthlyDeliveries: number;
  todaysReceivedAmount: number;
  todaysTotalAmount: number;
  totalEarnings: number;
}

interface ReportData {
  riderName: string;
  period: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalAmount: number;
  receivedAmount: number;
  orders: Order[];
}

const RiderDetail = () => {
  const { id } = useParams();
  const [rider, setRider] = useState<Rider | null>(null);
  const [stats, setStats] = useState<RiderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersByDate, setOrdersByDate] = useState<Record<string, Order[]>>({});
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [fromDateOpen, setFromDateOpen] = useState(false);
  const [toDateOpen, setToDateOpen] = useState(false);

  const updateStatsWithOrdersData = (orders: Order[]) => {
    const today = getTodayPktDate();

    // Filter orders for today
    const todaysOrders = orders.filter(order => order.date === today);

    // Calculate correct amounts
    const todaysTotalAmount = todaysOrders.reduce((sum, order) => sum + order.amount, 0);
    const todaysReceivedAmount = todaysOrders.reduce((sum, order) => sum + order.paidAmount, 0);

    console.log('Updating stats with orders data:', {
      todaysTotalAmount,
      todaysReceivedAmount,
      ordersCount: todaysOrders.length,
      todaysOrders: todaysOrders.map(o => ({ id: o.id, amount: o.amount, paidAmount: o.paidAmount }))
    });

    // Update stats with correct values
    setStats(prev => {
      if (!prev) return null;
      console.log('Previous stats:', prev);
      const newStats = {
        ...prev,
        todaysTotalAmount,
        todaysReceivedAmount
      };
      console.log('New stats:', newStats);
      return newStats;
    });
  };

  const fetchAllOrdersForRider = async () => {
    if (!id) return;

    console.log(`Fetching all orders for rider: ${id}`);
    setLoadingOrders(true);

    try {
      const response = await apiService.getOrders({ riderId: id }) as { success: boolean; data: Order[]; message?: string };
      console.log('All orders API response:', response);

      if (response.success) {
        // Transform the data to include paymentStatus if missing
        const transformedData = response.data.map(order => ({
          ...order,
          paymentStatus: order.paymentStatus || (order.paid ? 'paid' : 'not_paid')
        }));

        // Group orders by date
        const groupedByDate: Record<string, Order[]> = {};
        const dates: string[] = [];

        transformedData.forEach(order => {
          const date = order.date;
          if (!groupedByDate[date]) {
            groupedByDate[date] = [];
            dates.push(date);
          }
          groupedByDate[date].push(order);
        });

        // Sort dates in descending order (most recent first)
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        console.log('Grouped orders by date:', groupedByDate);
        console.log('Available dates:', dates);

        setOrdersByDate(groupedByDate);
        setAvailableDates(dates);

        // Update stats with correct received amount from orders data
        updateStatsWithOrdersData(transformedData);

        // Auto-expand today's date if it exists
        const today = getTodayPktDate();
        if (dates.includes(today)) {
          setExpandedDates(new Set([today]));
        }
      }
    } catch (error) {
      console.error('Error fetching all orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const generateReport = async () => {
    if (!rider || !reportDateRange.from || !reportDateRange.to) return;

    setGeneratingReport(true);
    try {
      // Get all orders for the rider in the selected date range
      const response = await apiService.getOrders({ 
        riderId: id,
        startDate: reportDateRange.from.toISOString().split('T')[0],
        endDate: reportDateRange.to.toISOString().split('T')[0]
      }) as { success: boolean; data: Order[]; message?: string };

      if (response.success) {
        const orders = response.data;
        const completedOrders = orders.filter(order => order.status === 'DELIVERED');
        const pendingOrders = orders.filter(order => 
          order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS'
        );
        
        const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);
        const receivedAmount = orders.reduce((sum, order) => sum + order.paidAmount, 0);

        const report: ReportData = {
          riderName: rider.name,
          period: `${format(reportDateRange.from, 'MMM dd, yyyy')} - ${format(reportDateRange.to, 'MMM dd, yyyy')}`,
          totalOrders: orders.length,
          completedOrders: completedOrders.length,
          pendingOrders: pendingOrders.length,
          totalAmount,
          receivedAmount,
          orders: orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };

        setReportData(report);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleModalClose = (open: boolean) => {
    setIsReportModalOpen(open);
    if (!open) {
      // Close popovers when modal is closed
      setFromDateOpen(false);
      setToDateOpen(false);
    }
  };

  const downloadReportAsPDF = () => {
    if (!reportData) return;

    // Create a simple HTML report that can be printed as PDF
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Rider Report - ${reportData.riderName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
          .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
          .orders-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .orders-table th, .orders-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .orders-table th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Rider Performance Report</h1>
          <h2>${reportData.riderName}</h2>
          <p>Period: ${reportData.period}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>Total Orders</h3>
            <p>${reportData.totalOrders}</p>
          </div>
          <div class="stat-card">
            <h3>Completed Orders</h3>
            <p>${reportData.completedOrders}</p>
          </div>
          <div class="stat-card">
            <h3>Pending Orders</h3>
            <p>${reportData.pendingOrders}</p>
          </div>
          <div class="stat-card">
            <h3>Total Amount</h3>
            <p>RS ${reportData.totalAmount.toLocaleString()}</p>
          </div>
          <div class="stat-card">
            <h3>Received Amount</h3>
            <p>RS ${reportData.receivedAmount.toLocaleString()}</p>
          </div>
        </div>

        <h3>Order Details</h3>
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Amount</th>
              <th>Paid Amount</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.orders.map(order => `
              <tr>
                <td>${order.id}</td>
                <td>${order.customer}</td>
                <td>${order.phone}</td>
                <td>RS ${order.amount.toLocaleString()}</td>
                <td>RS ${order.paidAmount.toLocaleString()}</td>
                <td>${order.status}</td>
                <td>${formatDate(order.date)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  useEffect(() => {
    const fetchRiderData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const response = await apiService.getRiderById(id);
        console.log('Rider API response:', response);

        if (response && typeof response === 'object' && 'success' in response && response.success) {
          const riderData = (response as { success: boolean; data: Rider; message?: string }).data;
          console.log('Rider data:', riderData);
          setRider(riderData);

          // Calculate stats from the rider data (using PKT dates)
          const todayStr = getTodayPktDate();
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const oneWeekAgoStr = formatPktDate(oneWeekAgo);
          
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          const oneMonthAgoStr = formatPktDate(oneMonthAgo);

          // Today's orders (compare PKT date strings)
          const todaysOrders = riderData.orders.filter(order => {
            const orderDateStr = typeof order.createdAt === 'string' 
              ? (order.createdAt.includes('T') ? formatPktDate(order.createdAt) : order.createdAt)
              : formatPktDate(order.createdAt);
            return orderDateStr === todayStr;
          });

          // Weekly orders
          const weeklyOrders = riderData.orders.filter(order => {
            const orderDateStr = typeof order.createdAt === 'string' 
              ? (order.createdAt.includes('T') ? formatPktDate(order.createdAt) : order.createdAt)
              : formatPktDate(order.createdAt);
            return orderDateStr >= oneWeekAgoStr;
          });

          // Monthly orders
          const monthlyOrders = riderData.orders.filter(order => {
            const orderDateStr = typeof order.createdAt === 'string' 
              ? (order.createdAt.includes('T') ? formatPktDate(order.createdAt) : order.createdAt)
              : formatPktDate(order.createdAt);
            return orderDateStr >= oneMonthAgoStr;
          });

          // Today's completed and pending orders
          const todaysCompleted = todaysOrders.filter(order => order.status === 'DELIVERED');
          const todaysPending = todaysOrders.filter(order =>
            order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS'
          );

          // Today's total amount (all orders for today)
          const todaysTotalAmount = todaysOrders.reduce((sum, order) =>
            sum + parseFloat(order.totalAmount.toString()), 0
          );

          // Today's received amount (from completed deliveries) - using paidAmount
          const todaysReceivedAmount = todaysCompleted.reduce((sum, order) =>
            sum + parseFloat(order.paidAmount.toString()), 0
          );

          console.log('Initial stats calculation:', {
            todaysTotalAmount,
            todaysReceivedAmount,
            todaysOrdersCount: todaysOrders.length,
            todaysCompletedCount: todaysCompleted.length,
            todaysOrders: todaysOrders.map(o => ({ id: o.id, totalAmount: o.totalAmount, paidAmount: o.paidAmount }))
          });

          // All completed orders for total earnings
          const completedOrders = riderData.orders.filter(order => order.status === 'DELIVERED');
          const totalEarnings = completedOrders.reduce((sum, order) =>
            sum + parseFloat(order.paidAmount.toString()), 0
          );

          setStats({
            totalDeliveries: riderData.orders.length,
            todaysDeliveries: todaysCompleted.length,
            todaysPending: todaysPending.length,
            weeklyDeliveries: weeklyOrders.filter(order => order.status === 'DELIVERED').length,
            monthlyDeliveries: monthlyOrders.filter(order => order.status === 'DELIVERED').length,
            todaysReceivedAmount,
            todaysTotalAmount,
            totalEarnings
          });
        } else {
          setError((response as { success: boolean; data: Rider; message?: string }).message || 'Failed to fetch rider data');
        }
      } catch (error) {
        console.error('Error fetching rider data:', error);
        setError('Failed to fetch rider data. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRiderData();
  }, [id]);

  // Load all orders for the rider
  useEffect(() => {
    if (id) {
      console.log(`Loading all orders for rider: ${id}`);
      fetchAllOrdersForRider();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/riders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/riders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Rider Details</h1>
            <p className="text-muted-foreground">Error loading rider information</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!rider || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/riders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Rider Not Found</h1>
            <p className="text-muted-foreground">The requested rider could not be found</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'default';
      case 'assigned':
        return 'secondary';
      case 'in_progress':
        return 'outline';
      case 'pending':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'not_paid':
        return 'bg-red-100 text-red-800';
      case 'overpaid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return formatPktDateTime12Hour(dateString);
  };

  const formatTime = (dateString: string) => {
    return formatPktTime12Hour(dateString);
  };

  const formatDateHeader = (dateString: string) => {
    const todayStr = getTodayPktDate();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = formatPktDate(yesterdayDate);
    const dateStr = formatPktDate(dateString);

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    } else {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      const PKT_OFFSET_HOURS = 5;
      const pktDate = new Date(date.getTime() + (PKT_OFFSET_HOURS * 60 * 60 * 1000));
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[pktDate.getUTCDay()]}, ${String(pktDate.getUTCDate()).padStart(2, '0')} ${months[pktDate.getUTCMonth()]}, ${pktDate.getUTCFullYear()}`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/riders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{rider.name.charAt(0).toUpperCase() + rider.name.slice(1)}</h1>
          <p className="text-muted-foreground">Rider Details</p>
        </div>
        <Dialog open={isReportModalOpen} onOpenChange={handleModalClose}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Rider Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Select Date Range</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Date</label>
                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !reportDateRange.from && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reportDateRange.from ? format(reportDateRange.from, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reportDateRange.from}
                          onSelect={(date) => {
                            setReportDateRange(prev => ({ ...prev, from: date }));
                            setFromDateOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">To Date</label>
                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !reportDateRange.to && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {reportDateRange.to ? format(reportDateRange.to, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reportDateRange.to}
                          onSelect={(date) => {
                            setReportDateRange(prev => ({ ...prev, to: date }));
                            setToDateOpen(false);
                          }}
                          disabled={(date) => reportDateRange.from ? date < reportDateRange.from : false}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button 
                  onClick={generateReport} 
                  disabled={!reportDateRange.from || !reportDateRange.to || generatingReport}
                  className="w-full"
                >
                  {generatingReport ? "Generating..." : "Generate Report"}
                </Button>
              </div>

              {reportData && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Report Generated</h3>
                    <Button onClick={downloadReportAsPDF} variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalOrders}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">{reportData.completedOrders}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{reportData.pendingOrders}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">RS {reportData.totalAmount.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Received Amount</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">RS {reportData.receivedAmount.toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Period</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm text-muted-foreground">{reportData.period}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Order Details</h4>
                    <div className="max-h-60 overflow-y-auto border rounded-lg">
                      <div className="space-y-2 p-4">
                        {reportData.orders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{order.id}</span>
                                <Badge variant={getStatusColor(order.status)}>
                                  {order.status.toLowerCase().replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="text-sm font-medium">{order.customer}</p>
                              <p className="text-sm text-muted-foreground">{order.phone}</p>
                            </div>
                            <div className="text-right space-y-1">
                              <p className="font-medium">RS {order.amount.toLocaleString()}</p>
                              {order.paidAmount > 0 && (
                                <p className="text-sm text-green-600">
                                  Paid: RS {order.paidAmount.toLocaleString()}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">{formatDate(order.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyDeliveries}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Weekly Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyDeliveries}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Delivered:</span>
                <span className="font-bold text-green-600">{stats.todaysDeliveries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending:</span>
                <span className="font-bold text-orange-600">{stats.todaysPending}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Payment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Amount:</span>
                <span className="font-bold text-lg">RS {stats.todaysTotalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Received Amount:</span>
                <span className="font-bold text-lg text-green-600">RS {stats.todaysReceivedAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{rider.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>Joined: {formatDate(rider.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : availableDates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No orders found for this rider</p>
            </div>
          ) : (
            <Accordion type="multiple" value={Array.from(expandedDates)} onValueChange={(values) => {
              setExpandedDates(new Set(values));
            }}>
              {availableDates.map((date) => {
                const orders = ordersByDate[date] || [];

                return (
                  <AccordionItem key={date} value={date}>
                    <AccordionTrigger
                      className="hover:no-underline"
                      onClick={() => handleDateExpand(date)}
                    >
                      <div className="flex items-center justify-between w-full pr-4">
                        {/* <span className="font-medium">{formatDateHeader(date) + <small>"-(" + orders.length + " orders)"</small>}</span> */}
                        <span className="font-medium">
                          {formatDateHeader(date)} <small>- ({orders.length} orders)</small>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">

                          </span>
                          {/* <ChevronDown className="h-4 w-4" /> */}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {orders.map((order) => (
                          <Card key={order.originalId} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{order.id}</p>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {order.status.toLowerCase().replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium">{order.customer}</p>
                                  <p className="text-sm text-muted-foreground">{order.phone}</p>
                                  <div className="flex gap-2 mt-1">
                                    <span className={`px-2 py-0.5 text-xs rounded-md ${order.priority === 'high' ? 'bg-red-100 text-red-700' :
                                      order.priority === 'normal' ? 'bg-green-100 text-green-700' :
                                        'bg-blue-100 text-blue-700'
                                      }`}>
                                      {order.priority}
                                    </span>
                                    <span className={`px-2 py-0.5 text-xs rounded-md ${getPaymentStatusColor(order.paymentStatus)}`}>
                                      {order.paymentStatus.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right space-y-1">
                                  <p className="font-medium">RS {order.amount.toLocaleString()}</p>
                                  {order.paidAmount > 0 && (
                                    <p className="text-sm text-green-600">
                                      Paid: RS {order.paidAmount.toLocaleString()}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatTime(order.date)}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RiderDetail;
