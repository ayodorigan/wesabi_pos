import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { AlertProvider } from './contexts/AlertContext';
import Login from './components/Login';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import StockTake from './components/StockTake';
import ActivityLogs from './components/ActivityLogs';
import SalesHistory from './components/SalesHistory';
import Profile from './components/Profile';
import InvoiceManagement from './components/InvoiceManagement';
import CreditNotes from './components/CreditNotes';
import Orders from './components/Orders';
import { useApp } from './contexts/AppContext';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { canAccessPage } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Set default landing page based on user role
  useEffect(() => {
    if (user) {
      let defaultTab = 'dashboard';
      
      switch (user.role) {
        case 'sales':
          defaultTab = 'pos';
          break;
        case 'inventory':
          defaultTab = 'inventory';
          break;
        case 'stock_take':
          defaultTab = 'stocktake';
          break;
        case 'super_admin':
        case 'admin':
        default:
          defaultTab = 'dashboard';
          break;
      }
      
      setActiveTab(defaultTab);
    }
  }, [user]);

  // Prevent app reload on focus
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      e.preventDefault();
    };
    
    const handleVisibilityChange = () => {
      // Do nothing - prevent any reload behavior
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Login />;
  }

  const renderActiveTab = () => {
    // If user doesn't have access to current tab, redirect to appropriate page
    if (user && !canAccessPage(activeTab)) {
      let fallbackTab = 'pos'; // Default fallback
      
      switch (user.role) {
        case 'sales':
          fallbackTab = 'pos';
          break;
        case 'inventory':
          fallbackTab = 'inventory';
          break;
        case 'stock_take':
          fallbackTab = 'stocktake';
          break;
        case 'super_admin':
        case 'admin':
        default:
          fallbackTab = 'dashboard';
          break;
      }
      
      setActiveTab(fallbackTab);
      return null; // Will re-render with correct tab
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POS />;
      case 'invoices':
        return <InvoiceManagement />;
      case 'orders':
        return <Orders />;
      case 'creditnotes':
        return <CreditNotes />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'stocktake':
        return <StockTake />;
      case 'logs':
        return <ActivityLogs />;
      case 'drugsaleshistory':
        return <SalesHistory />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderActiveTab()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AlertProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AlertProvider>
    </AuthProvider>
  );
};

export default App;