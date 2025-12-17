import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <div className="animate-spin">
            <img src="/wesabi_icon_.png" alt="Loading" className="h-16 w-16" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Wesabi Pharmacy</h1>
        <p className="text-gray-600 mb-8">Loading your pharmacy management system...</p>
        <div className="flex justify-center">
          <div className="animate-pulse flex space-x-1">
            <div className="w-3 h-3 bg-green-600 rounded-full"></div>
            <div className="w-3 h-3 bg-green-600 rounded-full" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-green-600 rounded-full" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          If this takes too long, please check your database connection
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;