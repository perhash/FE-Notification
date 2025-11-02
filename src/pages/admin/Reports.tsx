import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, Users, Package, TruckIcon, DollarSign, BarChart3, Calendar } from "lucide-react";
import { apiService } from "@/services/api";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatPktDate } from "@/utils/timezone";

// Helper to format PKT date string for charts (dates are already in PKT format from backend)
const formatChartDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
};

const formatChartDateFull = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
};

const Reports = () => {
  const { user } = useAuth();
  const adminName = (user as any)?.profile?.name || "Admin";

  // Filter states
  const [period, setPeriod] = useState<string>("monthly");
  const [entity, setEntity] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("orders");
  const [reportPeriod, setReportPeriod] = useState<string>("monthly");

  // Data states
  const [analytics, setAnalytics] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      console.log('Fetching analytics with:', { period, entity });
      const response = await apiService.getAnalytics(period, entity) as any;
      console.log('Analytics response:', response);
      if (response.success) {
        setAnalytics(response.data);
      } else {
        console.error('Analytics response not successful:', response);
        toast.error(response.message || "Failed to fetch analytics");
      }
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast.error(error?.message || "Failed to fetch analytics");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch report data for download
  const fetchReportData = async () => {
    try {
      setLoadingReport(true);
      const response = await apiService.getReportData(reportPeriod, reportType) as any;
      if (response.success) {
        setReportData(response.data);
      }
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      toast.error(error?.message || "Failed to fetch report data");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, entity]);

  useEffect(() => {
    fetchReportData();
  }, [reportPeriod, reportType]);

  // Download report as CSV
  const downloadReport = () => {
    if (!reportData || reportData.length === 0) {
      toast.error("No data to download");
      return;
    }

    let csv = "";
    let headers: string[] = [];
    let rows: any[] = [];

    if (reportType === "orders") {
      headers = ["Order ID", "Date", "Customer", "Phone", "Rider", "Bottles", "Amount", "Status", "Payment Status"];
      rows = reportData.map((item: any) => [
        item.id,
        item.date || formatPktDate(new Date()),
        item.customer,
        item.phone,
        item.rider,
        item.bottles,
        item.amount,
        item.status,
        item.paymentStatus
      ]);
    } else if (reportType === "customers") {
      headers = ["Customer ID", "Name", "Phone", "Address", "Joined Date", "Status", "Total Orders", "Delivered Orders", "Total Revenue"];
      rows = reportData.map((item: any) => [
        item.id,
        item.name,
        item.phone,
        item.address,
        item.joinedDate ? formatPktDate(item.joinedDate) : formatPktDate(new Date()),
        item.status,
        item.totalOrders,
        item.deliveredOrders,
        item.totalRevenue
      ]);
    } else if (reportType === "riders") {
      headers = ["Rider ID", "Name", "Phone", "Joined Date", "Status", "Total Deliveries", "Pending Deliveries", "Total Revenue"];
      rows = reportData.map((item: any) => [
        item.id,
        item.name,
        item.phone,
        item.joinedDate ? formatPktDate(item.joinedDate) : formatPktDate(new Date()),
        item.status,
        item.totalDeliveries,
        item.pendingDeliveries,
        item.totalRevenue
      ]);
    }

    csv = headers.join(",") + "\n";
    rows.forEach((row) => {
      csv += row.map((cell: any) => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}_${reportPeriod}_${formatPktDate(new Date())}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report downloaded successfully");
  };

  const periodOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
    { value: "alltime", label: "All Time" }
  ];

  const entityOptions = [
    { value: "all", label: "All" },
    { value: "orders", label: "Orders" },
    { value: "customers", label: "Customers" },
    { value: "riders", label: "Riders" }
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Blue Gradient Header */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-white/90">Welcome back,</p>
              <p className="text-2xl font-bold text-white">{adminName}</p>
            </div>
          </div>
          <p className="text-white/90 text-lg font-semibold">Reports & Analytics</p>
        </div>
        
        {/* White Content Section */}
        <div className="bg-white rounded-t-3xl -mt-10 p-6 space-y-6 pb-32">
          {/* Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analytics Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">View</label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Summary Metrics */}
          {loading && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Loading analytics data...</p>
              </CardContent>
            </Card>
          )}
          {!loading && !analytics && (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No analytics data available. Try changing the filters.</p>
              </CardContent>
            </Card>
          )}
          {!loading && analytics && (
            <div className="grid grid-cols-2 gap-4">
              {analytics.orders && (
                <>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-700 font-medium">Total Orders</p>
                          <p className="text-2xl font-bold text-blue-900">{analytics.orders.total}</p>
                        </div>
                        <Package className="h-8 w-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-700 font-medium">Revenue</p>
                          <p className="text-lg font-bold text-green-900">RS. {Number(analytics.orders.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-cyan-700 font-medium">Delivered</p>
                          <p className="text-xl font-bold text-cyan-900">{analytics.orders.delivered}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-cyan-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-orange-700 font-medium">Pending Delivery</p>
                          <p className="text-xl font-bold text-orange-900">{analytics.orders.pending}</p>
                        </div>
                        <Package className="h-8 w-8 text-orange-600" />
                      </div>
                    </CardContent>
                  </Card>
                  {analytics.orders.walkIn && (
                    <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-violet-700 font-medium">Walk-in Orders</p>
                            <p className="text-xl font-bold text-violet-900">{analytics.orders.walkIn.total}</p>
                          </div>
                          <Users className="h-8 w-8 text-violet-600" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
              {analytics.customers && (
                <>
                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-700 font-medium">Total Customers</p>
                          <p className="text-2xl font-bold text-purple-900">{analytics.customers.total}</p>
                        </div>
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-teal-700 font-medium">Active</p>
                          <p className="text-xl font-bold text-teal-900">{analytics.customers.active}</p>
                        </div>
                        <Users className="h-8 w-8 text-teal-600" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
              {analytics.riders && (
                <>
                  <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-indigo-700 font-medium">Total Riders</p>
                          <p className="text-2xl font-bold text-indigo-900">{analytics.riders.total}</p>
                        </div>
                        <TruckIcon className="h-8 w-8 text-indigo-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-pink-700 font-medium">Deliveries</p>
                          <p className="text-xl font-bold text-pink-900">{analytics.riders.totalDeliveries}</p>
                        </div>
                        <TruckIcon className="h-8 w-8 text-pink-600" />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
      </div>
          )}

          {/* Charts */}
          {!loading && analytics && analytics.orders && analytics.orders.chartData && analytics.orders.chartData.length > 0 && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-bold text-gray-800">Orders Analytics</span>
                  </div>
                </CardTitle>
          </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer 
                  config={{ 
                    orders: { label: "Orders", color: "#3b82f6" },
                    delivered: { label: "Delivered", color: "#10b981" },
                    pending: { label: "Pending", color: "#f59e0b" }
                  }} 
                  className="h-[280px] w-full"
                >
                  <AreaChart data={analytics.orders.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        if (!value) return '';
                        return formatChartDate(String(value));
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-2">
                                {payload[0].payload.date ? formatChartDateFull(String(payload[0].payload.date)) : ''}
                              </p>
                              <div className="space-y-1">
                                {payload.map((entry, index) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-xs text-gray-600">{entry.name}</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-900">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fill="url(#ordersGradient)"
                      fillOpacity={1}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ChartContainer>
          </CardContent>
        </Card>
          )}

          {/* Download Report Section */}
        <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Reports
              </CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="riders">Riders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={downloadReport} disabled={loadingReport || reportData.length === 0} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                {loadingReport ? "Loading..." : `Download ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`}
              </Button>
              {reportData.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  {reportData.length} records ready to download
                </p>
              )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 rounded-2xl p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/90 text-sm mb-1">Welcome back, {adminName}</p>
              <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                <BarChart3 className="h-10 w-10" />
                Reports & Analytics
              </h1>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Analytics Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Period</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">View</label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        {loading && (
        <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Loading analytics data...</p>
            </CardContent>
          </Card>
        )}
        {!loading && analytics && (
          <div className="grid grid-cols-4 gap-4">
            {analytics.orders && (
              <>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-700 font-medium mb-1">Total Orders</p>
                        <p className="text-3xl font-bold text-blue-900">{analytics.orders.total}</p>
                      </div>
                      <Package className="h-10 w-10 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-700 font-medium mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-900">RS. {Number(analytics.orders.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <DollarSign className="h-10 w-10 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-cyan-700 font-medium mb-1">Delivered</p>
                        <p className="text-3xl font-bold text-cyan-900">{analytics.orders.delivered}</p>
                      </div>
                      <TrendingUp className="h-10 w-10 text-cyan-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-700 font-medium mb-1">Pending Delivery</p>
                        <p className="text-3xl font-bold text-orange-900">{analytics.orders.pending}</p>
                      </div>
                      <Package className="h-10 w-10 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
                {analytics.orders.walkIn && (
                  <>
                    <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-violet-700 font-medium mb-1">Walk-in Orders</p>
                            <p className="text-3xl font-bold text-violet-900">{analytics.orders.walkIn.total}</p>
                          </div>
                          <Users className="h-10 w-10 text-violet-600" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-pink-700 font-medium mb-1">Walk-in Revenue</p>
                            <p className="text-xl font-bold text-pink-900">RS. {Number(analytics.orders.walkIn.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <DollarSign className="h-10 w-10 text-pink-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
            {analytics.customers && (
              <>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-700 font-medium mb-1">Total Customers</p>
                        <p className="text-3xl font-bold text-purple-900">{analytics.customers.total}</p>
                      </div>
                      <Users className="h-10 w-10 text-purple-600" />
                    </div>
          </CardContent>
        </Card>
                <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-teal-700 font-medium mb-1">Active Customers</p>
                        <p className="text-3xl font-bold text-teal-900">{analytics.customers.active}</p>
      </div>
                      <Users className="h-10 w-10 text-teal-600" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            {analytics.riders && (
              <>
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-indigo-700 font-medium mb-1">Total Riders</p>
                        <p className="text-3xl font-bold text-indigo-900">{analytics.riders.total}</p>
                      </div>
                      <TruckIcon className="h-10 w-10 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-pink-700 font-medium mb-1">Total Deliveries</p>
                        <p className="text-3xl font-bold text-pink-900">{analytics.riders.totalDeliveries}</p>
                      </div>
                      <TruckIcon className="h-10 w-10 text-pink-600" />
                  </div>
                </CardContent>
              </Card>
              </>
            )}
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {!loading && analytics && analytics.orders && analytics.orders.chartData && analytics.orders.chartData.length > 0 && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50/30 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-lg">Orders Over Time</span>
                      <p className="text-xs text-gray-500 mt-0.5">{analytics.orders.total} total orders</p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer 
                  config={{ 
                    orders: { label: "Orders", color: "#3b82f6" },
                    delivered: { label: "Delivered", color: "#10b981" },
                    pending: { label: "Pending", color: "#f59e0b" }
                  }} 
                  className="h-[320px] w-full"
                >
                  <AreaChart data={analytics.orders.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ordersGradientDesktop" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        if (!value) return '';
                        return formatChartDate(String(value));
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 backdrop-blur-sm">
                              <p className="text-sm font-bold text-gray-900 mb-2.5">
                                {payload[0].payload.date ? formatChartDateFull(String(payload[0].payload.date)) : ''}
                              </p>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-xs font-medium text-gray-600">Total Orders</span>
                                  </div>
                                  <span className="text-sm font-bold text-gray-900">{payload.find(p => p.dataKey === 'orders')?.value || 0}</span>
                                </div>
                                {payload[0].payload.delivered !== undefined && (
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-green-500" />
                                      <span className="text-xs font-medium text-gray-600">Delivered</span>
                                    </div>
                                    <span className="text-sm font-bold text-green-600">{payload[0].payload.delivered}</span>
                                  </div>
                                )}
                                {payload[0].payload.pending !== undefined && (
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                                      <span className="text-xs font-medium text-gray-600">Pending</span>
                                    </div>
                                    <span className="text-sm font-bold text-amber-600">{payload[0].payload.pending}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="orders"
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fill="url(#ordersGradientDesktop)"
                      fillOpacity={1}
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ChartContainer>
        </CardContent>
      </Card>
          )}

          {!loading && analytics && analytics.customers && analytics.customers.chartData && analytics.customers.chartData.length > 0 && (
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-purple-50/30 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-lg">Customers Growth</span>
                      <p className="text-xs text-gray-500 mt-0.5">{analytics.customers.total} total customers</p>
                    </div>
                  </div>
                </CardTitle>
        </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer 
                  config={{ 
                    customers: { label: "Customers", color: "#a855f7" }
                  }} 
                  className="h-[320px] w-full"
                >
                  <LineChart data={analytics.customers.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        if (!value) return '';
                        return formatChartDate(String(value));
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                              <p className="text-sm font-bold text-gray-900 mb-2.5">
                                {payload[0].payload.date ? formatChartDateFull(String(payload[0].payload.date)) : ''}
                              </p>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                                  <span className="text-xs font-medium text-gray-600">New Customers</span>
                                </div>
                                <span className="text-sm font-bold text-purple-600">{payload[0].value}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="customers" 
                      stroke="#a855f7" 
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#a855f7', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#a855f7', strokeWidth: 3, stroke: '#fff' }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {!loading && analytics && analytics.riders && analytics.riders.chartData && analytics.riders.chartData.length > 0 && (
            <Card className="lg:col-span-2 shadow-lg border-0 bg-gradient-to-br from-white to-indigo-50/30 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md">
                      <TruckIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800 text-lg">Riders Performance</span>
                      <p className="text-xs text-gray-500 mt-0.5">{analytics.riders.totalDeliveries} total deliveries</p>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ChartContainer 
                  config={{ 
                    deliveries: { label: "Deliveries", color: "#6366f1" },
                    revenue: { label: "Revenue", color: "#8b5cf6" }
                  }} 
                  className="h-[320px] w-full"
                >
                  <BarChart data={analytics.riders.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => {
                        if (!value) return '';
                        return formatChartDate(String(value));
                      }}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: '#6b7280', fontWeight: 500 }}
                      tickLine={false}
                      axisLine={false}
                      width={45}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                              <p className="text-sm font-bold text-gray-900 mb-2.5">
                                {payload[0].payload.date ? formatChartDateFull(String(payload[0].payload.date)) : ''}
                              </p>
                              <div className="space-y-2">
                                {payload.map((entry, index) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-xs font-medium text-gray-600">{entry.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="deliveries" 
                      fill="#6366f1"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
                </CardContent>
              </Card>
          )}
        </div>

        {/* Download Report Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orders">Orders</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="riders">Riders</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Period</label>
                <Select value={reportPeriod} onValueChange={setReportPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={downloadReport} disabled={loadingReport || reportData.length === 0} size="lg">
                <Download className="mr-2 h-4 w-4" />
                {loadingReport ? "Loading..." : "Download Report"}
              </Button>
          </div>
            {reportData.length > 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                {reportData.length} records ready to download
              </p>
            )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Reports;
