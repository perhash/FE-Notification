import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AddCustomerDialog } from "@/components/admin/AddCustomerDialog";
import { indexedDBService } from "@/services/indexedDB";

interface CreateOrderDialogProps {
  trigger?: React.ReactNode;
}

export function CreateOrderDialog({ trigger }: CreateOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(null);
  const [bottles, setBottles] = useState("");
  const [pricePerBottle, setPricePerBottle] = useState("");
  const [selectedRider, setSelectedRider] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");
  const [orderType, setOrderType] = useState("delivery");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isAmend, setIsAmend] = useState(false);

  // Payment fields for walk-in orders
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Load riders when dialog opens
  useEffect(() => {
    const loadRiders = async () => {
      if (!open) return;
      try {
        setLoadingRiders(true);
        const res = await apiService.getRiders();
        if ((res as any).success) {
          setRiders((res as any).data);
        } else {
          setRiders([]);
        }
      } catch (e) {
        setRiders([]);
      } finally {
        setLoadingRiders(false);
      }
    };
    loadRiders();
  }, [open]);

  // Load bottle price (19 liter) when dialog opens - IndexedDB first, then API fallback
  useEffect(() => {
    const loadBottlePrice = async () => {
      if (!open) return;
      try {
        // Try to get price from IndexedDB first
        try {
          await indexedDBService.init();
          const price19L = await indexedDBService.getBottlePrice19Liter();
          if (price19L) {
            console.log('Loaded 19 liter price from IndexedDB:', price19L);
            setPricePerBottle(price19L);
            return;
          }
        } catch (error) {
          console.error('Failed to load price from IndexedDB:', error);
        }

        // Fallback to API if not found in IndexedDB
        console.log('Loading 19 liter price from API...');
        const companyRes = await apiService.getCompanySetup() as any;
        if (companyRes.success && companyRes.data?.id) {
          const categoriesRes = await apiService.getBottleCategories(companyRes.data.id) as any;
          if (categoriesRes.success && categoriesRes.data) {
            // Find 19 liter bottle category - exact match first, then partial
            const category19L = categoriesRes.data.find((cat: any) => {
              const name = (cat.categoryName || '').toLowerCase().trim();
              return name === '19 liter' || (name.includes('19') && name.includes('liter'));
            });
            if (category19L?.price) {
              const price = String(category19L.price);
              console.log('Loaded 19 liter price from API:', price);
              setPricePerBottle(price);
              
              // Store in IndexedDB for next time
              try {
                await indexedDBService.storeBottlePrices(categoriesRes.data);
                console.log('Bottle prices stored in IndexedDB');
              } catch (error) {
                console.error('Failed to store bottle prices in IndexedDB:', error);
              }
              return;
            }
          }
        }
        // Set default if no price found
        console.warn('19 liter price not found, using default: 90');
        setPricePerBottle("90");
      } catch (error) {
        console.error('Failed to load bottle price:', error);
        setPricePerBottle("90");
      }
    };
    loadBottlePrice();
  }, [open]);

  // Reset loading state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsCreating(false);
    }
  }, [open]);

  // Clear payment amount when switching away from walk-in or changing customer
  useEffect(() => {
    if (orderType !== 'walkin' || !selectedCustomer) {
      setPaymentAmount("");
    }
  }, [orderType, selectedCustomer]);

  // Debounced customer search - IndexedDB first, then API fallback
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (!searchQuery) {
        setCustomerResults([]);
        return;
      }
      try {
        setLoadingCustomers(true);
        
        // Initialize IndexedDB if needed
        try {
          await indexedDBService.init();
        } catch (error) {
          console.error('IndexedDB init error:', error);
        }

        // Search IndexedDB first
        let results: any[] = [];
        try {
          const indexedResults = await indexedDBService.searchCustomers(searchQuery);
          results = indexedResults;
        } catch (error) {
          console.error('IndexedDB search error:', error);
        }

        // If no results in IndexedDB, fallback to API
        if (results.length === 0) {
          try {
            const res = await apiService.searchCustomers(searchQuery);
            if ((res as any).success) {
              results = (res as any).data || [];
              // Store API results in IndexedDB for future searches
              if (results.length > 0) {
                try {
                  await indexedDBService.storeCustomers(results);
                } catch (error) {
                  console.error('Failed to store customers in IndexedDB:', error);
                }
              }
            }
          } catch (e) {
            console.error('API search error:', e);
          }
        }

        setCustomerResults(results);
      } catch (e) {
        console.error('Customer search error:', e);
        setCustomerResults([]);
      } finally {
        setLoadingCustomers(false);
      }
    }, 5000);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const filteredCustomers = customerResults;

  // When customer is selected, fetch updated balance and check for active order
  useEffect(() => {
    const loadCustomerData = async () => {
      if (!selectedCustomer || selectedCustomer.id === 'walkin') {
        setActiveOrder(null);
        setIsAmend(false);
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
          setSelectedCustomerBalance(customerData.currentBalance || 0);
          
          // Check for active order
          if (Array.isArray(customerData?.orders)) {
            const inProgress = customerData.orders.find((o: any) => 
              ['pending','assigned','in_progress','in progress'].includes(String(o.status).toLowerCase())
            );
            if (inProgress && inProgress.id) {
              // Fetch full order to infer rider and precise amounts
              const full = await apiService.getOrderById(inProgress.id) as any;
              const orderData = full?.data || null;
              setActiveOrder(orderData);
              setIsAmend(true);

              // Prefill bottles and unit price (infer unit price from currentOrderAmount / numberOfBottles)
              const nb = orderData?.numberOfBottles;
              const coa = parseFloat(orderData?.currentOrderAmount ?? 0);
              if (nb && nb > 0 && !isNaN(coa)) {
                const inferred = Math.round(coa / nb);
                setBottles(String(nb));
                setPricePerBottle(String(inferred));
              }
              // Prefill rider for delivery orders
              if (orderData?.orderType === 'DELIVERY' && orderData?.riderId) {
                setOrderType('delivery');
                setSelectedRider(orderData.riderId);
              } else if (orderData?.orderType === 'WALKIN') {
                setOrderType('walkin');
              }
            } else {
              setActiveOrder(null);
              setIsAmend(false);
            }
          } else {
            setActiveOrder(null);
            setIsAmend(false);
          }
        } else {
          setActiveOrder(null);
          setIsAmend(false);
          setSelectedCustomerBalance(null);
        }
      } catch (error) {
        console.error('Failed to load customer data:', error);
        setActiveOrder(null);
        setIsAmend(false);
        setSelectedCustomerBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };
    loadCustomerData();
  }, [selectedCustomer]);

  // Check if selected customer is unknown walk-in customer
  const isUnknownWalkInCustomer = selectedCustomer && 
    (selectedCustomer.name === 'Walk-in Customer' || 
     selectedCustomer.phone === '000-000-0000');

  // Choose which balance to display: in update mode use order snapshot; else use fetched balance
  const displayBalance = useMemo(() => {
    if (isAmend && activeOrder) {
      const b = parseFloat(activeOrder.customerBalance ?? 0);
      return isNaN(b) ? 0 : b;
    }
    if (selectedCustomerBalance !== null) {
      return selectedCustomerBalance;
    }
    return 0;
  }, [isAmend, activeOrder, selectedCustomerBalance]);

  // Auto-calculate payment amount for walk-in orders
  useEffect(() => {
    if (orderType === 'walkin' && selectedCustomer && bottles && pricePerBottle) {
      const currentOrderAmount = parseInt(bottles) * parseInt(pricePerBottle);
      const customerBalance = displayBalance;
      
      let totalAmount;
      
      // Calculate total with balance adjustments
      if (customerBalance < 0) {
        // Payable - subtract from order amount
        totalAmount = Math.max(0, currentOrderAmount - Math.abs(customerBalance));
      } else if (customerBalance > 0) {
        // Receivable - add to order amount
        totalAmount = currentOrderAmount + customerBalance;
      } else {
        // Clear balance
        totalAmount = currentOrderAmount;
      }
      
      // Only update if we have a valid number
      if (!isNaN(totalAmount) && isFinite(totalAmount)) {
        setPaymentAmount(totalAmount.toString());
      }
    }
  }, [orderType, selectedCustomer, bottles, pricePerBottle, displayBalance]);

  // Handle form validation and show confirmation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (!bottles || parseInt(bottles) <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    if (orderType === 'delivery' && !selectedRider) {
      toast.error("Please select a rider for delivery orders");
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  // Actually create or amend the order after confirmation
  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);

    try {
      setIsCreating(true);
      let res: any;
      if (isAmend && activeOrder?.id) {
        // Amend existing in-progress order
        const payload: any = {
          numberOfBottles: parseInt(bottles),
          unitPrice: parseInt(pricePerBottle),
          notes: notes || undefined,
          priority: priority === 'high' ? 'HIGH' : priority === 'low' ? 'LOW' : 'NORMAL',
          ...(orderType === 'delivery' && selectedRider ? { riderId: selectedRider } : {})
        };
        res = await apiService.amendOrder(activeOrder.id, payload);
      } else {
        const payload: any = {
          customerId: selectedCustomer.id === 'walkin' ? 'walkin' : selectedCustomer.id,
          numberOfBottles: parseInt(bottles),
          unitPrice: parseInt(pricePerBottle),
          notes: notes || undefined,
          priority: priority === 'high' ? 'HIGH' : priority === 'low' ? 'LOW' : 'NORMAL',
          orderType: orderType.toUpperCase(),
        };
        if (orderType === 'delivery' && selectedRider) {
          payload.riderId = selectedRider;
        }
        res = await apiService.createOrder(payload);
      }
      if ((res as any).success) {
        const currentOrderAmount = parseInt(bottles) * parseInt(pricePerBottle);
        const customerBalance = selectedCustomer.currentBalance ?? 0;
        const totalAmount = currentOrderAmount + customerBalance;

        // If it's a walk-in order and payment amount is provided, complete it immediately
        if (!isAmend && orderType === 'walkin' && paymentAmount) {
          try {
            const paymentAmountNum = parseFloat(paymentAmount);
            const completeRes = await apiService.completeWalkInOrder((res as any).data.id, {
              paymentAmount: paymentAmountNum,
              paymentMethod,
              notes: paymentNotes || undefined
            });

            if ((completeRes as any).success) {
              toast.success(`Walk-in order created and completed! Payment: RS. ${paymentAmountNum}`);
            } else {
              toast.success(`Order created successfully! Total: RS. ${totalAmount}. Please complete payment manually.`);
            }
          } catch (completeErr) {
            toast.success(`Order created successfully! Total: RS. ${totalAmount}. Please complete payment manually.`);
          }
        } else {
          toast.success(isAmend ? `Order updated successfully! Total: RS. ${totalAmount}` : `Order created successfully! Total: RS. ${totalAmount}`);
        }

        // Reset form
        setSelectedCustomer(null);
        setSearchQuery("");
        setBottles("");
        setPricePerBottle("90");
        setSelectedRider("");
        setNotes("");
        setPriority('medium');
        setOrderType('delivery');
        setPaymentAmount("");
        setPaymentMethod("CASH");
        setPaymentNotes("");
        setActiveOrder(null);
        setIsAmend(false);
        setOpen(false);
      } else {
        toast.error((res as any).message || (isAmend ? 'Failed to update order' : 'Failed to create order'));
      }
    } catch (err: any) {
      toast.error(err?.message || (isAmend ? 'Failed to update order' : 'Failed to create order'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Search for customer and fill in order details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Type Selection */}
          <div className="space-y-2">
            <Label>Order Type</Label>
            <Select value={orderType} onValueChange={setOrderType} disabled={isAmend}>
              <SelectTrigger>
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="delivery">Delivery</SelectItem>
                <SelectItem value="walkin">Walk-in</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Fields for Walk-in Orders */}
          {/* {orderType === 'walkin' && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
              <h3 className="font-medium text-blue-900">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="JAZZCASH">JazzCash</SelectItem>
                      <SelectItem value="EASYPAISA">EasyPaisa</SelectItem>
                      <SelectItem value="NAYA_PAY">Naya Pay</SelectItem>
                      <SelectItem value="SADAPAY">SadaPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Payment Notes (Optional)</Label>
                <Input
                  id="paymentNotes"
                  placeholder="Add any notes about this payment..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>
          )} */}

          {/* Customer Search */}
          <div className="space-y-2">
            <Label>
              Search Customer {orderType === 'walkin' ? '(or select Walk-in Customer for unknown customers)' : '(by name, phone, WhatsApp, or house number)'}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, WhatsApp, or house number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can search by customer name, phone number, WhatsApp number, or house number
            </p>

            {searchQuery && !selectedCustomer && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md">
                {loadingCustomers ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching...</p>
                ) : filteredCustomers.length > 0 ? (
                  <>
                    {/* Walk-in Customer Option for Walk-in Orders */}
                    {orderType === 'walkin' && (
                      <div
                        onClick={() => {
                          setSelectedCustomer({
                            id: 'walkin',
                            name: 'Walk-in Customer',
                            phone: '000-000-0000',
                            currentBalance: 0
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
                    )}
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSearchQuery("");
                        }}
                        className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
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
                <div className="space-y-1">
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                  {selectedCustomer.address && (
                    <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                  )}
                </div>
                <div className="text-right">
                  {isAmend && (
                    <div className="mb-1">
                      <Badge className="bg-amber-100 text-amber-700">Order in progress</Badge>
                    </div>
                  )}
                  {loadingBalance ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading balance...</span>
                    </div>
                  ) : (
                    <>
                      <Badge variant={(displayBalance ?? 0) < 0 ? "destructive" : "default"}>
                        {(displayBalance ?? 0) < 0 ? "Payable" : (displayBalance ?? 0) > 0 ? "Receivable" : 'Clear'}
                      </Badge>
                      <p className="text-sm font-medium mt-1">RS. {Math.abs(displayBalance ?? 0)}</p>
                    </>
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedCustomerBalance(null);
                }}
              >
                Change Customer
              </Button>
            </div>
          )}

          {/* Order Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bottles">Bottle Quantity *</Label>
              <Input
                id="bottles"
                type="number"
                min="1"
                placeholder="Enter quantity"
                value={bottles}
                onChange={(e) => setBottles(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price per Bottle (RS. ) *</Label>
              <Input
                id="price"
                type="number"
                min="1"
                placeholder="90"
                value={pricePerBottle}
                onChange={(e) => setPricePerBottle(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Order Amount Summary */}
          {bottles && pricePerBottle && selectedCustomer && (
            <div className="space-y-3">
              {/* Current Order Amount */}
              <div className="rounded-lg border bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current Order Amount</span>
                  <span className="text-2xl font-bold">
                    RS. {parseInt(bottles) * parseInt(pricePerBottle)}
                  </span>
                </div>
              </div>

              {/* Pending Balance */}
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Pending Balance</span>
                  <div className="text-right">
                    <Badge variant={(displayBalance ?? 0) < 0 ? "destructive" : "default"}>
                      {(displayBalance ?? 0) < 0 ? "Payable" : (displayBalance ?? 0) > 0 ? "Receivable" : 'Clear'}
                    </Badge>
                    <p className="text-lg font-semibold mt-1">
                      RS. {Math.abs(displayBalance ?? 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total for Admin Understanding */}
              <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">Total for Admin</span>
                  <span className="text-3xl font-bold text-primary">
                    RS. {(() => {
                      const currentOrderAmount = parseInt(bottles) * parseInt(pricePerBottle);
                      const customerBalance = displayBalance;
                      if (customerBalance < 0) {
                        // Payable - subtract from order amount
                        return currentOrderAmount - Math.abs(customerBalance);
                      } else if (customerBalance > 0) {
                        // Receivable - add to order amount
                        return currentOrderAmount + customerBalance;
                      } else {
                        // Clear balance - no adjustment
                        return currentOrderAmount;
                      }
                    })()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {(() => {
                    const customerBalance = displayBalance;
                    if (customerBalance < 0) {
                      return `Order amount minus payable balance`;
                    } else if (customerBalance > 0) {
                      return `Order amount plus receivable balance`;
                    } else {
                      return `No balance adjustment needed`;
                    }
                  })()}
                </p>
              </div>
            </div>
          )}

          {/* Rider Assignment - Only for Delivery Orders */}
          {orderType === 'delivery' && (
            <div className="space-y-2">
              <Label htmlFor="rider">Assign Rider (required for delivery)</Label>
              <Select value={selectedRider} onValueChange={setSelectedRider} disabled={isAmend && !!activeOrder?.riderId}>
                <SelectTrigger id="rider">
                  <SelectValue placeholder={loadingRiders ? 'Loading riders...' : (isAmend && activeOrder?.rider?.name ? activeOrder.rider.name : 'Select a rider')} />
                </SelectTrigger>
                <SelectContent>
                  {riders.map((rider: any) => (
                    <SelectItem key={rider.id} value={rider.id}>
                      <div className="flex items-center gap-2">
                        <span>{rider.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {rider.isActive ? 'active' : 'inactive'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Walk-in Payment Section */}
          {orderType === 'walkin' && selectedCustomer && bottles && pricePerBottle && (
            <div className="space-y-4 p-4 rounded-lg border">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-blue-900">Payment Information</h3>
                {isUnknownWalkInCustomer && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Walk-in unknown customer payment amount is calculated automatically and cannot be edited. To customize payment details, please add this customer to your database first.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    placeholder="Enter amount"
                    value={paymentAmount}
                    onChange={(e) => !isUnknownWalkInCustomer && setPaymentAmount(e.target.value)}
                    min="0"
                    disabled={isUnknownWalkInCustomer}
                    readOnly={isUnknownWalkInCustomer}
                    className={isUnknownWalkInCustomer ? 'bg-muted cursor-not-allowed' : ''}
                  />
                  {isUnknownWalkInCustomer && (
                    <p className="text-xs text-muted-foreground italic">
                      Payment amount matches total (auto-calculated)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="JAZZCASH">JazzCash</SelectItem>
                      <SelectItem value="EASYPAISA">EasyPaisa</SelectItem>
                      <SelectItem value="NAYA_PAY">Naya Pay</SelectItem>
                      <SelectItem value="SADAPAY">SadaPay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isUnknownWalkInCustomer && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-700 flex-1">
                    This is the generic walk-in customer. Want to customize payment details? Add them as a customer to your database.
                  </p>
                  <AddCustomerDialog 
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="flex-shrink-0">
                        Add as Customer
                      </Button>
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentNotes">Payment Notes (Optional)</Label>
                <Input
                  id="paymentNotes"
                  placeholder="Add any notes about this payment..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add delivery instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isAmend ? 'Updating Order...' : 'Creating Order...'}
                </>
              ) : (
                isAmend ? 'Update Order' : "Create Order"
              )}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Order Details</AlertDialogTitle>
            <AlertDialogDescription>
              Please review the order details before creating
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Information */}
            <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
              <h4 className="font-semibold text-lg">Customer Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{selectedCustomer?.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{selectedCustomer?.phone}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Balance:</span>
                  <Badge variant={(displayBalance ?? 0) < 0 ? "destructive" : "default"} className="ml-2">
                    {(displayBalance ?? 0) < 0 ? `Payable RS. ${Math.abs(displayBalance ?? 0)}` : (displayBalance ?? 0) > 0 ? `Receivable RS. ${displayBalance}` : 'Clear'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
              <h4 className="font-semibold text-lg">Order Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Order Type:</span>
                  <p className="font-medium capitalize">{orderType}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <p className="font-medium capitalize">{priority}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Bottles:</span>
                  <p className="font-medium">{bottles} bottles</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Price per Bottle:</span>
                  <p className="font-medium">RS. {pricePerBottle}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Order Amount:</span>
                  <p className="font-medium">RS. {bottles && pricePerBottle ? parseInt(bottles) * parseInt(pricePerBottle) : 0}</p>
                </div>
                {orderType === 'delivery' && selectedRider && (
                  <div>
                    <span className="text-muted-foreground">Assigned Rider:</span>
                    <p className="font-medium">{riders.find(r => r.id === selectedRider)?.name || 'Unknown'}</p>
                  </div>
                )}
              </div>

              {/* Payment Information for Walk-in */}
              {orderType === 'walkin' && paymentAmount && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <h5 className="font-semibold">Payment Information</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Payment Amount:</span>
                      <p className="font-medium">RS. {paymentAmount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Method:</span>
                      <p className="font-medium">{paymentMethod}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {notes && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <p className="font-medium text-sm mt-1">{notes}</p>
                </div>
              )}
            </div>

            {/* Total Summary */}
            {selectedCustomer && bottles && pricePerBottle && (
              <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    RS. {(() => {
                      const currentOrderAmount = parseInt(bottles) * parseInt(pricePerBottle);
                      const customerBalance = displayBalance;
                      if (customerBalance < 0) {
                        return currentOrderAmount - Math.abs(customerBalance);
                      } else if (customerBalance > 0) {
                        return currentOrderAmount + customerBalance;
                      } else {
                        return currentOrderAmount;
                      }
                    })()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const customerBalance = displayBalance;
                    if (customerBalance < 0) {
                      return `Order amount minus payable balance`;
                    } else if (customerBalance > 0) {
                      return `Order amount plus receivable balance`;
                    } else {
                      return `No balance adjustment needed`;
                    }
                  })()}
                </p>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={isCreating}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Confirm & Create Order'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
