import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Users, Package, AlertCircle, Calendar, TruckIcon, Wallet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";

interface CloseCounterDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CloseCounterDialog({ trigger, open: controlledOpen, onOpenChange }: CloseCounterDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSummary();
    }
  }, [open]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDailyClosingSummary() as any;
      if (response.success) {
        setSummary(response.data);
      } else {
        toast.error(response.message || "Failed to fetch summary");
        setOpen(false);
      }
    } catch (error: any) {
      console.error('Error fetching summary:', error);
      toast.error(error.message || "Failed to fetch summary");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCounter = async () => {
    try {
      setSaving(true);
      const response = await apiService.saveDailyClosing() as any;
      if (response.success) {
        toast.success(response.message || "Daily closing saved successfully");
        setOpen(false);
        setSummary(null);
      } else {
        toast.error(response.message || "Failed to save daily closing");
      }
    } catch (error: any) {
      console.error('Error saving daily closing:', error);
      toast.error(error.message || "Failed to save daily closing");
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `RS. ${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && (
          <DialogTrigger asChild>
            {trigger}
          </DialogTrigger>
        )}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Daily Closing Summary</DialogTitle>
            <DialogDescription>
              Review today's summary before closing the counter
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading summary...</p>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Alert for in-progress orders */}
              {!summary.canClose && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Cannot Close Counter
                    </p>
                    <p className="text-sm text-red-700">
                      There are {summary.inProgressOrdersCount} order(s) currently in progress. 
                      Please complete all orders before closing the counter.
                    </p>
                  </div>
                </div>
              )}

              {/* Alert if closing already exists */}
              {summary.alreadyExists && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-900 mb-1">
                      Closing Already Exists
                    </p>
                    <p className="text-sm text-amber-700">
                      A closing record already exists for today. This will update the existing record.
                    </p>
                  </div>
                </div>
              )}

              {/* Date Header */}
              <div className="flex items-center gap-2 pb-4 border-b">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatDate(summary.date)}
                </h3>
              </div>

              {/* Customer Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">Customer Receivable</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(summary.customerReceivable)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-semibold text-red-900">Customer Payable</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(summary.customerPayable)}
                  </p>
                </div>
              </div>

              {/* Today's Orders */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-5 w-5 text-gray-700" />
                  <p className="text-sm font-semibold text-gray-900">Today's Orders</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Bottles</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalBottles}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className={`rounded-lg p-4 border ${summary.balanceClearedToday >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className={`h-5 w-5 ${summary.balanceClearedToday >= 0 ? 'text-red-700' : 'text-green-700'}`} />
                  <p className={`text-sm font-semibold ${summary.balanceClearedToday >= 0 ? 'text-red-900' : 'text-green-900'}`}>Financial Summary</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Total Current Order Amount</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(summary.totalCurrentOrderAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Total Paid Amount</span>
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(summary.totalPaidAmount)}
                    </span>
                  </div>
                  <div className={`border-t pt-3 ${summary.balanceClearedToday >= 0 ? 'border-red-300' : 'border-green-300'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-base font-semibold ${summary.balanceClearedToday >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                        {summary.balanceClearedToday >= 0 ? 'Udhaar' : 'Recovery'}
                      </span>
                      <span className={`text-2xl font-bold ${summary.balanceClearedToday >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {formatCurrency(Math.abs(summary.balanceClearedToday))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rider Collections */}
              {summary.riderCollections && summary.riderCollections.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TruckIcon className="h-5 w-5 text-purple-700" />
                    <p className="text-sm font-semibold text-purple-900">Rider Collections</p>
                  </div>
                  <div className="space-y-2">
                    {summary.riderCollections.map((rc: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{rc.riderName}</span>
                        <div className="text-right">
                          <span className="text-base font-semibold text-purple-900">
                            {formatCurrency(rc.amount)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({rc.ordersCount} orders)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walk-in Amount */}
              {summary.walkInAmount > 0 && (
                <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-cyan-700" />
                    <p className="text-sm font-semibold text-cyan-900">Walk-in Sales</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-cyan-900">Total Walk-in</span>
                    <span className="text-2xl font-bold text-cyan-700">
                      {formatCurrency(summary.walkInAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Clear Bill Amount */}
              {summary.clearBillAmount > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-5 w-5 text-indigo-700" />
                    <p className="text-sm font-semibold text-indigo-900">Clear Bill Sales</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-indigo-900">Total Clear Bill</span>
                    <span className="text-2xl font-bold text-indigo-700">
                      {formatCurrency(summary.clearBillAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              {summary.paymentMethods && summary.paymentMethods.length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-5 w-5 text-orange-700" />
                    <p className="text-sm font-semibold text-orange-900">Payment Methods</p>
                  </div>
                  <div className="space-y-2">
                    {summary.paymentMethods.map((pm: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">
                          {pm.method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </span>
                        <div className="text-right">
                          <span className="text-base font-semibold text-orange-900">
                            {formatCurrency(pm.amount)}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({pm.ordersCount} orders)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!summary.canClose || saving}
                  className="flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Close Counter"
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Daily Closing</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to close the counter for today? This action will save all the summary data shown above.
              {summary?.alreadyExists && (
                <span className="block mt-2 font-semibold text-amber-600">
                  This will update the existing closing record for today.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCloseCounter}
              disabled={saving}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                "Confirm Close"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

