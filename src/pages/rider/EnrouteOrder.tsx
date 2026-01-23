import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, Loader2, Search, User, MapPin, DollarSign, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { indexedDBService } from "@/services/indexedDB";

const EnrouteOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(null);
  const [bottles, setBottles] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [canCreateOrders, setCanCreateOrders] = useState(false);
  const [customerResults, setCustomerResults] = useState<any[]>([]);

  const apiSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const currentUser = apiService.getCurrentUser();
    if (currentUser?.riderProfile) {
      setCanCreateOrders(!!currentUser.riderProfile.canCreateOrders);
    } else if (currentUser?.profile) {
      setCanCreateOrders(!!currentUser.profile.canCreateOrders);
    }

    // Redirect if no permission
    if (currentUser && !currentUser.riderProfile?.canCreateOrders && !currentUser.profile?.canCreateOrders) {
      toast.error("You are not allowed to create orders");
      navigate("/rider");
    }
  }, [navigate]);

  // Instant IndexedDB search (2ms debounce) - name and address only
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery) {
        setCustomerResults([]);
        return;
      }

      // Cancel any pending API search
      if (apiSearchTimeoutRef.current) {
        clearTimeout(apiSearchTimeoutRef.current);
        apiSearchTimeoutRef.current = null;
      }

      try {
        // Initialize IndexedDB if needed
        try {
          await indexedDBService.init();
        } catch (error) {
          console.error('IndexedDB init error:', error);
        }

        // Search IndexedDB
        let results: any[] = [];
        try {
          const indexedResults = await indexedDBService.searchCustomers(searchQuery);
          results = indexedResults;
        } catch (error) {
          console.error('IndexedDB search error:', error);
        }

        // Show IndexedDB results immediately
        setCustomerResults(results);

        // If no results in IndexedDB and no customer selected, schedule API search
        if (results.length === 0 && !selectedCustomer) {
          // Clear any existing API search timeout
          if (apiSearchTimeoutRef.current) {
            clearTimeout(apiSearchTimeoutRef.current);
          }

          // Schedule API search after 5 seconds
          apiSearchTimeoutRef.current = setTimeout(async () => {
            // Double check: user hasn't selected a customer and still searching
            if (!selectedCustomer && searchQuery) {
              try {
                setLoadingCustomers(true);
                const res = await apiService.searchCustomers(searchQuery);
                if ((res as any).success) {
                  const apiResults = (res as any).data || [];
                  // Store API results in IndexedDB for future searches
                  if (apiResults.length > 0) {
                    try {
                      await indexedDBService.storeCustomers(apiResults);
                    } catch (error) {
                      console.error('Failed to store customers in IndexedDB:', error);
                    }
                  }
                  // Only update if user hasn't selected a customer
                  if (!selectedCustomer) {
                    setCustomerResults(apiResults);
                  }
                }
              } catch (e) {
                console.error('API search error:', e);
                if (!selectedCustomer) {
                  setCustomerResults([]);
                }
              } finally {
                setLoadingCustomers(false);
              }
            }
            apiSearchTimeoutRef.current = null;
          }, 5000);
        }
      } catch (e) {
        console.error('IndexedDB search error:', e);
      }
    }, 2);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedCustomer]);

  // Cleanup API search timeout when customer is selected
  useEffect(() => {
    if (selectedCustomer && apiSearchTimeoutRef.current) {
      clearTimeout(apiSearchTimeoutRef.current);
      apiSearchTimeoutRef.current = null;
    }
  }, [selectedCustomer]);

  // When customer is selected, fetch updated balance from main DB
  useEffect(() => {
    const loadCustomerBalance = async () => {
      if (!selectedCustomer) {
        setSelectedCustomerBalance(null);
        return;
      }

      // Walk-in customer has no balance
      if (selectedCustomer.id === 'walkin' || selectedCustomer.name === 'Walk-in Customer') {
        setSelectedCustomerBalance(0);
        return;
      }

      try {
        setLoadingBalance(true);
        
        // Fetch updated customer data with balance from API
        const res = await apiService.getCustomerById(selectedCustomer.id) as any;
        if (res?.success) {
          const customerData = res.data;
          
          // Set updated balance
          const balance = customerData.currentBalance || 0;
          setSelectedCustomerBalance(balance);
        } else {
          setSelectedCustomerBalance(null);
        }
      } catch (error) {
        console.error('Failed to load customer balance:', error);
        setSelectedCustomerBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };
    loadCustomerBalance();
  }, [selectedCustomer]);

  // Payment method options
  const paymentMethods = [
    { value: "CASH", label: "Cash" },
    { value: "CARD", label: "Card" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "JAZZCASH", label: "JazzCash" },
    { value: "EASYPAISA", label: "EasyPaisa" },
    { value: "NAYA_PAY", label: "Naya Pay" },
    { value: "SADAPAY", label: "SadaPay" },
  ];

  const isWalkInCustomer = selectedCustomer && (selectedCustomer.id === 'walkin' || selectedCustomer.name === 'Walk-in Customer');
  const orderAmount = bottles && unitPrice ? parseInt(bottles) * parseFloat(unitPrice) : 0;
  const customerBalance = selectedCustomerBalance !== null ? selectedCustomerBalance : 0;
  const totalAmount = customerBalance + orderAmount;
  const newBalanceAfterPayment = totalAmount - (parseFloat(amountReceived) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateOrders) {
      toast.error("You are not allowed to create orders");
      return;
    }

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (!bottles || parseInt(bottles) <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      toast.error("Please enter valid unit price");
      return;
    }

    if (!amountReceived || parseFloat(amountReceived) < 0) {
      toast.error("Please enter amount received");
      return;
    }

    // Walk-in customer must pay full amount
    if (isWalkInCustomer && parseFloat(amountReceived) !== orderAmount) {
      toast.error("Walk-in customer must pay full amount. Payment must equal order amount.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customerId: selectedCustomer.id === 'walkin' ? 'walkin' : selectedCustomer.id,
        numberOfBottles: parseInt(bottles),
        unitPrice: parseFloat(unitPrice),
        notes: notes || undefined,
        paymentAmount: parseFloat(amountReceived),
        paymentMethod,
        priority: "NORMAL",
      };

      const res: any = await apiService.createEnrouteOrder(payload);

      if (res?.success) {
        toast.success(
          `Enroute order #${res.data.id.slice(-4)} created and delivered. Paid: RS. ${amountReceived}`
        );
        navigate("/rider");
      } else {
        toast.error(res?.message || "Failed to create enroute order");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create enroute order");
    } finally {
      setLoading(false);
    }
  };

  if (!canCreateOrders) {
    return null;
  }

  return (
    <div className="min-h-screen pb-24 md:pb-6">
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Link to="/rider">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">New Enroute Order</h1>
              <p className="text-sm text-white/90">Create & deliver order instantly</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-t-3xl -mt-5 p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Search */}
            <div className="space-y-2">
              <Label>Search Customer (by name or address)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                  disabled={!!selectedCustomer}
                />
              </div>

              {searchQuery && !selectedCustomer && (
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md">
                  {loadingCustomers ? (
                    <p className="p-3 text-sm text-muted-foreground">Searching...</p>
                  ) : customerResults.length > 0 ? (
                    <>
                      {/* Walk-in Customer Option */}
                      <div
                        onClick={() => {
                          setSelectedCustomer({
                            id: 'walkin',
                            name: 'Walk-in Customer',
                            address: 'Generic customer'
                          });
                          setSearchQuery("");
                        }}
                        className="p-3 hover:bg-muted cursor-pointer border-b bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-700">Walk-in Customer</p>
                            <p className="text-sm text-blue-600">For unknown customers</p>
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-700">
                            Generic
                          </Badge>
                        </div>
                      </div>
                      {customerResults.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setSearchQuery("");
                          }}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{customer.name}</p>
                              {customer.houseNo && (
                                <p className="text-xs text-blue-600 font-medium">House: {customer.houseNo}</p>
                              )}
                              {customer.address && (
                                <p className="text-xs text-muted-foreground">{customer.address}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">No customers found</p>
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    {selectedCustomer.houseNo && (
                      <p className="text-sm text-muted-foreground">House: {selectedCustomer.houseNo}</p>
                    )}
                    {selectedCustomer.address && (
                      <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedCustomerBalance(null);
                      setSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                </div>
                {!isWalkInCustomer && (
                  <div className="mt-3 pt-3 border-t">
                    {loadingBalance ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Loading balance...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Balance:</span>
                          <span className="font-semibold">RS. {customerBalance}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Order Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bottles</Label>
                <Input
                  type="number"
                  min={1}
                  value={bottles}
                  onChange={(e) => setBottles(e.target.value)}
                  placeholder="Quantity"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit price (RS.)</Label>
                <Input
                  type="number"
                  min={1}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Price per bottle"
                  className="h-11"
                />
              </div>
            </div>

            {bottles && unitPrice && (
              <div className="space-y-2">
                <div className="rounded-lg border bg-cyan-50 p-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-cyan-800">Order Amount</span>
                  <span className="text-lg font-bold text-cyan-900">
                    RS. {orderAmount}
                  </span>
                </div>
                {!isWalkInCustomer && (
                  <div className="rounded-lg border bg-blue-50 p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Current Balance:</span>
                      <span className="font-semibold text-blue-700">RS. {customerBalance}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-700">Total Amount:</span>
                      <span className="font-bold text-blue-900">RS. {totalAmount}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Payment Section */}
            <div className="space-y-2">
              <Label>Amount Received (RS.)</Label>
              <Input
                type="number"
                min={0}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={isWalkInCustomer ? `Must equal RS. ${orderAmount}` : "Enter amount"}
                className="h-11"
              />
              {isWalkInCustomer && (
                <p className="text-xs text-amber-600">
                  Walk-in customer must pay full amount: RS. {orderAmount}
                </p>
              )}
              {!isWalkInCustomer && amountReceived && orderAmount && (
                <div className="rounded-lg border bg-green-50 p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-green-700">New Balance After Payment:</span>
                    <span className="font-semibold text-green-900">RS. {newBalanceAfterPayment.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this enroute delivery"
                className="min-h-[80px]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={() => navigate("/rider")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-12 bg-cyan-600 hover:bg-cyan-700" disabled={loading || !selectedCustomer}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create & Deliver"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex max-w-3xl mx-auto px-6 py-6 flex-col gap-6">
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-700 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-6">
            <Link to="/rider">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">New Enroute Order</h1>
              <p className="text-white/90 mt-1">
                Create a walk-in style order that is delivered and paid on the spot.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cyan-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Search */}
            <div className="space-y-2">
              <Label>Search Customer (by name or address)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={!!selectedCustomer}
                />
              </div>

              {searchQuery && !selectedCustomer && (
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md">
                  {loadingCustomers ? (
                    <p className="p-3 text-sm text-muted-foreground">Searching...</p>
                  ) : customerResults.length > 0 ? (
                    <>
                      {/* Walk-in Customer Option */}
                      <div
                        onClick={() => {
                          setSelectedCustomer({
                            id: 'walkin',
                            name: 'Walk-in Customer',
                            address: 'Generic customer'
                          });
                          setSearchQuery("");
                        }}
                        className="p-3 hover:bg-muted cursor-pointer border-b bg-blue-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-blue-700">Walk-in Customer</p>
                            <p className="text-sm text-blue-600">For unknown customers</p>
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-700">
                            Generic
                          </Badge>
                        </div>
                      </div>
                      {customerResults.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setSearchQuery("");
                          }}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{customer.name}</p>
                              {customer.houseNo && (
                                <p className="text-xs text-blue-600 font-medium">House: {customer.houseNo}</p>
                              )}
                              {customer.address && (
                                <p className="text-xs text-muted-foreground">{customer.address}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground">No customers found</p>
                  )}
                </div>
              )}
            </div>

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    {selectedCustomer.houseNo && (
                      <p className="text-sm text-muted-foreground">House: {selectedCustomer.houseNo}</p>
                    )}
                    {selectedCustomer.address && (
                      <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedCustomerBalance(null);
                      setSearchQuery("");
                    }}
                  >
                    Change
                  </Button>
                </div>
                {!isWalkInCustomer && (
                  <div className="mt-3 pt-3 border-t">
                    {loadingBalance ? (
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-muted-foreground">Loading balance...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Current Balance:</span>
                          <span className="font-semibold">RS. {customerBalance}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Order Details */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Bottles</Label>
                <Input
                  type="number"
                  min={1}
                  value={bottles}
                  onChange={(e) => setBottles(e.target.value)}
                  placeholder="Quantity"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit price (RS.)</Label>
                <Input
                  type="number"
                  min={1}
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Price per bottle"
                />
              </div>
            </div>

            {bottles && unitPrice && (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl border bg-blue-50 p-4 flex flex-col justify-between">
                  <p className="text-xs text-blue-700 font-medium mb-1">Order Amount</p>
                  <p className="text-2xl font-bold text-blue-900">
                    RS. {orderAmount}
                  </p>
                </div>
                {!isWalkInCustomer && (
                  <div className="rounded-2xl border bg-cyan-50 p-4 flex flex-col justify-between">
                    <p className="text-xs text-cyan-700 font-medium mb-1">Current Balance</p>
                    <p className="text-xl font-bold text-cyan-900">
                      RS. {customerBalance}
                    </p>
                  </div>
                )}
                <div className="rounded-2xl border bg-green-50 p-4 flex flex-col justify-between">
                  <p className="text-xs text-green-700 font-medium mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-green-900">
                    RS. {totalAmount}
                  </p>
                </div>
              </div>
            )}

            {/* Payment Section */}
            <div className="space-y-2">
              <Label>Amount Received (RS.)</Label>
              <Input
                type="number"
                min={0}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder={isWalkInCustomer ? `Must equal RS. ${orderAmount}` : "Enter amount"}
              />
              {isWalkInCustomer && (
                <p className="text-xs text-amber-600">
                  Walk-in customer must pay full amount: RS. {orderAmount}
                </p>
              )}
              {!isWalkInCustomer && amountReceived && orderAmount && (
                <div className="rounded-lg border bg-green-50 p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">New Balance After Payment:</span>
                    <span className="font-semibold text-green-900">RS. {newBalanceAfterPayment.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this enroute delivery"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/rider")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedCustomer}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create & Deliver"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnrouteOrderPage;
