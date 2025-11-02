import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplet, Eye, EyeOff, Mail, Lock, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin, isRider, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [isValidPassword, setIsValidPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isRider) {
        navigate('/rider');
      }
    }
  }, [isAuthenticated, isAdmin, isRider, navigate]);

  // Validate email
  useEffect(() => {
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(email);
      setIsValidEmail(isValid);
      setEmailError(isValid ? "" : "Invalid email format");
    } else {
      setIsValidEmail(false);
      setEmailError("");
    }
  }, [email]);

  // Validate password
  useEffect(() => {
    if (password) {
      const isValid = password.length >= 6;
      setIsValidPassword(isValid);
      setPasswordError(isValid ? "" : "Password must be at least 6 characters");
    } else {
      setIsValidPassword(false);
      setPasswordError("");
    }
  }, [password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setEmailError("");
    setPasswordError("");

    // Validation
    if (!email || !password) {
      toast.error("Please fill in all fields", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
      if (!email) setEmailError("Email is required");
      if (!password) setPasswordError("Password is required");
      return;
    }

    if (!isValidEmail) {
      toast.error("Please enter a valid email", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
      setEmailError("Invalid email format");
      return;
    }

    if (!isValidPassword) {
      toast.error("Password must be at least 6 characters", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        toast.success("Login successful!", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
        // Navigation will be handled by useEffect
      } else {
        if (result.message?.includes('401') || result.message?.includes('Invalid') || result.message?.includes('Wrong')) {
          toast.error("Wrong email or password", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
          setEmailError("Invalid credentials");
          setPasswordError("Invalid credentials");
        } else {
          toast.error(result.message || "Login failed", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error("Wrong email or password", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
        setEmailError("Invalid credentials");
        setPasswordError("Invalid credentials");
      } else {
        toast.error("Login failed. Please check your credentials.", { position: window.innerWidth < 768 ? 'top-center' : 'bottom-right' });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900 md:bg-white">
      {/* Mobile: Full Screen */}
      <div className="flex flex-col md:hidden w-full">
        {/* Top Section - Gradient Background */}
        <div className=" px-6 pt-16 pb-8 relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10">
              <Droplet className="h-20 w-20" fill="white" />
            </div>
            <div className="absolute bottom-20 right-10">
              <Droplet className="h-16 w-16" fill="white" />
            </div>
            <div className="absolute top-1/2 left-1/4">
              <Droplet className="h-12 w-12" fill="white" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-white">
            <h1 className="text-5xl font-bold mb-2">Welcome</h1>
            <p className="text-2xl font-medium">Sign in to your account</p>
          </div>
        </div>

        {/* Bottom Section - Form */}
        <div className="flex-1 bg-white rounded-t-3xl  px-6 pb-8 pt-12 rounded-t-3xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center">
              <div className=" bg-cyan-600  rounded-full p-5 shadow-2xl border-2 border-white/30 w-fit mx-auto">
                <Droplet className="h-12 w-12 text-white" fill="white" />
              </div>
              <h2 className="text-2xl font-bold text-cyan-600">Smart Supply</h2>
              </div>

              
              {/* Email Field */}
              <div className="space-y-1">
                <Label htmlFor="email" className="text-cyan-600 text-sm font-semibold">
                  Gmail
                </Label>
                 <div className="relative transition-all duration-200 focus-within:scale-[1.02]">
                   <Input
                     id="email"
                     type="email"
                     placeholder="Joydeo@gmail.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     disabled={isLoggingIn}
                     className={`border-0 border-b-2 rounded-none px-2 bg-transparent outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none  ${emailError
                       ? 'border-red-500'
                       : isValidEmail && email
                       ? 'border-white'
                       : 'border-gray-300'
                     } ${!emailError && !isValidEmail && email === '' ? 'focus:border-cyan-600' : ''}`}
                   />
                   {isValidEmail && email && !emailError && (
                     <Check className="absolute right-0 top-1/2 -translate-y-1/2 text-green-900 h-5 w-5" />
                   )}
                 </div>

                {emailError && <p className="text-sm text-red-600">{emailError}</p>}
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-cyan-600 text-sm font-semibold">
                  Password
                </Label>
                <div className="relative transition-all duration-200 focus-within:scale-[1.02]">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoggingIn}
                    className={`border-0 border-b-2 rounded-none px-2 bg-transparent outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ${passwordError ? 'border-red-500' : 'border-gray-300'} ${!passwordError ? 'focus:border-cyan-600' : ''}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-1/2 -translate-y-1/2 h-full px-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoggingIn}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-500" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-500" />
                    )}
                  </Button>
                </div>
                {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
              </div>
            </div>


            {/* Forgot Password */}
            {/* <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => toast.info("Forgot password functionality coming soon")}
              >
                Forgot password?
              </button>
            </div> */}

            {/* Sign In Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from- hover:to-purple-700 text-white font-bold py-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={isLoggingIn || loading || !isValidEmail || !isValidPassword || !email || !password}
            >
              {isLoggingIn ? "Signing in..." : "SIGN IN"}
            </Button>
          </form>
        </div>
      </div>

      {/* Desktop: Centered Form on Image Background */}
      <div className="hidden md:flex w-full min-h-screen">
        {/* Full Background - Image with Gradient */}
        <div className="absolute  bg-gradient-to-br from-cyan-900 via-cyan-700 to-cyan-500">


          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-900/85 via-cyan-700/70 to-cyan-500/50"></div>

          {/* Decorative Elements */}
          <div className="absolute inset-0 opacity-20">
            <Droplet className="absolute top-20 left-20 h-32 w-32 text-white" fill="white" />
            <Droplet className="absolute bottom-32 right-20 h-24 w-24 text-white" fill="white" />
            <Droplet className="absolute top-1/2 left-1/4 h-16 w-16 text-white" fill="white" />
          </div>
        </div>

        {/* Centered Glassmorphism Form */}
        <div className="relative z-10 w-full flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            {/* Enhanced Glassmorphism Form Card */}
            <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl  shadow-cyan-900 p-10 space-y-8 transform transition-all duration-300">
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-3xl opacity-0 transition-opacity"></div>

              {/* Header */}
              <div className="flex flex-col items-center space-y-4 relative z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative bg-gradient-to-br from-cyan-600 via-cyan-500 to-cyan-400 rounded-full p-5 shadow-2xl border-2 border-white/30">
                    <Droplet className="h-12 w-12 text-white" fill="white" />
                  </div>
                </div>
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-white/80">Welcome Back</h2>
                  <p className="text-base text-white/80 mt-2">Sign in to access your account</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/80 text-sm font-semibold">
                    Gmail
                  </Label>
                    <div className="relative transition-all duration-200 focus-within:scale-[1.02]">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Joydeo@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoggingIn}
                        className={`bg-white/0 border-0 border-b-2 rounded-none px-2 text-white placeholder:text-white outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ${emailError
                          ? 'border-red-500'
                          : isValidEmail && email
                            ? 'border-white '
                            : 'border-gray-300'
                        } ${!emailError && email === '' ? 'focus:border-white' : ''}`}
                      />
                      {isValidEmail && email && !emailError && (
                       <Check
                       className="absolute right-2 top-1/2 -translate-y-1/2 bg-green-900 text-white rounded-full h-5 w-5 p-[3px] shadow-sm"
                     />
                     
                      )}
                    </div>
                  {emailError && <p className="text-sm text-red-600 font-medium">{emailError}</p>}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/80 text-sm font-semibold">
                    Password
                  </Label>
                    <div className="relative transition-all duration-200 focus-within:scale-[1.02]">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoggingIn}
                        className={`bg-white/0 border-0 border-b-2 rounded-none px-2 pr-12 text-white placeholder:text-white outline-none focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:outline-none ${passwordError ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoggingIn}
                      >
                        {showPassword ? (
                          <EyeOff className="h-6 w-6 text-white/80" />
                        ) : (
                          <Eye className="h-6 w-6 text-white/80" />
                        )}
                      </Button>
                    </div>
                  {passwordError && <p className="text-sm text-red-600 font-medium">{passwordError}</p>}
                </div>

                {/* Forgot Password */}


                {/* Sign In Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-400 hover:from-cyan-700 hover:via-cyan-600 hover:to-cyan-500 text-white font-bold py-7 rounded-xl shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] text-lg"
                  disabled={isLoggingIn || loading || !isValidEmail || !isValidPassword || !email || !password}
                >
                  {isLoggingIn ? "Signing in..." : "SIGN IN"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
