import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Package, CheckCircle, Calendar, DollarSign, User, CreditCard, FileText, X, Send, Edit2, Save, Loader2 } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { toast } from "sonner";
import { formatPktDateTime12Hour, formatPktDate } from "@/utils/timezone";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const RiderOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [order, setOrder] = useState<any>(null);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [editedQuantity, setEditedQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  
  // Helper function to get payment status badge
  const getPaymentStatusBadge = (status?: string) => {
    const paymentStatus = status?.toUpperCase();
    switch (paymentStatus) {
      case 'PAID':
        return { text: 'PAID', className: 'bg-green-100 text-green-700' };
      case 'NOT_PAID':
        return { text: 'NOT PAID', className: 'bg-red-100 text-red-700' };
      case 'PARTIAL':
        return { text: 'PARTIAL', className: 'bg-orange-100 text-orange-700' };
      case 'OVERPAID':
        return { text: 'OVERPAID', className: 'bg-purple-100 text-purple-700' };
      case 'REFUND':
        return { text: 'REFUND', className: 'bg-blue-100 text-blue-700' };
      default:
        return { text: 'NOT PAID', className: 'bg-red-100 text-red-700' };
    }
  };
  
  // Calculate if we owe customer or customer owes us (after order is loaded)
  const totalAmount = order?.totalAmount ?? 0;
  const isPayable = totalAmount < 0;
  const isReceivable = totalAmount > 0;
  const isClear = totalAmount === 0;

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

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiService.getOrderById(id as string) as any;
        if (res?.success) setOrder(res.data);
      } catch (e) {
        // If id is short code, try to refetch by translating from dashboard data if available later
        setOrder(null);
      }
    };
    load();
  }, [id]);

  const handleDeliveryComplete = async () => {
    try {
      let paymentAmount = 0;
      
      // Handle different scenarios
      if (isClear) {
        // No payment needed
        paymentAmount = 0;
      } else if (isPayable) {
        // We owe customer - convert positive amount to negative (refund)
        paymentAmount = amount ? parseFloat(amount) : 0;
        if (paymentAmount > 0) {
          paymentAmount = -paymentAmount; // Convert to negative for refund
        }
        // If amount is 0 or negative, keep as is
      } else if (isReceivable) {
        // Customer owes us - amount should be positive
        paymentAmount = amount ? parseFloat(amount) : 0;
      }
      
      const res = await apiService.deliverOrder(id as string, { paymentAmount, paymentMethod, notes });
      if ((res as any)?.success) {
        const action = isPayable ? 'refunded' : 'delivered';
        toast.success(`Order #${(res as any).data.id.slice(-4)} ${action}`);
        navigate("/rider");
      } else {
        toast.error((res as any)?.message || 'Failed to process delivery');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to process delivery');
    }
  };

  const handleCancelOrder = async () => {
    try {
      const res = await apiService.cancelOrder(id as string);
      if ((res as any)?.success) {
        toast.success(`Order #${(res as any).data.id.slice(-4)} cancelled`);
        navigate("/rider");
      } else {
        toast.error((res as any)?.message || 'Failed to cancel order');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel order');
    }
  };

  const handleEditQuantity = () => {
    setShowEditConfirm(true);
  };

  const handleConfirmEdit = () => {
    setShowEditConfirm(false);
    setIsEditingQuantity(true);
    setEditedQuantity(order?.numberOfBottles?.toString() || "1");
  };

  const handleCancelEdit = () => {
    setIsEditingQuantity(false);
    setEditedQuantity("");
  };

  const handleSaveEdit = async () => {
    if (!editedQuantity || parseInt(editedQuantity) < 1) {
      toast.error("Please enter a valid quantity (at least 1)");
      return;
    }

    if (parseInt(editedQuantity) === order?.numberOfBottles) {
      setIsEditingQuantity(false);
      setEditedQuantity("");
      return;
    }

    try {
      setIsSaving(true);
      const res = await apiService.editOrderByRider(id as string, {
        numberOfBottles: parseInt(editedQuantity)
      }) as any;

      if (res?.success) {
        toast.success("Order updated successfully");
        setIsEditingQuantity(false);
        setEditedQuantity("");
        // Reload order to get updated values
        const updatedRes = await apiService.getOrderById(id as string) as any;
        if (updatedRes?.success) {
          setOrder(updatedRes.data);
        }
        // Stay on the same page (auto-refresh)
      } else {
        toast.error(res?.message || 'Failed to update order');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update order');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate preview values when editing
  const calculatePreview = () => {
    if (!order || !isEditingQuantity || !editedQuantity) return null;
    
    const newQuantity = parseInt(editedQuantity);
    if (isNaN(newQuantity) || newQuantity < 1) return null;

    const unitPrice = parseFloat(order.currentOrderAmount) / order.numberOfBottles;
    const newCurrentOrderAmount = newQuantity * unitPrice;
    const customerBalanceSnapshot = parseFloat(order.customerBalance);
    const newTotalAmount = customerBalanceSnapshot + newCurrentOrderAmount;

    return {
      newCurrentOrderAmount,
      newTotalAmount,
      unitPrice
    };
  };

  const preview = calculatePreview();
  const canEdit = order && (order.status === 'ASSIGNED' || order.status === 'IN_PROGRESS');

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/rider">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Order</h1>
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Safety check to prevent rendering errors
  if (!order.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/rider">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Order</h1>
            <p className="text-muted-foreground">Order data is incomplete</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if order is delivered - show completed order view
  if (order.status?.toLowerCase() === 'delivered') {
    return (
      <div className="min-h-screen pb-24 md:pb-6">
        {/* Mobile Layout - Completed Order */}
        <div className="md:hidden">
          {/* Top Section - Green Gradient Header */}
          <div className="bg-gradient-to-br from-green-700 via-green-600 to-green-800 p-6 space-y-4">
            {/* Back Button */}
            <Link to="/rider">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 mb-4">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" fill="currentColor" />
              </div>
              <div>
                <p className="text-sm text-white/90">Order #</p>
                <p className="text-2xl font-bold text-white">{order.id.slice(-4)}</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge className="bg-white text-green-700 font-semibold">
                Completed
              </Badge>
            </div>
          </div>

          {/* Content - White Cards */}
          <div className="bg-white rounded-t-3xl -mt-10 p-6 space-y-4">
            {/* Customer Info Card */}
            <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-4 border border-blue-100">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-lg truncate">{order?.customer?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <a href={`tel:${order?.customer?.phone}`} className="text-sm text-gray-600 truncate">
                      {order?.customer?.phone}
                    </a>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <span className="line-clamp-2">
                  {[order?.customer?.houseNo, order?.customer?.streetNo, order?.customer?.area, order?.customer?.city].filter(Boolean).join(' ') || 'Address not available'}
                </span>
              </div>
            </div>

            {/* Order Details Card */}
            <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-green-600" />
                <p className="font-bold text-gray-900">Order Details</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bottles</span>
                  <span className="font-semibold text-gray-900">{order?.numberOfBottles} bottles</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                  <span className="text-sm text-gray-600">Order Date</span>
                  <span className="text-sm font-medium text-gray-700">
                    {order?.createdAt ? formatPktDate(order.createdAt) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Summary Card */}
            <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-4 border border-amber-100">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <p className="font-bold text-gray-900">Payment Summary</p>
              </div>
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Total Amount</span>
                    <span className="font-bold text-lg text-gray-900">
                      RS. {order?.totalAmount || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Paid Amount</span>
                    <span className="font-semibold text-green-700">
                      RS. {order?.paidAmount || 0}
                    </span>
                  </div>
                  {(order?.payable && parseFloat(order.payable) > 0) && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-red-600">Payable (Customer owes)</span>
                      <span className="font-semibold text-red-700">
                        RS. {order.payable}
                      </span>
                    </div>
                  )}
                  {(order?.receivable && parseFloat(order.receivable) > 0) && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-blue-600">Receivable (We owe)</span>
                      <span className="font-semibold text-blue-700">
                        RS. {order.receivable}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 border-t">
                  <Badge className={getPaymentStatusBadge(order?.paymentStatus).className}>
                    {getPaymentStatusBadge(order?.paymentStatus).text}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Completed Order */}
        <div className="hidden md:block max-w-4xl mx-auto px-6">
          {/* Top Section - Green Gradient */}
          <div className="bg-gradient-to-r from-green-500 to-green-700 rounded-3xl p-8 shadow-2xl mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-6">
                <Link to="/rider">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                    <CheckCircle className="h-10 w-10 text-green-600" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-white/90 text-sm">Order Details</p>
                    <h1 className="text-3xl font-bold text-white">Order #{order.id.slice(-4)}</h1>
                  </div>
                </div>
              </div>
              <Badge className="bg-white text-green-700 text-lg px-4 py-2">Completed</Badge>
            </div>
          </div>

          {/* Content Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold text-lg">{order?.customer?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${order?.customer?.phone}`} className="text-primary hover:underline">
                    {order?.customer?.phone}
                  </a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {[order?.customer?.houseNo, order?.customer?.streetNo, order?.customer?.area, order?.customer?.city].filter(Boolean).join(' ') || 'Address not available'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card className="border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-semibold">{order?.numberOfBottles} bottles</span>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-muted-foreground">Order Date</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {order?.createdAt ? formatPktDate(order.createdAt) : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t pt-3">
                  <span className="text-muted-foreground">Status</span>
                  <Badge className="bg-green-100 text-green-700">Delivered</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Payment Summary - Full Width */}
            <Card className="md:col-span-2 border-amber-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-amber-600" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Total Amount</p>
                    <p className="text-3xl font-bold text-gray-900">RS. {order?.totalAmount || 0}</p>
                  </div>
                  <div className="text-center border-x">
                    <p className="text-sm text-muted-foreground mb-2">Paid Amount</p>
                    <p className="text-3xl font-bold text-green-700">RS. {order?.paidAmount || 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <Badge className={`text-lg px-4 py-2 ${getPaymentStatusBadge(order?.paymentStatus).className}`}>
                      {getPaymentStatusBadge(order?.paymentStatus).text}
                    </Badge>
                  </div>
                </div>
                
                {(order?.payable && parseFloat(order.payable) > 0) || (order?.receivable && parseFloat(order.receivable) > 0) ? (
                  <div className="border-t pt-6 space-y-3">
                    {order?.payable && parseFloat(order.payable) > 0 && (
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm font-semibold text-red-700">Payable (Customer owes)</span>
                        <span className="text-2xl font-bold text-red-700">RS. {order.payable}</span>
                      </div>
                    )}
                    {order?.receivable && parseFloat(order.receivable) > 0 && (
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-semibold text-blue-700">Receivable (We owe)</span>
                        <span className="text-2xl font-bold text-blue-700">RS. {order.receivable}</span>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 md:pb-6">
      {/* Mobile Layout - Non-delivered Orders */}
      <div className="md:hidden">
        {/* Top Section - Blue Gradient Header */}
        <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-blue-800 p-6 space-y-4">
          {/* Back Button */}
          <Link to="/rider">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 mb-4">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-blue-600" fill="currentColor" />
            </div>
            <div>
              <p className="text-sm text-white/90">Order #</p>
              <p className="text-2xl font-bold text-white">{order.id.slice(-4)}</p>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge className="bg-white text-blue-700 font-semibold">
              {order.status?.toUpperCase() || 'Active'}
            </Badge>
          </div>
        </div>

        {/* Content - White Cards */}
        <div className="bg-white rounded-t-3xl -mt-10 p-6 space-y-4 pb-32">
          {/* Customer Info Card */}
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-lg truncate">{order?.customer?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <a href={`tel:${order?.customer?.phone}`} className="text-sm text-gray-600 truncate">
                    {order?.customer?.phone}
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <span className="line-clamp-2">
                {[order?.customer?.houseNo, order?.customer?.streetNo, order?.customer?.area, order?.customer?.city].filter(Boolean).join(' ') || 'Address not available'}
              </span>
            </div>
          </div>

          {/* Order Details Card */}
          <div className="bg-gradient-to-br from-white to-cyan-50/30 rounded-2xl p-4 border border-cyan-100">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-cyan-600" />
              <p className="font-bold text-gray-900">Order Information</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Bottles</span>
                <span className="font-semibold text-gray-900">{order?.numberOfBottles} bottles</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2">
                <span className="text-sm text-gray-600">Current Amount</span>
                <span className="text-sm font-medium text-gray-700">
                  RS. {preview ? preview.newCurrentOrderAmount.toFixed(2) : (order?.currentOrderAmount ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2">
                <span className="text-sm text-gray-600">Pending Balance</span>
                <span className="text-sm font-medium text-gray-700">
                  RS. {Math.abs(order?.customerBalance ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2 bg-cyan-50 rounded-lg p-2">
                <span className="text-sm font-bold text-gray-900">Total Amount</span>
                <span className="text-lg font-bold text-cyan-700">
                  RS. {preview ? preview.newTotalAmount.toFixed(2) : (order?.totalAmount ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details Card */}
          <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <p className="font-bold text-gray-900">Payment Details</p>
            </div>
            <div className="space-y-3">
              {!isClear && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm text-gray-700">
                      {isPayable ? "Amount to Refund" : "Amount Received"}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder={isPayable ? "Enter refund amount" : "Enter amount"}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={0}
                      max={isPayable ? Math.abs(totalAmount) : totalAmount}
                      className="h-11"
                    />
                    {order && totalAmount !== 0 && (
                      <p className="text-xs text-gray-500">
                        {isPayable 
                          ? `We owe RS. ${Math.abs(totalAmount || 0)}`
                          : `Total: RS. ${totalAmount || 0}`
                        }
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-sm text-gray-700">
                      {isPayable ? "Refund Method" : "Payment Method"}
                    </Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={`Select ${isPayable ? 'refund' : 'payment'} method`} />
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
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm text-gray-700 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about the delivery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              
              {isClear && (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">No payment required - balance is clear</p>
                </div>
              )}
            </div>
          </div>

          {/* Edit Confirmation Dialog */}
          <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
            <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Edit Order Quantity</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Are you sure you want to edit this order? You can change the number of bottles.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">No, Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmEdit} className="w-full sm:w-auto">
                  Yes, Edit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white" size="lg">
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    Are you sure you want to cancel order #{order.id.slice(-4)}? This will revert the customer's balance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelOrder}>
                    Confirm Cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white" size="lg">
                  <Send className="h-5 w-5 mr-2" />
                  {isPayable ? "Refund & Deliver" : isReceivable ? "Deliver & Paid" : "Deliver"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isPayable ? "Confirm Refund" : "Confirm Delivery"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isPayable 
                      ? `Process refund for order #${order?.id?.slice(-4) || 'N/A'}? We owe customer RS. ${Math.abs(totalAmount || 0)}. ${amount ? `Refund amount: RS. ${amount}` : 'No refund will be given.'}`
                      : isReceivable
                      ? `Mark order #${order?.id?.slice(-4) || 'N/A'} as delivered? Payment status will be determined by the amount entered above.`
                      : `Mark order #${order?.id?.slice(-4) || 'N/A'} as delivered? No payment required.`
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeliveryComplete}>
                    {isPayable ? "Confirm Refund" : "Confirm Delivery"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Keep original for desktop */}
      <div className="hidden md:block max-w-4xl mx-auto px-6 py-6">
        {/* Edit Confirmation Dialog for Desktop */}
        <AlertDialog open={showEditConfirm} onOpenChange={setShowEditConfirm}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Order Quantity</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Are you sure you want to edit this order? You can change the number of bottles.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmEdit}>
                Yes, Edit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/rider">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Order #{order ? order.id.slice(-4) : id}</h1>
              <p className="text-muted-foreground">Mark delivery status</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-lg">{order?.customer?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${order?.customer?.phone}`} className="text-primary underline">
                  {order?.customer?.phone}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <p className="text-muted-foreground">{[order?.customer?.houseNo, order?.customer?.streetNo, order?.customer?.area, order?.customer?.city].filter(Boolean).join(' ')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Quantity</span>
                {isEditingQuantity ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editedQuantity}
                      onChange={(e) => setEditedQuantity(e.target.value)}
                      min={1}
                      className="w-20 h-9 text-center"
                      disabled={isSaving}
                    />
                    <span className="text-sm text-muted-foreground">bottles</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{order?.numberOfBottles} bottles</span>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditQuantity}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {isEditingQuantity && preview && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-2 text-sm border border-blue-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Current Amount:</span>
                    <span className="font-semibold text-blue-700">RS. {preview.newCurrentOrderAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Total Amount:</span>
                    <span className="font-bold text-blue-700">RS. {preview.newTotalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
                <span>Current Order Amount</span>
                <span>RS. {preview ? preview.newCurrentOrderAmount.toFixed(2) : (order?.currentOrderAmount ?? 0)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending Balance</span>
                <div className="text-right">
                  <Badge variant={(order?.customerBalance ?? 0) < 0 ? "destructive" : "default"}>
                    {(order?.customerBalance ?? 0) < 0 ? "Payable" : (order?.customerBalance ?? 0) > 0 ? "Receivable" : 'Clear'}
                  </Badge>
                  <p className="text-sm font-semibold mt-1">
                    RS. {Math.abs(order?.customerBalance ?? 0)}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xl font-bold border-t-2 border-primary pt-4 bg-primary/5 p-3 rounded-lg">
                <span>Total Amount</span>
                <span className="text-primary">
                  RS. {preview ? preview.newTotalAmount.toFixed(2) : (order?.totalAmount ?? 0)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Current order amount plus pending balance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {isPayable ? "Refund Details" : isReceivable ? "Payment Details" : "Delivery Details"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isClear ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No payment required - balance is clear</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      {isPayable ? "Amount to Refund" : "Amount Received"}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder={isPayable ? "Enter refund amount" : "Enter amount"}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={isPayable ? 0 : 0}
                      max={isPayable ? Math.abs(totalAmount) : totalAmount}
                    />
                    {order && totalAmount !== 0 && (
                      <p className="text-xs text-muted-foreground">
                        {isPayable 
                          ? `We owe customer RS. ${Math.abs(totalAmount || 0)}. Enter refund amount (0 to ${Math.abs(totalAmount || 0)}).`
                          : `Total: RS. ${totalAmount || 0}. Enter 0 to ${totalAmount || 0} for payment.`
                        }
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">
                      {isPayable ? "Refund Method" : "Payment Method"}
                    </Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${isPayable ? 'refund' : 'payment'} method`} />
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
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about the delivery"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" size="lg" variant="default">
                  {isPayable ? "Refund & Deliver" : isReceivable ? "Deliver & Collect Payment" : "Deliver (No Payment)"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isPayable ? "Confirm Refund" : "Confirm Delivery"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isPayable 
                      ? `Process refund for order #${order?.id?.slice(-4) || 'N/A'}? We owe customer RS. ${Math.abs(totalAmount || 0)}. ${amount ? `Refund amount: RS. ${amount}` : 'No refund will be given.'}`
                      : isReceivable
                      ? `Mark order #${order?.id?.slice(-4) || 'N/A'} as delivered? Payment status will be determined by the amount entered above.`
                      : `Mark order #${order?.id?.slice(-4) || 'N/A'} as delivered? No payment required.`
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeliveryComplete}>
                    {isPayable ? "Confirm Refund" : "Confirm Delivery"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" size="lg" variant="destructive">
                  Cancel Order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
                  <AlertDialogDescription className="text-base">
                    Are you sure you want to cancel order #{order.id.slice(-4)}? This will revert the customer's balance.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancelOrder} className="w-full sm:w-auto">
                    Confirm Cancellation
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderOrderDetail;
