import React, { useEffect, useState } from 'react';
import { Droplet } from 'lucide-react';

export const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          return 100;
        }
        return prev + 2;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        onFinish();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-cyan-900 via-cyan-500 to-cyan-900  to-white animate-in fade-in duration-500">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 opacity-10 animate-pulse">
          <Droplet className="h-32 w-32 text-cyan-400" fill="currentColor" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-10 animate-pulse delay-300">
          <Droplet className="h-24 w-24 text-cyan-300" fill="currentColor" />
        </div>
        <div className="absolute top-1/2 left-1/4 opacity-5 animate-pulse delay-700">
          <Droplet className="h-16 w-16 text-cyan-500" fill="currentColor" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center space-y-8 relative z-10">
        {/* Main Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-cyan-400 rounded-full blur-xl opacity-40 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-cyan-600 via-cyan-500 to-cyan-400 rounded-full p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <Droplet className="h-20 w-20 text-white" fill="white" />
          </div>
        </div>

        {/* App Name */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-cyan-700 drop-shadow-lg">
            Smart Supply
          </h1>
          <p className="text-sm text-gray-600 font-medium">
            Water Delivery Management System
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center space-y-3 w-64">
          {/* Circular Progress */}
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              {/* Background Circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-cyan-200"
              />
              {/* Progress Circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${loadingProgress * 1.76} 176`}
                strokeLinecap="round"
                className="text-cyan-600 transition-all duration-300"
              />
            </svg>
            {/* Center Droplet */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Droplet className="h-6 w-6 text-cyan-600 animate-bounce" fill="currentColor" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-cyan-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          
          {/* Loading Text */}
          <p className="text-xs text-gray-600 font-medium">
            {loadingProgress < 100 ? 'Loading...' : 'Ready!'}
          </p>
        </div>
      </div>
    </div>
  );
};

