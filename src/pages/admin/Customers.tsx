import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Phone, Plus, Edit, Eye, MapPin, DollarSign, Users, RefreshCw, Droplet } from "lucide-react";
import { Link } from "react-router-dom";
import { AddCustomerDialog } from "@/components/admin/AddCustomerDialog";
import { CustomerStatusToggle } from "@/components/admin/CustomerStatusToggle";
import { EditCustomerDialog } from "@/components/admin/EditCustomerDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiService } from "@/services/api";

const Customers = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Check URL params for filter
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'receivable' || filterParam === 'payable') {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiService.getCustomers(statusFilter !== 'all' ? statusFilter : undefined);

        if (response.success) {
          setCustomers(response.data);
        } else {
          setError(response.message || 'Failed to fetch customers');
        }
      } catch (error) {
        console.error('Error fetching customers:', error);
        setError('Failed to fetch customers. Please check your connection and try again.');
        setCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [statusFilter]);

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && customer.isActive !== false) ||
      (statusFilter === "inactive" && customer.isActive === false) ||
      (statusFilter === "payable" && customer.currentBalance < 0) ||
      (statusFilter === "receivable" && customer.currentBalance > 0);

    return matchesSearch && matchesStatus;
  });

  // Quick metrics for header (based on current filter results)
  const totalCount = filteredCustomers.length;
  const activeCount = filteredCustomers.filter((c: any) => c.isActive !== false).length;
  const payableCount = filteredCustomers.filter((c: any) => (c.currentBalance || 0) < 0).length;
  const receivableCount = filteredCustomers.filter((c: any) => (c.currentBalance || 0) > 0).length;

  const handleEditCustomer = (customer) => {
    setSelectedCustomer({ id: customer.id });
    setEditDialogOpen(true);
  };

  const handleCustomerUpdated = (updatedCustomer) => {
    setCustomers(prev =>
      prev.map(c =>
        c.id === updatedCustomer.id ? updatedCustomer : c
      )
    );
    setEditDialogOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6">

      {/* Mobile Layout - Gradient header + actions + cards */}
      <div className="md:hidden">
        {/* Top Blue Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6">
          {/* Welcome / Title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Droplet className="h-8 w-8 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Customers</h1>
              <p className="text-sm text-white/90">Manage your customer base</p>
            </div>
          </div>

          {/* Metrics 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{totalCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{activeCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Active</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{payableCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Payable</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{receivableCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Receivable</p>
            </div>
          </div>
        </div>

        {/* White Section - actions & list */}
        <div className="bg-white rounded-t-3xl -mt-5 p-6 space-y-4">
          {/* Actions: Search, Filter, Add */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="active">Active Accounts</SelectItem>
                  <SelectItem value="inactive">Inactive Accounts</SelectItem>
                  <SelectItem value="payable">Payable (Negative Balance)</SelectItem>
                  <SelectItem value="receivable">Receivable (Positive Balance)</SelectItem>
                </SelectContent>
              </Select>

              <AddCustomerDialog />
            </div>

            <div className="relative">
              <div className="flex flex-row justify-between items-center">
                <div><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 "
                  /></div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLoading(true);
                      // re-trigger effect by toggling same filter (no-op) or manually call
                      (async () => {
                        try {
                          const res = await apiService.getCustomers(statusFilter !== 'all' ? statusFilter : undefined);
                          if ((res as any)?.success) setCustomers((res as any).data);
                        } catch (e) {
                          setError('Failed to fetch customers. Please check your connection and try again.');
                        } finally {
                          setLoading(false);
                        }
                      })();
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>


          </div>

          {/* Mobile list states & cards */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading customers...</div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true);
                  (async () => {
                    try {
                      const res = await apiService.getCustomers(statusFilter !== 'all' ? statusFilter : undefined);
                      if ((res as any)?.success) setCustomers((res as any).data);
                    } finally {
                      setLoading(false);
                    }
                  })();
                }}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomers.map((customer: any) => (
                <div key={customer.id} className="bg-white rounded-2xl p-4 border border-cyan-100 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{customer.name}</p>
                      <p className="text-xs text-gray-500">ID: {customer.id.slice(-6)}</p>
                    </div>
                    <CustomerStatusToggle
                      customerId={customer.id}
                      isActive={customer.isActive !== false}
                      onStatusChange={(isActive) => {
                        setCustomers(prev => prev.map((c: any) => c.id === customer.id ? { ...c, isActive } : c));
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="h-4 w-4" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.whatsapp && (
                      <div className="flex items-center gap-2 text-green-600">
                        <span className="text-xs">📱</span>
                        <span>{customer.whatsapp}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-2">{customer.address || 'No address'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-700">Bottles</p>
                        <p className="text-sm font-semibold text-blue-900">{customer.bottleCount || 0}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-purple-700">Refill</p>
                        <p className="text-sm font-semibold text-purple-900">{customer.avgDaysToRefill || '-'}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-amber-700">Orders</p>
                        <p className="text-sm font-semibold text-amber-900">{customer.totalOrders || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <Badge
                          variant={
                            (customer.currentBalance || 0) < 0 ? 'destructive' : (customer.currentBalance || 0) > 0 ? 'default' : 'secondary'
                          }
                        >
                          {(customer.currentBalance || 0) < 0 ? 'Payable' : (customer.currentBalance || 0) > 0 ? 'Receivable' : 'Clear'}
                        </Badge>
                        <span className="ml-2 text-sm font-medium">Rs {Math.abs(customer.currentBalance || 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/customers/${customer.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleEditCustomer(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.lastOrder ? (
                        <span>Last: {customer.lastOrder.id} • Rs {customer.lastOrder.amount} • {customer.lastOrder.date} • {customer.lastOrder.status}</span>
                      ) : (
                        <span>No orders</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* Desktop Header + White Container */}
      <div className="hidden md:block max-w-4xl mx-auto ">
        {/* Blue Gradient Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-8 shadow-2xl rounded-3xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
              <Droplet className="h-12 w-12 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Customers</h1>
              <p className="text-white/90 mt-1">Manage your customer base</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{totalCount}</p>
              <p className="text-sm text-white/80 mt-1">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{activeCount}</p>
              <p className="text-sm text-white/80 mt-1">Active</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{payableCount}</p>
              <p className="text-sm text-white/80 mt-1">Payable</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{receivableCount}</p>
              <p className="text-sm text-white/80 mt-1">Receivable</p>
            </div>
          </div>
        </div>

        {/* White container with existing table card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cyan-100">
          <Card>
            <CardHeader>


              <div className="flex flex-col gap-2 md:flex-col md:items-center max-w-4xl  ">
                <div className="flex flex-row w-full justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Customers ({filteredCustomers.length})
                  </CardTitle>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-full md:w-[300px]"
                  />
                </div>
                {/* <div className="flex justify-start items-center gap-2"> */}
                <div className="flex flex-row w-full justify-between items-center">

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Customers</SelectItem>
                      <SelectItem value="active">Active Accounts</SelectItem>
                      <SelectItem value="inactive">Inactive Accounts</SelectItem>
                      <SelectItem value="payable">Payable (Negative Balance)</SelectItem>
                      <SelectItem value="receivable">Receivable (Positive Balance)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className=" flex flex-row justify-end items-center gap-2">

                    <div>
                      <AddCustomerDialog />
                    </div>
                  </div>
                </div>

              </div>

            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading customers...</div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Error loading customers</h3>
                  <p className="text-muted-foreground text-center mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLoading(true);
                      fetchCustomers();
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No customers found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No customers match your current filters. Try adjusting your search or filter criteria.'
                      : 'No customers have been added yet. Click "Add Customer" to get started.'
                    }
                  </p>
                  {(!searchQuery && statusFilter === 'all') && (
                    <AddCustomerDialog />
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Bottles</TableHead>
                        <TableHead>Refill Days</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Last Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {customer.id.slice(-6)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                              {customer.whatsapp && (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <span className="text-xs">📱</span>
                                  {customer.whatsapp}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px]">
                              <div className="flex items-start gap-2 text-sm">
                                <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                                <span className="text-muted-foreground truncate">
                                  {customer.address || "No address"}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium text-lg">{customer.bottleCount || 0}</div>
                              <div className="text-xs text-muted-foreground">bottles</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">
                                {customer.avgDaysToRefill ? `${customer.avgDaysToRefill}` : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">days</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-right">
                              <Badge
                                variant={
                                  customer.currentBalance < 0
                                    ? "destructive"
                                    : customer.currentBalance > 0
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {customer.currentBalance < 0
                                  ? "Payable"
                                  : customer.currentBalance > 0
                                    ? "Receivable"
                                    : "Clear"
                                }
                              </Badge>
                              <div className="text-sm font-medium mt-1">
                                {customer.currentBalance !== 0
                                  ? `Rs ${Math.abs(customer.currentBalance)}`
                                  : "Rs 0"
                                }
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium">{customer.totalOrders || 0}</div>
                              <div className="text-xs text-muted-foreground">orders</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.lastOrder ? (
                              <div className="text-sm">
                                <div className="font-medium">{customer.lastOrder.id}</div>
                                <div className="text-muted-foreground">
                                  Rs {customer.lastOrder.amount} • {customer.lastOrder.date}
                                </div>
                                <Badge variant="outline" className="text-xs">
                                  {customer.lastOrder.status}
                                </Badge>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">No orders</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <CustomerStatusToggle
                              customerId={customer.id}
                              isActive={customer.isActive !== false}
                              onStatusChange={(isActive) => {
                                setCustomers(prev =>
                                  prev.map(c =>
                                    c.id === customer.id ? { ...c, isActive } : c
                                  )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link to={`/admin/customers/${customer.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCustomer(customer)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <EditCustomerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={selectedCustomer}
        onCustomerUpdated={handleCustomerUpdated}
      />
    </div>
  );
};

export default Customers;
