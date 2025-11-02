import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TruckIcon, Package } from "lucide-react";
import { toast } from "sonner";

interface AssignRiderDialogProps {
  trigger?: React.ReactNode;
  orderId?: string;
}

export function AssignRiderDialog({ trigger, orderId }: AssignRiderDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState("");

  // Mock data - replace with actual data
  const riders = [
    { 
      id: 1, 
      name: "Ali Khan", 
      phone: "+91 98765 43215",
      status: "active", 
      currentDeliveries: 3,
      todayCompleted: 12 
    },
    { 
      id: 2, 
      name: "Ravi Kumar", 
      phone: "+91 98765 43216",
      status: "active", 
      currentDeliveries: 5,
      todayCompleted: 8 
    },
    { 
      id: 3, 
      name: "Mohammed Irfan", 
      phone: "+91 98765 43218",
      status: "active", 
      currentDeliveries: 2,
      todayCompleted: 15 
    },
    { 
      id: 4, 
      name: "Sanjay Patel", 
      phone: "+91 98765 43217",
      status: "inactive", 
      currentDeliveries: 0,
      todayCompleted: 0 
    },
  ];

  const selectedRiderData = riders.find(r => r.id.toString() === selectedRider);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedRider) {
      toast.error("Please select a rider");
      return;
    }

    const riderName = riders.find(r => r.id.toString() === selectedRider)?.name;
    toast.success(`Order ${orderId || ""} assigned to ${riderName}`);
    
    setSelectedRider("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <TruckIcon className="mr-2 h-4 w-4" />
            Assign Rider
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Rider to Order</DialogTitle>
          <DialogDescription>
            {orderId ? `Select a rider for order ${orderId}` : "Select a rider for the order"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="rider">
              Select Rider <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedRider} onValueChange={setSelectedRider} required>
              <SelectTrigger id="rider">
                <SelectValue placeholder="Choose a rider" />
              </SelectTrigger>
              <SelectContent>
                {riders.map((rider) => (
                  <SelectItem 
                    key={rider.id} 
                    value={rider.id.toString()}
                    disabled={rider.status === "inactive"}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <TruckIcon className="h-4 w-4" />
                      <span>{rider.name}</span>
                      <Badge 
                        variant={rider.status === "active" ? "default" : "secondary"}
                        className="ml-auto"
                      >
                        {rider.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Rider Details */}
          {selectedRiderData && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Rider Name</p>
                    <p className="font-medium">{selectedRiderData.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedRiderData.phone}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-warning" />
                        <p className="text-2xl font-bold">{selectedRiderData.currentDeliveries}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Current Deliveries</p>
                    </div>
                    
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-success" />
                        <p className="text-2xl font-bold">{selectedRiderData.todayCompleted}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Completed Today</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign Rider</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
