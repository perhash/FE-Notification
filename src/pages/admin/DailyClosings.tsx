import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Users, Package, AlertCircle, Loader2, TruckIcon, Wallet, Receipt, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiService } from "@/services/api";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Component for collapsible rider card in Daily Closings
const RiderCollectionCard = ({ rider, index }: { rider: any; index: number }) => {
  const [riderOpen, setRiderOpen] = useState(false);
  const formatCurrency = (amount: number) => {
    return `RS. ${amount.toFixed(2)}`;
  };

  return (
    <Collapsible open={riderOpen} onOpenChange={setRiderOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex justify-between items-center cursor-pointer hover:bg-purple-100 rounded p-1.5 transition-colors">
          <span className="text-xs text-gray-700 font-medium">{rider.riderName}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-purple-900">
              {formatCurrency(rider.amount)}
            </span>
            <span className="text-xs text-gray-500">
              ({rider.ordersCount} orders)
            </span>
            {riderOpen ? (
              <ChevronUp className="h-3 w-3 text-purple-700" />
            ) : (
              <ChevronDown className="h-3 w-3 text-purple-700" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {rider.paymentMethods && rider.paymentMethods.length > 0 ? (
          <div className="ml-4 mt-1 space-y-1 bg-purple-100 rounded p-2 border border-purple-200">
            {rider.paymentMethods.map((pm: any, pmIdx: number) => (
              <div key={pmIdx} className="flex justify-between items-center text-xs">
                <span className="text-gray-700">
                  {pm.method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-900 font-semibold">
                    {formatCurrency(pm.amount)}
                  </span>
                  <span className="text-gray-500">
                    ({pm.ordersCount} orders)
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
};

const DailyClosings = () => {
  const { user } = useAuth();
  const adminName = (user as any)?.profile?.name || "Admin";

  const [closings, setClosings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyClosings();
  }, []);

  const fetchDailyClosings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAllDailyClosings() as any;
      if (response.success) {
        setClosings(response.data);
      } else {
        toast.error(response.message || "Failed to fetch daily closings");
      }
    } catch (error: any) {
      console.error("Error fetching daily closings:", error);
      toast.error(error?.message || "Failed to fetch daily closings");
    } finally {
      setLoading(false);
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
    <div className="min-h-screen pb-20 md:pb-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-white">Daily Closings</h1>
            <p className="text-white/90 text-sm md:text-base">View all daily closing records</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Loading daily closings...</p>
          </div>
        ) : closings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No daily closings found</p>
            <p className="text-gray-400 text-sm mt-2">Start by closing the counter from the dashboard</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {closings.map((closing) => (
              <Card key={closing.id} className="hover:shadow-lg transition-shadow border-cyan-100">
                <CardContent className="p-6">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                    <Calendar className="h-5 w-5 text-cyan-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      {formatDate(closing.date)}
                    </h3>
                  </div>

                  {/* Customer Balances */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-semibold text-blue-900">Receivable</p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(closing.customerReceivable)}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-red-600" />
                        <p className="text-xs font-semibold text-red-900">Payable</p>
                      </div>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(closing.customerPayable)}
                      </p>
                    </div>
                  </div>

                  {/* Orders Summary */}
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-gray-700" />
                      <p className="text-xs font-semibold text-gray-900">Today's Orders</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Orders</p>
                        <p className="text-xl font-bold text-gray-900">{closing.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Bottles</p>
                        <p className="text-xl font-bold text-gray-900">{closing.totalBottles}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className={`rounded-lg p-3 border mb-4 ${closing.balanceClearedToday >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className={`h-4 w-4 ${closing.balanceClearedToday >= 0 ? 'text-red-700' : 'text-green-700'}`} />
                      <p className={`text-xs font-semibold ${closing.balanceClearedToday >= 0 ? 'text-red-900' : 'text-green-900'}`}>Financials</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-700">Order Amount</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(closing.totalCurrentOrderAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-700">Paid</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(closing.totalPaidAmount)}
                        </span>
                      </div>
                      <div className={`border-t pt-2 ${closing.balanceClearedToday >= 0 ? 'border-red-300' : 'border-green-300'}`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-xs font-semibold ${closing.balanceClearedToday >= 0 ? 'text-red-900' : 'text-green-900'}`}>
                            {closing.balanceClearedToday >= 0 ? 'Udhaar' : 'Recovery'}
                          </span>
                          <span className={`text-lg font-bold ${closing.balanceClearedToday >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {formatCurrency(Math.abs(closing.balanceClearedToday))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rider Collections */}
                  {closing.riderCollections && closing.riderCollections.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TruckIcon className="h-4 w-4 text-purple-700" />
                        <p className="text-xs font-semibold text-purple-900">Rider Collections</p>
                      </div>
                      <div className="space-y-2">
                        {closing.riderCollections.map((rc: any, idx: number) => (
                          <RiderCollectionCard key={idx} rider={rc} index={idx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Walk-in Amount */}
                  {closing.walkInAmount > 0 && (
                    <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-200 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-cyan-700" />
                        <p className="text-xs font-semibold text-cyan-900">Walk-in Sales</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-cyan-900">Total Walk-in</span>
                        <span className="text-xl font-bold text-cyan-700">
                          {formatCurrency(closing.walkInAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Clear Bill Amount */}
                  {closing.clearBillAmount !== 0 && (
                    <div className={`rounded-lg p-3 border mb-4 ${
                      closing.clearBillAmount >= 0 
                        ? 'bg-indigo-50 border-indigo-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className={`h-4 w-4 ${closing.clearBillAmount >= 0 ? 'text-indigo-700' : 'text-red-700'}`} />
                        <p className={`text-xs font-semibold ${closing.clearBillAmount >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                          {closing.clearBillAmount >= 0 ? 'Clear Bill Sales' : 'Clear Bill (Payable)'}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-semibold ${closing.clearBillAmount >= 0 ? 'text-indigo-900' : 'text-red-900'}`}>
                          Total Clear Bill
                        </span>
                        <span className={`text-xl font-bold ${closing.clearBillAmount >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                          {formatCurrency(Math.abs(closing.clearBillAmount))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Enroute Order Amount */}
                  {closing.enrouteAmount > 0 && (
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <TruckIcon className="h-4 w-4 text-green-700" />
                        <p className="text-xs font-semibold text-green-900">Enroute Orders</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-green-900">Total Enroute</span>
                        <span className="text-xl font-bold text-green-700">
                          {formatCurrency(closing.enrouteAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Payment Methods */}
                  {closing.paymentMethods && closing.paymentMethods.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="h-4 w-4 text-orange-700" />
                        <p className="text-xs font-semibold text-orange-900">Payment Methods</p>
                      </div>
                      <div className="space-y-2">
                        {closing.paymentMethods.map((pm: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="text-xs text-gray-700">
                              {pm.method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-orange-900">
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

                  {/* Timestamp */}
                  <div className="text-xs text-gray-500 pt-3 border-t">
                    Created: {new Date(closing.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyClosings;

