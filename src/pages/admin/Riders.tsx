import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Phone, Loader2, RefreshCw, Search, Users, Truck, Package, Eye, Edit, Trash2, Mail, Droplet } from "lucide-react";
import { Link } from "react-router-dom";
import { AddRiderDialog } from "@/components/admin/AddRiderDialog";
import { AssignRiderDialog } from "@/components/admin/AssignRiderDialog";
import { EditRiderDialog } from "@/components/admin/EditRiderDialog";
import { DeleteRiderDialog } from "@/components/admin/DeleteRiderDialog";
import { RiderStatusToggle } from "@/components/admin/RiderStatusToggle";
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
import { toast } from "sonner";

const Riders = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState(null);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getRiders();

      if (response.success) {
        setRiders(response.data);
      } else {
        setError(response.message || 'Failed to fetch riders');
      }
    } catch (error) {
      console.error('Error fetching riders:', error);
      setError('Failed to fetch riders. Please check your connection and try again.');
      setRiders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRiders = riders.filter((rider) => {
    const matchesSearch =
      rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.phone.includes(searchQuery) ||
      rider.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && rider.isActive) ||
      (statusFilter === "inactive" && !rider.isActive);

    return matchesSearch && matchesStatus;
  });

  // Quick metrics for header (based on current filter results)
  const totalCount = filteredRiders.length;
  const activeCount = filteredRiders.filter((r: any) => r.isActive).length;
  const inactiveCount = filteredRiders.filter((r: any) => !r.isActive).length;
  const totalPendingDeliveries = filteredRiders.reduce((sum, r: any) => sum + (r.pendingDeliveries || 0), 0);

  const handleEditRider = (rider) => {
    setSelectedRider(rider);
    setEditDialogOpen(true);
  };

  const handleDeleteRider = (rider) => {
    setSelectedRider(rider);
    setDeleteDialogOpen(true);
  };

  const handleRiderUpdated = (updatedRider) => {
    setRiders(prev =>
      prev.map(r =>
        r.id === updatedRider.id ? updatedRider : r
      )
    );
    setEditDialogOpen(false);
    setSelectedRider(null);
  };

  const handleRiderDeleted = (riderId) => {
    setRiders(prev => prev.filter(r => r.id !== riderId));
    setDeleteDialogOpen(false);
    setSelectedRider(null);
  };

  const handleRiderStatusChange = (riderId, isActive) => {
    setRiders(prev =>
      prev.map(r =>
        r.id === riderId ? { ...r, isActive } : r
      )
    );
  };

  useEffect(() => {
    fetchRiders();
  }, []);

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
              <h1 className="text-2xl font-bold text-white">Riders</h1>
              <p className="text-sm text-white/90">Manage delivery riders</p>
            </div>
          </div>

          {/* Metrics 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{totalCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{activeCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Active</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Truck className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{inactiveCount}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Inactive</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 border border-white/30">
              <div className="flex items-center gap-2">
                <Package className="h-6 w-6 text-white" />
                <p className="text-2xl font-bold text-white">{totalPendingDeliveries}</p>
              </div>
              <p className="text-xs text-white/80 mt-1">Pending</p>
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
                  <SelectItem value="all">All Riders</SelectItem>
                  <SelectItem value="active">Active Riders</SelectItem>
                  <SelectItem value="inactive">Inactive Riders</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <AddRiderDialog onSuccess={fetchRiders} />
                {/* <AssignRiderDialog /> */}
              </div>
            </div>

            <div className="relative">
              <div className="flex flex-row justify-between items-center">
                <div className="flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {/* <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRiders}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div> */}
              </div>
            </div>
          </div>

          {/* Mobile list states & cards */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading riders...</div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button
                variant="outline"
                onClick={fetchRiders}
                disabled={loading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-muted-foreground">No riders found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRiders.map((rider: any) => (
                <div key={rider.id} className="bg-white rounded-2xl p-4 border border-cyan-100 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{rider.name}</p>
                      <p className="text-xs text-gray-500">ID: {rider.id.slice(-6)}</p>
                    </div>
                    <RiderStatusToggle
                      riderId={rider.id}
                      isActive={rider.isActive}
                      onStatusChange={(isActive) => {
                        setRiders(prev => prev.map((r: any) => r.id === rider.id ? { ...r, isActive } : r));
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="h-4 w-4" />
                      <span>{rider.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      <span className="line-clamp-1">{rider.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-blue-700">Deliveries</p>
                        <p className="text-sm font-semibold text-blue-900">{rider.totalDeliveries || 0}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-purple-700">Pending</p>
                        <p className="text-sm font-semibold text-purple-900">{rider.pendingDeliveries || 0}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-amber-700">Current</p>
                        <p className="text-sm font-semibold text-amber-900">{rider.currentOrders?.length || 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Link to={`/admin/riders/${rider.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleEditRider(rider)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRider(rider)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Header + White Container */}
      <div className="hidden md:block max-w-4xl mx-auto">
        {/* Blue Gradient Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-8 shadow-2xl rounded-3xl mb-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl">
              <Droplet className="h-12 w-12 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Riders</h1>
              <p className="text-white/90 mt-1">Manage delivery riders</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{totalCount}</p>
              <p className="text-sm text-white/80 mt-1">Total</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{activeCount}</p>
              <p className="text-sm text-white/80 mt-1">Active</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Truck className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{inactiveCount}</p>
              <p className="text-sm text-white/80 mt-1">Inactive</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 border border-white/30">
              <div className="w-16 h-16 bg-white/30 rounded-2xl flex items-center justify-center mb-3">
                <Package className="h-8 w-8 text-white" />
              </div>
              <p className="text-4xl font-bold text-white">{totalPendingDeliveries}</p>
              <p className="text-sm text-white/80 mt-1">Pending</p>
            </div>
          </div>
        </div>

        {/* White container with existing table card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border border-cyan-100">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-col md:items-center max-w-4xl">
                <div className="flex flex-row w-full justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    All Riders ({filteredRiders.length})
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, phone, or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full md:w-[300px]"
                    />
                  </div>
                </div>
                <div className="flex flex-row w-full justify-between items-center">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Riders</SelectItem>
                      <SelectItem value="active">Active Riders</SelectItem>
                      <SelectItem value="inactive">Inactive Riders</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-row justify-end items-center gap-2">
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchRiders}
                      disabled={loading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button> */}
                    <AddRiderDialog onSuccess={fetchRiders} />
                    {/* <AssignRiderDialog /> */}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Loading riders...</div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Error loading riders</h3>
                  <p className="text-muted-foreground text-center mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={fetchRiders}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Try Again
                  </Button>
                </div>
              ) : filteredRiders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No riders found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery || statusFilter !== 'all'
                      ? 'No riders match your current filters. Try adjusting your search or filter criteria.'
                      : 'No riders have been added yet. Click "Add Rider" to get started.'
                    }
                  </p>
                  {(!searchQuery && statusFilter === 'all') && (
                    <AddRiderDialog onSuccess={fetchRiders} />
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rider</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Deliveries</TableHead>
                        <TableHead>Pending</TableHead>
                        <TableHead>Performance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRiders.map((rider) => (
                        <TableRow key={rider.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{rider.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {rider.id.slice(-6)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                {rider.phone}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {rider.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium text-lg">{rider.totalDeliveries || 0}</div>
                              <div className="text-xs text-muted-foreground">completed</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="font-medium text-lg">{rider.pendingDeliveries || 0}</div>
                              <div className="text-xs text-muted-foreground">pending</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {rider.currentOrders?.length || 0}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">current orders</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <RiderStatusToggle
                              riderId={rider.id}
                              isActive={rider.isActive}
                              onStatusChange={(isActive) => handleRiderStatusChange(rider.id, isActive)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link to={`/admin/riders/${rider.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditRider(rider)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRider(rider)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
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

          {/* Edit Rider Dialog */}
          <EditRiderDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            rider={selectedRider}
            onRiderUpdated={handleRiderUpdated}
          />

          {/* Delete Rider Dialog */}
          <DeleteRiderDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            rider={selectedRider}
            onRiderDeleted={handleRiderDeleted}
          />
        </div>
      </div>
    </div>
  );
};

export default Riders;
