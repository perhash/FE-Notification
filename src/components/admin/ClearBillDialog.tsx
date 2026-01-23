import { useEffect, useState, useRef } from "react";
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
import { Search, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { indexedDBService } from "@/services/indexedDB";

interface ClearBillDialogProps {
  trigger?: React.ReactNode;
}

export function ClearBillDialog({ trigger }: ClearBillDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedCustomerBalance, setSelectedCustomerBalance] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [activeOrderMap, setActiveOrderMap] = useState<Record<string, boolean>>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const apiSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Instant IndexedDB search (2ms debounce)
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
      
      try {
        setLoadingBalance(true);
        
        // Fetch updated customer data with balance from API
        const res = await apiService.getCustomerById(selectedCustomer.id) as any;
        if (res?.success) {
          const customerData = res.data;
          
          // Set updated balance
          const balance = customerData.currentBalance || 0;
          setSelectedCustomerBalance(balance);
          
          // Auto-set payment amount to the absolute value of balance
          setPaymentAmount(Math.abs(balance).toString());
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

  // For each searched customer, detect if they have an in-progress order and mark them to exclude from list
  useEffect(() => {
    let cancelled = false;
    const checkActiveOrders = async () => {
      const entries = await Promise.all(
        customerResults.slice(0, 20).map(async (c) => {
          try {
            const res = await apiService.getCustomerById(c.id) as any;
            if (res?.success && Array.isArray(res.data?.orders)) {
              const hasActive = res.data.orders.some((o: any) => ['pending','assigned','in_progress','in progress'].includes(String(o.status).toLowerCase()));
              return [c.id, hasActive] as [string, boolean];
            }
          } catch {}
          return [c.id, false] as [string, boolean];
        })
      );
      if (!cancelled) {
        const map: Record<string, boolean> = {};
        for (const [id, flag] of entries) map[id] = flag;
        setActiveOrderMap(map);
      }
    };
    if (customerResults.length > 0) checkActiveOrders();
    else setActiveOrderMap({});
    return () => { cancelled = true; };
  }, [customerResults]);

  const handleClearBill = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmClear = async () => {
    setShowConfirmDialog(false);

    try {
      setIsClearing(true);

      const response = await apiService.clearBill({
        customerId: selectedCustomer.id,
        paidAmount: parseFloat(paymentAmount),
        paymentMethod,
        paymentNotes: paymentNotes || undefined,
      });

      if ((response as any).success) {
        toast.success(`Bill cleared successfully! Amount: RS. ${paymentAmount}`);
        
        // Reset form
        setSelectedCustomer(null);
        setSelectedCustomerBalance(null);
        setSearchQuery("");
        setPaymentAmount("");
        setPaymentMethod("CASH");
        setPaymentNotes("");
        setOpen(false);
        
        // Dispatch custom event to refresh dashboard data without full page reload
        window.dispatchEvent(new CustomEvent('refreshDashboard'));
      } else {
        toast.error((response as any).message || 'Failed to clear bill');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to clear bill');
    } finally {
      setIsClearing(false);
    }
  };

  // Use fetched balance if available, otherwise default to 0
  const customerBalance = selectedCustomerBalance !== null ? selectedCustomerBalance : 0;
  const isReceivable = customerBalance > 0;
  const isPayable = customerBalance < 0;
  const hasBill = customerBalance !== 0;

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <DollarSign className="mr-2 h-4 w-4" />
            Clear Bills
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Clear Customer Bill</DialogTitle>
          <DialogDescription>
            Search for customer and clear their outstanding bill
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleClearBill} className="space-y-6">
          {/* Customer Search */}
          <div className="space-y-2">
            <Label>
              Search Customer (by name, phone, WhatsApp, or house number)
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

            {searchQuery && !selectedCustomer && (
              <div className="mt-2 max-h-48 overflow-y-auto border rounded-md">
                {loadingCustomers ? (
                  <p className="p-3 text-sm text-muted-foreground">Searching...</p>
                ) : customerResults.length > 0 ? (
                  customerResults.map((customer) => {
                      const inProgress = !!activeOrderMap[customer.id];
                      return (
                        <div
                          key={customer.id}
                          onClick={() => {
                            if (inProgress) return; // keep visible but not selectable
                            setSelectedCustomer(customer);
                            setSearchQuery("");
                          }}
                          className={`p-3 border-b last:border-b-0 ${inProgress ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-muted-foreground">{customer.phone}</p>
                              {customer.houseNo && (
                                <p className="text-xs text-blue-600 font-medium">House: {customer.houseNo}</p>
                              )}
                              {(customer.area || customer.city) && (
                                <p className="text-xs text-muted-foreground">
                                  {[customer.area, customer.city].filter(Boolean).join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              {inProgress && (
                                <Badge className="bg-amber-100 text-amber-700">Order in progress</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                </div>
                <div className="text-right">
                  {loadingBalance ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading balance...</span>
                    </div>
                  ) : (
                    <>
                      <Badge variant={customerBalance < 0 ? "destructive" : "default"}>
                        {isReceivable ? "Receivable" : isPayable ? "Payable" : "Clear"}
                      </Badge>
                      <p className="text-lg font-bold mt-1">RS. {Math.abs(customerBalance)}</p>
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
                  setPaymentAmount("");
                }}
              >
                Change Customer
              </Button>
            </div>
          )}

          {/* Bill Information */}
          {selectedCustomer && hasBill && (
            <div className="space-y-2">
              <Label>Outstanding Bill Information</Label>
              <div className="rounded-lg border bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {isReceivable ? "Customer Owes" : "We Owe Customer"}
                  </span>
                  <span className="text-2xl font-bold">
                    RS. {Math.abs(customerBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Bill Message */}
          {selectedCustomer && !hasBill && (
            <div className="rounded-lg border bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                This customer has no outstanding bills to clear.
              </p>
            </div>
          )}

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount *</Label>
            <Input
              id="paymentAmount"
              type="number"
              placeholder="Enter amount to clear"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min="0"
              step="0.01"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the amount to clear for this {isReceivable ? "receivable" : isPayable ? "payable" : "bill"}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod">
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

          {/* Payment Notes */}
          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Payment Notes (Optional)</Label>
            <Textarea
              id="paymentNotes"
              placeholder="Add any notes about this payment..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isClearing}>
              Cancel
            </Button>
            <Button type="submit" disabled={isClearing || !hasBill || !selectedCustomer}>
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing Bill...
                </>
              ) : (
                "Clear Bill"
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
          <AlertDialogTitle>Confirm Clear Bill</AlertDialogTitle>
          <AlertDialogDescription>
            Please review the bill clearing details before confirming
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
              {selectedCustomer?.houseNo && (
                <div>
                  <span className="text-muted-foreground">House No:</span>
                  <p className="font-medium">{selectedCustomer.houseNo}</p>
                </div>
              )}
              {(selectedCustomer?.area || selectedCustomer?.city) && (
                <div>
                  <span className="text-muted-foreground">Location:</span>
                  <p className="font-medium">
                    {[selectedCustomer.area, selectedCustomer.city].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bill Information */}
          <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
            <h4 className="font-semibold text-lg">Bill Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Outstanding Bill Type:</span>
                <Badge 
                  variant={customerBalance < 0 ? "destructive" : "default"} 
                  className="ml-2"
                >
                  {isReceivable ? "Receivable" : isPayable ? "Payable" : "Clear"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Outstanding Amount:</span>
                <p className="font-bold text-lg">RS. {Math.abs(customerBalance)}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="rounded-lg border bg-blue-50 p-4 space-y-2">
            <h4 className="font-semibold text-lg">Payment Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Payment Amount:</span>
                <p className="font-bold text-lg">RS. {paymentAmount}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Method:</span>
                <p className="font-medium">{paymentMethod}</p>
              </div>
              {paymentNotes && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Payment Notes:</span>
                  <p className="font-medium">{paymentNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Remaining Balance Information */}
          <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
            {(() => {
              // Calculate remaining balance correctly for both receivable and payable
              const balance = parseFloat(customerBalance.toString());
              const paid = parseFloat(paymentAmount);
              let remainingBalance;
              
              if (isReceivable) {
                // For receivable: subtract payment from balance
                remainingBalance = balance - paid;
              } else if (isPayable) {
                // For payable: add payment to balance (because we're giving them back)
                remainingBalance = balance + paid;
              } else {
                remainingBalance = 0;
              }
              
              // Determine status message
              let statusMessage;
              let statusBadge;
              
              if (remainingBalance === 0) {
                statusMessage = "Fully Cleared";
                statusBadge = "default";
              } else if (remainingBalance > 0) {
                statusMessage = `${remainingBalance} Receivable Remaining`;
                statusBadge = "default";
              } else {
                statusMessage = `${Math.abs(remainingBalance)} Payable Remaining`;
                statusBadge = "destructive";
              }
              
              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg">Remaining Balance After Payment:</span>
                    <span className="text-2xl font-bold text-primary">
                      RS. {Math.abs(remainingBalance)}
                    </span>
                  </div>
                  <Badge variant={statusBadge as any} className="mt-2">
                    {statusMessage}
                  </Badge>
                </>
              );
            })()}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmClear}
            disabled={isClearing}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isClearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              'Confirm & Clear Bill'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

