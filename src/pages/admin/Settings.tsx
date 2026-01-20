import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Building2,
  Droplet,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Mail,
  MapPin,
  X,
  Plus,
  Trash2,
  Save,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiService } from "@/services/api";
import { toast } from "sonner";
import { customerSyncService } from "@/services/customerSync";

interface AdminProfile {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
}

interface CompanySetup {
  id: string;
  agencyName: string;
  agencyAddress: string;
  agencyPhoneNumber: string;
  agencyLogo: string;
  areasOperated: string[];
  bottle_categories?: BottleCategory[];
}

interface BottleCategory {
  id: string;
  categoryName: string;
  price: number;
  companySetupId: string;
}

const Settings = () => {
  // Loading states
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Admin Profile
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [editName, setEditName] = useState(false);
  const [editPhone, setEditPhone] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");

  // Password Modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);

  // Company Setup
  const [companySetup, setCompanySetup] = useState<CompanySetup | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    agencyName: "",
    agencyAddress: "",
    agencyPhoneNumber: "",
    agencyLogo: "",
  });
  const [areasOperated, setAreasOperated] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Bottle Categories
  const [categories, setCategories] = useState<BottleCategory[]>([]);
  const [editedCategories, setEditedCategories] = useState<{ [key: string]: { categoryName: string; price: number } }>({});

  // Customer Sync
  const [syncingCustomers, setSyncingCustomers] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load admin profile
      const profileRes = await apiService.getAdminProfile() as any;
      if (profileRes.success) {
        setAdminProfile(profileRes.data);
        setNameValue(profileRes.data.name || "");
        setPhoneValue(profileRes.data.phone || "");
      }

      // Load company setup
      const companyRes = await apiService.getCompanySetup() as any;
      if (companyRes.success && companyRes.data) {
        setCompanySetup(companyRes.data);
        setAreasOperated(Array.isArray(companyRes.data.areasOperated) ? companyRes.data.areasOperated : []);
        setCompanyForm({
          agencyName: companyRes.data.agencyName || "",
          agencyAddress: companyRes.data.agencyAddress || "",
          agencyPhoneNumber: companyRes.data.agencyPhoneNumber || "",
          agencyLogo: companyRes.data.agencyLogo || "",
        });
        setLogoPreview(companyRes.data.agencyLogo || "");

        // Load bottle categories
        if (companyRes.data.id) {
          await loadCategories(companyRes.data.id);
        }
      }
    } catch (error: any) {
      console.error("Load data error:", error);
      toast.error("Failed to load settings data");
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async (companySetupId: string) => {
    try {
      const res = await apiService.getBottleCategories(companySetupId) as any;
      if (res.success) {
        const loadedCategories = res.data || [];
        setCategories(loadedCategories);
        // Initialize edited categories with current values
        const initialEdited: { [key: string]: { categoryName: string; price: number } } = {};
        loadedCategories.forEach((cat: BottleCategory) => {
          initialEdited[cat.id] = {
            categoryName: cat.categoryName,
            price: Number(cat.price),
          };
        });
        setEditedCategories(initialEdited);
      }
    } catch (error: any) {
      console.error("Load categories error:", error);
      toast.error("Failed to load bottle categories");
    }
  };

  // Admin Profile Handlers
  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setProfileLoading(true);
    try {
      const res = await apiService.updateAdminProfile({ name: nameValue }) as any;
      if (res.success) {
        setAdminProfile(res.data);
        setEditName(false);
        toast.success("Name updated successfully");
      } else {
        toast.error(res.message || "Failed to update name");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update name");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSavePhone = async () => {
    setProfileLoading(true);
    try {
      const res = await apiService.updateAdminProfile({ phone: phoneValue || null }) as any;
      if (res.success) {
        setAdminProfile(res.data);
        setEditPhone(false);
        toast.success("Phone updated successfully");
      } else {
        toast.error(res.message || "Failed to update phone");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update phone");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long");
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await apiService.updateAdminPassword({
        currentPassword,
        newPassword,
      }) as any;

      if (res.success) {
        toast.success("Password updated successfully");
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(res.message || "Failed to update password");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Company Setup Handlers
  const handleAddArea = () => {
    if (newArea.trim() && !areasOperated.includes(newArea.trim())) {
      setAreasOperated([...areasOperated, newArea.trim()]);
      setNewArea("");
    }
  };

  const handleRemoveArea = (area: string) => {
    setAreasOperated(areasOperated.filter((a) => a !== area));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCompanyModal = () => {
    if (companySetup) {
      setCompanyForm({
        agencyName: companySetup.agencyName || "",
        agencyAddress: companySetup.agencyAddress || "",
        agencyPhoneNumber: companySetup.agencyPhoneNumber || "",
        agencyLogo: companySetup.agencyLogo || "",
      });
      setAreasOperated(Array.isArray(companySetup.areasOperated) ? companySetup.areasOperated : []);
      setLogoPreview(companySetup.agencyLogo || "");
      setLogoFile(null);
    } else {
      setCompanyForm({
        agencyName: "",
        agencyAddress: "",
        agencyPhoneNumber: "",
        agencyLogo: "",
      });
      setAreasOperated([]);
      setLogoPreview("");
      setLogoFile(null);
    }
    setShowCompanyModal(true);
  };

  const handleSaveCompany = async () => {
    if (!companyForm.agencyName || !companyForm.agencyAddress || !companyForm.agencyPhoneNumber) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (areasOperated.length === 0) {
      toast.error("Please add at least one area");
      return;
    }

    setCompanyLoading(true);
    try {
      let logoUrl = companyForm.agencyLogo;
      if (logoFile) {
        // Convert to base64 or upload - for now using base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          logoUrl = reader.result as string;
          await performCompanySave(logoUrl);
        };
        reader.readAsDataURL(logoFile);
        return;
      }

      await performCompanySave(logoUrl);
    } catch (error: any) {
      toast.error(error.message || "Failed to save company details");
      setCompanyLoading(false);
    }
  };

  const performCompanySave = async (logoUrl: string) => {
    try {
      const setupData = {
        agencyName: companyForm.agencyName,
        agencyAddress: companyForm.agencyAddress,
        agencyPhoneNumber: companyForm.agencyPhoneNumber,
        agencyLogo: logoUrl,
        areasOperated: areasOperated,
      };

      let res;
      if (companySetup) {
        res = await apiService.updateCompanySetup(companySetup.id, setupData) as any;
      } else {
        res = await apiService.createCompanySetup(setupData) as any;
      }

      if (res.success) {
        toast.success("Company details saved successfully");
        setShowCompanyModal(false);
        await loadData();
      } else {
        toast.error(res.message || "Failed to save company details");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save company details");
    } finally {
      setCompanyLoading(false);
    }
  };

  // Bottle Categories Handlers
  const handleCategoryChange = (id: string, field: "categoryName" | "price", value: string | number) => {
    setEditedCategories({
      ...editedCategories,
      [id]: {
        ...editedCategories[id],
        [field]: value,
      },
    });
  };

  const handleAddCategory = () => {
    const newCategory = {
      id: `new-${Date.now()}`,
      categoryName: "",
      price: 0,
      companySetupId: companySetup!.id,
    };
    setCategories([...categories, newCategory]);
    setEditedCategories({
      ...editedCategories,
      [newCategory.id]: {
        categoryName: "",
        price: 0,
      },
    });
  };

  const handleDeleteCategory = async (id: string) => {
    if (id.startsWith("new-")) {
      setCategories(categories.filter((c) => c.id !== id));
      const newEdited = { ...editedCategories };
      delete newEdited[id];
      setEditedCategories(newEdited);
      return;
    }

    try {
      const res = await apiService.deleteBottleCategory(id) as any;
      if (res.success) {
        toast.success("Category deleted successfully");
        await loadCategories(companySetup!.id);
      } else {
        toast.error(res.message || "Failed to delete category");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    }
  };

  const handleSaveCategories = async () => {
    if (!companySetup) return;

    // Validate all categories before saving
    for (const category of categories) {
      const edited = editedCategories[category.id];
      if (!edited || !edited.categoryName.trim()) {
        toast.error("Please fill in category name for all categories");
        return;
      }
      if (edited.price < 0) {
        toast.error("Price cannot be negative");
        return;
      }
    }

    setCategoriesLoading(true);
    try {
      const promises: Promise<any>[] = [];

      // Process all categories
      for (const category of categories) {
        const edited = editedCategories[category.id];
        if (edited) {
          if (category.id.startsWith("new-")) {
            // Create new category
            if (edited.categoryName.trim()) {
              promises.push(
                apiService.createBottleCategory({
                  categoryName: edited.categoryName.trim(),
                  price: edited.price,
                  companySetupId: companySetup.id,
                })
              );
            }
          } else {
            // Check if values changed before updating
            const hasChanges =
              edited.categoryName !== category.categoryName ||
              edited.price !== category.price;
            if (hasChanges) {
              promises.push(
                apiService.updateBottleCategory(category.id, {
                  categoryName: edited.categoryName.trim(),
                  price: edited.price,
                })
              );
            }
          }
        }
      }

      await Promise.all(promises);
      toast.success("Categories saved successfully");
      await loadCategories(companySetup.id);
      setEditedCategories({});
    } catch (error: any) {
      toast.error(error.message || "Failed to save categories");
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleSyncCustomers = async () => {
    setSyncingCustomers(true);
    try {
      const result = await customerSyncService.syncCustomers();
      if (result.success) {
        toast.success("Customers synced successfully");
      } else {
        toast.error(result.message || "Failed to sync customers");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to sync customers");
    } finally {
      setSyncingCustomers(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 md:pb-6">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Mobile Layout */}
      <div className="md:hidden pb-20">
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 p-6 pb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 mb-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <Droplet className="h-6 w-6 text-cyan-600" fill="currentColor" />
            </div>
            <div>
              <p className="text-sm text-white/90">Settings</p>
              <p className="text-2xl font-bold text-white">Manage Settings</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-t-3xl -mt-4 p-6 space-y-4">
          {/* Admin Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Admin Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>Name</Label>
                {editName ? (
                  <div className="flex gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={profileLoading}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNameValue(adminProfile?.name || "");
                        setEditName(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{adminProfile?.name || "N/A"}</p>
                    <Button size="sm" variant="outline" onClick={() => setEditName(true)}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label>Phone</Label>
                {editPhone ? (
                  <div className="flex gap-2">
                    <Input
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={handleSavePhone}
                      disabled={profileLoading}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPhoneValue(adminProfile?.phone || "");
                        setEditPhone(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{adminProfile?.phone || "Not provided"}</p>
                    <Button size="sm" variant="outline" onClick={() => setEditPhone(true)}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="font-medium text-muted-foreground">{adminProfile?.email || "N/A"}</p>
              </div>

              {/* Password Update */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowPasswordModal(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Company Details Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companySetup ? (
                <div className="space-y-4">
                  <div>
                    <Label>Agency Name</Label>
                    <p className="font-medium">{companySetup.agencyName}</p>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <p className="font-medium">{companySetup.agencyAddress}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="font-medium">{companySetup.agencyPhoneNumber}</p>
                  </div>
                  {companySetup.agencyLogo && (
                    <div>
                      <Label>Logo</Label>
                      <img
                        src={companySetup.agencyLogo}
                        alt="Company Logo"
                        className="mt-2 w-32 h-32 object-contain border rounded"
                      />
                    </div>
                  )}
                  <div>
                    <Label>Areas Operated</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.isArray(companySetup.areasOperated) &&
                        companySetup.areasOperated.map((area, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                          >
                            {area}
                          </span>
                        ))}
                    </div>
                  </div>
                  <Button onClick={handleOpenCompanyModal} className="w-full">
                    Update Company Details
                  </Button>
                </div>
              ) : (
                <Button onClick={handleOpenCompanyModal} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agency Information
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Customer Sync Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                Customer Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sync customer data to local storage for faster search. Customers are automatically synced every 6 hours.
                </p>
                <Button
                  onClick={handleSyncCustomers}
                  disabled={syncingCustomers}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncingCustomers ? 'animate-spin' : ''}`} />
                  {syncingCustomers ? 'Syncing...' : 'Sync Customers'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bottle Categories Section - Only show if CompanySetup exists */}
          {companySetup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplet className="h-5 w-5 text-purple-600" />
                  Bottle Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.length === 0 && Object.keys(editedCategories).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No categories added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map((category) => {
                      const edited = editedCategories[category.id] || {
                        categoryName: category.categoryName,
                        price: category.price,
                      };
                      return (
                        <div key={category.id} className="flex gap-2 items-center">
                          <Input
                            placeholder="Category Name"
                            value={edited.categoryName}
                            onChange={(e) =>
                              handleCategoryChange(category.id, "categoryName", e.target.value)
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={edited.price}
                            onChange={(e) =>
                              handleCategoryChange(category.id, "price", parseFloat(e.target.value) || 0)
                            }
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleAddCategory}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                  {(categories.length > 0 || Object.keys(editedCategories).length > 0) && (
                    <Button
                      onClick={handleSaveCategories}
                      disabled={categoriesLoading}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save All
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
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
              <p className="text-muted-foreground">Manage your account and company settings</p>
            </div>
          </div>

          {/* Admin Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Admin Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  {editName ? (
                    <div className="flex gap-2">
                      <Input
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                      />
                      <Button size="sm" onClick={handleSaveName} disabled={profileLoading}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setNameValue(adminProfile?.name || "");
                          setEditName(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{adminProfile?.name || "N/A"}</p>
                      <Button size="sm" variant="outline" onClick={() => setEditName(true)}>
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  {editPhone ? (
                    <div className="flex gap-2">
                      <Input
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(e.target.value)}
                      />
                      <Button size="sm" onClick={handleSavePhone} disabled={profileLoading}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPhoneValue(adminProfile?.phone || "");
                          setEditPhone(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{adminProfile?.phone || "Not provided"}</p>
                      <Button size="sm" variant="outline" onClick={() => setEditPhone(true)}>
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <p className="font-medium text-muted-foreground">{adminProfile?.email || "N/A"}</p>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Company Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companySetup ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Agency Name</Label>
                    <p className="font-medium">{companySetup.agencyName}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="font-medium">{companySetup.agencyPhoneNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <p className="font-medium">{companySetup.agencyAddress}</p>
                  </div>
                  {companySetup.agencyLogo && (
                    <div className="col-span-2">
                      <Label>Logo</Label>
                      <img
                        src={companySetup.agencyLogo}
                        alt="Company Logo"
                        className="mt-2 w-32 h-32 object-contain border rounded"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label>Areas Operated</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Array.isArray(companySetup.areasOperated) &&
                        companySetup.areasOperated.map((area, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                          >
                            {area}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleOpenCompanyModal}>Update Company Details</Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleOpenCompanyModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agency Information
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Customer Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Customer Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sync customer data to local storage for faster search. Customers are automatically synced every 6 hours.
                </p>
                <Button
                  onClick={handleSyncCustomers}
                  disabled={syncingCustomers}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncingCustomers ? 'animate-spin' : ''}`} />
                  {syncingCustomers ? 'Syncing...' : 'Sync Customers'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bottle Categories */}
          {companySetup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplet className="h-5 w-5" />
                  Bottle Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categories.length === 0 && Object.keys(editedCategories).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No categories added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categories.map((category) => {
                      const edited = editedCategories[category.id] || {
                        categoryName: category.categoryName,
                        price: category.price,
                      };
                      return (
                        <div key={category.id} className="flex gap-2 items-center">
                          <Input
                            placeholder="Category Name"
                            value={edited.categoryName}
                            onChange={(e) =>
                              handleCategoryChange(category.id, "categoryName", e.target.value)
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Price"
                            value={edited.price}
                            onChange={(e) =>
                              handleCategoryChange(category.id, "price", parseFloat(e.target.value) || 0)
                            }
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleAddCategory} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Row
                  </Button>
                  {(categories.length > 0 || Object.keys(editedCategories).length > 0) && (
                    <Button
                      onClick={handleSaveCategories}
                      disabled={categoriesLoading}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save All Changes
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Password Update Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new password
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordUpdate} disabled={passwordUpdating}>
              {passwordUpdating ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Setup Modal */}
      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {companySetup ? "Update Agency Information" : "Add Agency Information"}
            </DialogTitle>
            <DialogDescription>
              {companySetup
                ? "Update your company details below"
                : "Fill in your agency information to get started"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agency Name *</Label>
              <Input
                value={companyForm.agencyName}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, agencyName: e.target.value })
                }
                placeholder="Enter agency name"
              />
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Textarea
                value={companyForm.agencyAddress}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, agencyAddress: e.target.value })
                }
                placeholder="Enter business address"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={companyForm.agencyPhoneNumber}
                onChange={(e) =>
                  setCompanyForm({ ...companyForm, agencyPhoneNumber: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="cursor-pointer"
              />
              {logoPreview && (
                <div className="mt-2">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 object-contain border rounded"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Areas Operated *</Label>
              <div className="flex gap-2">
                <Input
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddArea();
                    }
                  }}
                  placeholder="Enter area name"
                />
                <Button type="button" onClick={handleAddArea}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="space-y-2 mt-2">
                {areasOperated.map((area, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <span className="text-sm">{area}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveArea(area)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany} disabled={companyLoading}>
              {companyLoading ? "Saving..." : companySetup ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
