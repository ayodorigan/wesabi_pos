import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import POS from './components/POS';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import StockTake from './components/StockTake';
import ActivityLogs from './components/ActivityLogs';
import SalesHistory from './components/SalesHistory';
import Profile from './components/Profile';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' || user?.role === 'super_admin' ? 'dashboard' : 'pos');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'pos':
        return <POS />;
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
      case 'saleshistory':
        return <SalesReports />;
      case 'profile':
        return <Profile />;
      default:
        return user?.role === 'admin' || user?.role === 'super_admin' ? <Dashboard /> : <POS />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderActiveTab()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;