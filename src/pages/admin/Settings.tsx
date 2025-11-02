import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building2, MapPin, LogOut, ArrowLeft, Droplet, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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

const Settings = () => {
  const { logout } = useAuth();
  const [name, setName] = useState("Admin User");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("Smart Supply");
  const [address, setAddress] = useState("");
  const [newArea, setNewArea] = useState("");
  const [areas, setAreas] = useState(["Sector 15", "Green Park"]);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    window.location.href = '/login';
  };

  const handleAddArea = () => {
    if (newArea.trim()) {
      setAreas([...areas, newArea]);
      setNewArea("");
      toast.success("Delivery area added");
    }
  };

  const handleRemoveArea = (areaToRemove: string) => {
    setAreas(areas.filter(area => area !== areaToRemove));
    toast.success("Delivery area removed");
  };

  const handleUpdateProfile = () => {
    // Add your update logic here
    toast.success("Profile updated successfully");
  };

  const handleSaveCompany = () => {
    // Add your save logic here
    toast.success("Company details saved successfully");
  };

  return (
    <div className="min-h-screen">
      {/* Mobile Layout */}
      <div className="md:hidden pb-20">
        {/* Top Section - Blue Gradient Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6 pb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 mb-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Droplet className="h-6 w-6 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <p className="text-sm text-white/90">Settings</p>
              <p className="text-2xl font-bold text-white">App Configuration</p>
            </div>
          </div>
        </div>

        {/* Content - White Cards */}
        <div className="bg-white rounded-t-3xl -mt-4 p-6 space-y-4 pb-4">
          {/* Admin Profile Card */}
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-5 w-5 text-blue-600" />
              <p className="font-bold text-gray-900">Admin Profile</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-gray-700">Name</Label>
                <Input
                  id="name"
                  placeholder="Admin Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm text-gray-700">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-gray-700">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button onClick={handleUpdateProfile} className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white">
                Update Profile
              </Button>
            </div>
          </div>

          {/* Company Details Card */}
          <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-green-600" />
              <p className="font-bold text-gray-900">Company Details</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm text-gray-700">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Smart Supply"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm text-gray-700">Business Address</Label>
                <Input
                  id="address"
                  placeholder="Enter business address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button onClick={handleSaveCompany} className="w-full h-12 bg-green-600 hover:bg-green-700 text-white">
                Save Changes
              </Button>
            </div>
          </div>

          {/* Delivery Areas Card */}
          <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-purple-600" />
              <p className="font-bold text-gray-900">Delivery Areas</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Manage the areas where you provide delivery services
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Add delivery area"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  className="h-11"
                />
                <Button onClick={handleAddArea} className="h-11 bg-purple-600 hover:bg-purple-700 text-white">
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {areas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <span className="text-sm font-medium text-gray-900">{area}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveArea(area)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Logout Card */}
          <div className="bg-gradient-to-br from-white to-red-50/30 rounded-2xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-3">
              <LogOut className="h-5 w-5 text-red-600" />
              <p className="font-bold text-gray-900">Logout</p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Sign out of your admin account
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-12">
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to logout of your admin account?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block max-w-4xl mx-auto px-6 py-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Admin Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button onClick={handleUpdateProfile}>Update Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  placeholder="Smart Supply"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  placeholder="Enter business address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveCompany}>Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage the areas where you provide delivery services
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Add delivery area"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                />
                <Button onClick={handleAddArea}>Add Area</Button>
              </div>
              <div className="space-y-2">
                {areas.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span>{area}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveArea(area)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <LogOut className="h-5 w-5" />
                Logout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Sign out of your admin account
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Logout</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to logout of your admin account?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
