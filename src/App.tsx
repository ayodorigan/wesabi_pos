import React, { useState } from 'react';
import { AppProvider } from './contexts/AppContext';
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
import SalesReports from './components/SalesReports';
import Profile from './components/Profile';
import { useApp } from './contexts/AppContext';

const AppContent: React.FC = () => {
  const { loading } = useApp();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return <LoadingScreen />;
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;