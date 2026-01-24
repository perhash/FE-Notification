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
import { Loader2, DollarSign, Users, Package, AlertCircle, Calendar, TruckIcon, Wallet, Receipt } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import type { DailyClosingSummary } from "@/types/dailyClosing";

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
  const [summary, setSummary] = useState<DailyClosingSummary | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSummary();
    }
  }, [open]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDailyClosingSummary();
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        toast.error(response.message ?? "Failed to fetch summary");
        setOpen(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch summary";
      console.error("Error fetching summary:", err);
      toast.error(msg);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCounter = async () => {
    try {
      setSaving(true);
      const response = await apiService.saveDailyClosing();
      if (response.success) {
        toast.success(response.message ?? "Daily closing saved successfully");
        setOpen(false);
        setSummary(null);
      } else {
        toast.error(response.message ?? "Failed to save daily closing");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save daily closing";
      console.error("Error saving daily closing:", err);
      toast.error(msg);
    } finally {
      setSaving(false);
      setShowConfirmDialog(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `RS. ${(Number(amount) || 0).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const n = (v: number | undefined | null) => Number(v) || 0;
  function arr<T>(v: T[] | undefined | null): T[] {
    return Array.isArray(v) ? v : [];
  }

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
                      There are {n(summary.inProgressOrdersCount)} order(s) currently in progress. 
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
                    {formatCurrency(n(summary.customerReceivable))}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-semibold text-red-900">Customer Payable</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(n(summary.customerPayable))}
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
                    <p className="text-2xl font-bold text-gray-900">{n(summary.totalOrders)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Bottles</p>
                    <p className="text-2xl font-bold text-gray-900">{n(summary.totalBottles)}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className={`rounded-lg p-4 border ${n(summary.balanceClearedToday) >= 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className={`h-5 w-5 ${n(summary.balanceClearedToday) >= 0 ? "text-red-700" : "text-green-700"}`} />
                  <p className={`text-sm font-semibold ${n(summary.balanceClearedToday) >= 0 ? "text-red-900" : "text-green-900"}`}>Financial Summary</p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Total Current Order Amount</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(n(summary.totalCurrentOrderAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Total Paid Amount</span>
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(n(summary.totalPaidAmount))}
                    </span>
                  </div>
                  <div className={`border-t pt-3 ${n(summary.balanceClearedToday) >= 0 ? "border-red-300" : "border-green-300"}`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-base font-semibold ${n(summary.balanceClearedToday) >= 0 ? "text-red-900" : "text-green-900"}`}>
                        {n(summary.balanceClearedToday) >= 0 ? "Udhaar" : "Recovery"}
                      </span>
                      <span className={`text-2xl font-bold ${n(summary.balanceClearedToday) >= 0 ? "text-red-700" : "text-green-700"}`}>
                        {formatCurrency(Math.abs(n(summary.balanceClearedToday)))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rider Collections */}
              {arr(summary.riderCollections).length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-3">
                    <TruckIcon className="h-5 w-5 text-purple-700" />
                    <p className="text-sm font-semibold text-purple-900">Rider Collections</p>
                  </div>
                  <div className="space-y-2">
                    {arr(summary.riderCollections).map((rc, idx) => (
                      <div key={rc.riderId ?? idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">{rc.riderName}</span>
                        <div className="text-right">
                          <span className="text-base font-semibold text-purple-900">
                            {formatCurrency(n(rc.amount))}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({n(rc.ordersCount)} orders)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walk-in Amount */}
              {n(summary.walkInAmount) > 0 && (
                <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-cyan-700" />
                    <p className="text-sm font-semibold text-cyan-900">Walk-in Sales</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-cyan-900">Total Walk-in</span>
                    <span className="text-2xl font-bold text-cyan-700">
                      {formatCurrency(n(summary.walkInAmount))}
                    </span>
                  </div>
                </div>
              )}

              {/* Clear Bill Amount */}
              {n(summary.clearBillAmount) > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-5 w-5 text-indigo-700" />
                    <p className="text-sm font-semibold text-indigo-900">Clear Bill Sales</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-indigo-900">Total Clear Bill</span>
                    <span className="text-2xl font-bold text-indigo-700">
                      {formatCurrency(n(summary.clearBillAmount))}
                    </span>
                  </div>
                </div>
              )}

              {/* Enroute Amount */}
              {n(summary.enrouteAmount) > 0 && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TruckIcon className="h-5 w-5 text-green-700" />
                    <p className="text-sm font-semibold text-green-900">Enroute Orders</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-green-900">Total Enroute</span>
                    <span className="text-2xl font-bold text-green-700">
                      {formatCurrency(n(summary.enrouteAmount))}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              {arr(summary.paymentMethods).length > 0 && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="h-5 w-5 text-orange-700" />
                    <p className="text-sm font-semibold text-orange-900">Payment Methods</p>
                  </div>
                  <div className="space-y-2">
                    {arr(summary.paymentMethods).map((pm, idx) => (
                      <div key={pm.method ?? idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">
                          {String(pm.method ?? "").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <div className="text-right">
                          <span className="text-base font-semibold text-orange-900">
                            {formatCurrency(n(pm.amount))}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({n(pm.ordersCount)} orders)
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

