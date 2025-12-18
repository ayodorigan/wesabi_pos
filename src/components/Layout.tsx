import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  TrendingUp,
  FileText,
  User,
  ChevronDown,
  Settings,
  LogOut,
  Menu,
  X,
  FileInput,
  FileMinus,
  ClipboardList,
  Pill,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../contexts/AlertContext';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, signOut, canAccessPage } = useAuth();
  const { showAlert } = useAlert();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  if (!user) return null;

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
    { id: 'invoices', label: 'Invoices', icon: FileInput },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ClipboardList },
    { id: 'creditnotes', label: 'Credit Notes', icon: FileMinus },
    { id: 'stocktake', label: 'Stock Take', icon: Package },
    { id: 'drugsaleshistory', label: 'Sales Report', icon: FileText },
    { id: 'drughistory', label: 'Drug History', icon: Pill },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'logs', label: 'Activity Logs', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const pageTitles: Record<string, { title: string; subtitle?: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Wesabi Pharmacy - Management Overview' },
    pos: { title: 'Point of Sale' },
    invoices: { title: 'Invoice Management', subtitle: 'Add inventory by invoice' },
    inventory: { title: 'Inventory Management' },
    orders: { title: 'Supplier Orders', subtitle: 'Manage purchase orders and stock requests' },
    creditnotes: { title: 'Credit Notes', subtitle: 'View and manage customer returns' },
    stocktake: { title: 'Stock Take', subtitle: 'Physical inventory verification' },
    drugsaleshistory: { title: 'Sales Report', subtitle: 'Track sales performance' },
    drughistory: { title: 'Drug History', subtitle: 'Historical product data' },
    analytics: { title: 'Analytics', subtitle: 'Business insights and reports' },
    logs: { title: 'Activity Logs', subtitle: 'System activity tracking' },
    settings: { title: 'Settings', subtitle: 'User management' },
    profile: { title: 'My Profile', subtitle: 'Account settings' },
  };

  const currentPageInfo = pageTitles[activeTab] || { title: 'Dashboard' };

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => canAccessPage(item.id));

  const handleSignOut = () => {
    setShowProfileDropdown(false);
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      type: 'confirm',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        try {
          await signOut();
        } catch (error) {
          console.error('Sign out error:', error);
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <img src="/wesabi_logo_landscape.png" alt="Wesabi Pharmacy" className="h-12" />
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div className="flex pt-[73px] lg:pt-0">
        {/* Sidebar */}
        <div className={`
          fixed left-0 z-50 bg-white shadow-lg transform transition-all duration-300 ease-in-out flex-shrink-0
          top-[73px] bottom-0 lg:top-0
          lg:translate-x-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
          w-64
        `}>
          <div className="flex flex-col h-full lg:h-screen">
            {/* Logo and Collapse Button */}
            <div className={`
              hidden lg:flex items-center min-h-[73px] flex-shrink-0
              ${isSidebarCollapsed ? 'justify-center px-4 py-4' : 'justify-between px-6 py-4'}
            `}>
              {isSidebarCollapsed ? (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Expand sidebar"
                >
                  <img src="/wesabi_icon.png" alt="Wesabi" className="h-8 w-8" />
                </button>
              ) : (
                <>
                  <img src="/wesabi_logo_landscape.png" alt="Wesabi Pharmacy" className="h-12" />
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 pt-6 overflow-y-auto">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          onTabChange(item.id);
                          setIsSidebarOpen(false);
                        }}
                        className={`
                          w-full flex items-center rounded-lg text-left transition-colors
                          ${isSidebarCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-3 py-2'}
                          ${activeTab === item.id
                            ? 'bg-green-100 text-green-700'
                            : 'text-gray-600 hover:bg-gray-100'
                          }
                        `}
                        title={isSidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!isSidebarCollapsed && <span>{item.label}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Account Section */}
            <div className="border-t flex-shrink-0">
              {/* User Profile */}
              <div className="p-4">
                <div className="relative">
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className={`
                      w-full flex items-center rounded-lg hover:bg-gray-100 transition-colors
                      ${isSidebarCollapsed ? 'justify-center p-2' : 'space-x-3 p-2'}
                    `}
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-green-600">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    {!isSidebarCollapsed && (
                      <>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </>
                    )}
                  </button>

                  {showProfileDropdown && (
                    <div className={`
                      absolute bottom-full mb-2 bg-white rounded-lg shadow-lg border z-50
                      ${isSidebarCollapsed ? 'left-full ml-2 w-48' : 'left-0 right-0'}
                    `}>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onTabChange('profile');
                            setShowProfileDropdown(false);
                            setIsSidebarOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <User className="h-4 w-4 mr-2" />
                          My Profile
                        </button>
                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Main Content */}
        <div className={`
          flex-1 min-w-0 flex flex-col h-[calc(100vh-73px)] lg:h-screen transition-all duration-300
          ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
        `}>
          {/* Top Header */}
          <div className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              {/* Page Title */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{currentPageInfo.title}</h1>
                {currentPageInfo.subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{currentPageInfo.subtitle}</p>
                )}
              </div>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Profile Dropdown Overlay */}
      {showProfileDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowProfileDropdown(false)}
        />
      )}
    </div>
  );
};

export default Layout;