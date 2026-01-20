import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

const EnrouteOrderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState("walkin");
  const [bottles, setBottles] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [loading, setLoading] = useState(false);
  const [canCreateOrders, setCanCreateOrders] = useState(false);

  useEffect(() => {
    const currentUser = apiService.getCurrentUser();
    if (currentUser?.riderProfile) {
      setCanCreateOrders(!!currentUser.riderProfile.canCreateOrders);
    } else if (currentUser?.profile) {
      setCanCreateOrders(!!currentUser.profile.canCreateOrders);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateOrders) {
      toast.error("You are not allowed to create orders");
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

    const orderAmount = parseInt(bottles) * parseFloat(unitPrice);

    if (!amountReceived || parseFloat(amountReceived) <= 0) {
      toast.error("Please enter amount received");
      return;
    }

    if (parseFloat(amountReceived) !== orderAmount) {
      toast.error("Enroute order must be fully paid. Amount received must equal order amount.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customerId,
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
              <p className="text-sm text-white/90">Create & deliver fully paid order</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-t-3xl -mt-5 p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="text-sm text-gray-700 border rounded-md px-3 py-2 bg-gray-50">
                Walk-in Customer (enroute)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="rounded-lg border bg-cyan-50 p-3 flex items-center justify-between">
                <span className="text-sm font-medium text-cyan-800">Order amount</span>
                <span className="text-lg font-bold text-cyan-900">
                  RS. {parseInt(bottles) * parseFloat(unitPrice || "0")}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount received (RS.)</Label>
              <Input
                type="number"
                min={0}
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
                placeholder="Must equal order amount"
              />
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

            <div className="pt-2 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/rider")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create & deliver"
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
                Create a walk-in style order that is delivered and fully paid on the spot.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cyan-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="text-sm text-gray-700 border rounded-md px-3 py-2 bg-gray-50">
                Walk-in Customer (enroute)
              </div>
            </div>

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
                  <p className="text-xs text-blue-700 font-medium mb-1">Order amount</p>
                  <p className="text-2xl font-bold text-blue-900">
                    RS. {parseInt(bottles) * parseFloat(unitPrice || "0")}
                  </p>
                </div>
                <div className="rounded-2xl border bg-green-50 p-4 flex flex-col justify-between">
                  <p className="text-xs text-green-700 font-medium mb-1">Amount received</p>
                  <Input
                    type="number"
                    min={0}
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="Must equal order amount"
                  />
                </div>
                <div className="rounded-2xl border bg-amber-50 p-4 flex flex-col justify-between text-xs text-amber-800">
                  <p className="font-semibold mb-1">Rule</p>
                  <p>Enroute order must be fully paid. Amount received must equal the total order amount.</p>
                </div>
              </div>
            )}

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
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create & deliver"
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

