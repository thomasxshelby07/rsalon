import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  UserPlus, 
  History, 
  Scissors, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon, 
  LogOut, 
  Menu, 
  X, 
  ScissorsLineDashed, 
  UserCircle2, 
  Search,
  Bell,
  Coins,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CustomerEntry from './pages/CustomerEntry';
import CustomerHistory from './pages/CustomerHistory';
import Services from './pages/Services';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';
import apiCall from './api';
import logoImg from './assets/logo.png';
import Salaries from './pages/Salaries';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    localStorage.clear(); // Clear any stale or corrupt session data
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Main Layout Wrapper
const DashboardLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState({ salonName: 'R Unisex Salon', logo: '' });
  const [searchQuery, setSearchQuery] = useState('');


  // Fetch settings for Title/Logo
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiCall('/settings');
        setSettings(res);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, [location.pathname]); // reload if we edit settings

  const handleLogout = () => {
    localStorage.clear();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'super_admin'] },
    { name: 'Customer Entry', path: '/customer-entry', icon: UserPlus, roles: ['admin', 'super_admin'] },
    { name: 'Customer History', path: '/customer-history', icon: History, roles: ['admin', 'super_admin'] },
    { name: 'Services', path: '/services', icon: Scissors, roles: ['admin', 'super_admin'] },
    { name: 'Staff', path: '/staff', icon: Users, roles: ['admin', 'super_admin'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['super_admin'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['super_admin'] },
    { name: 'Salaries', path: '/salaries', icon: Coins, roles: ['super_admin'] },
  ];

  const handleSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    navigate(`/customer-history?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="h-screen overflow-hidden bg-bg flex text-primary">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-100 shadow-soft shrink-0 h-full">
        {/* Salon Logo Header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-50">
          <div className="w-16 h-16 rounded-2xl bg-white logo-container border border-slate-100 flex items-center justify-center shadow-soft overflow-hidden p-0 shrink-0">
            <img src={settings.logo || logoImg} alt="Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <div>
            <h1 className="font-extrabold text-md tracking-tight leading-none text-primary-dark">
              {settings.salonName}
            </h1>
            <span className="text-xs text-slate-400 font-medium capitalize">
              {role === 'super_admin' ? 'Super Admin Panel' : 'Staff Dashboard'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 space-y-1.5 px-3 overflow-y-auto">
          {navItems.map((item) => {
            if (item.roles && !item.roles.includes(role)) return null;
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'active-nav-link shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-dark dark:hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-accent-dark' : 'text-slate-400 dark:text-slate-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Admin Profile / Logout */}
        <div className="p-4 border-t border-slate-50 flex flex-col gap-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <UserCircle2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            <div className="truncate">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight capitalize">{username}</p>
              <span className="text-[11px] font-bold text-accent-dark px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                {role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl text-xs font-bold transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm"
            />
            {/* Slide-out Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col lg:hidden"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-white logo-container border border-slate-100 flex items-center justify-center shadow-soft overflow-hidden p-0 shrink-0">
                    <img src={settings.logo || logoImg} alt="Logo" className="w-full h-full object-cover scale-110" />
                  </div>
                  <div>
                    <h1 className="font-extrabold text-sm text-primary-dark leading-none">{settings.salonName}</h1>
                    <span className="text-xs text-slate-400 capitalize">{role === 'super_admin' ? 'Super Admin' : 'Staff'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-6 h-6 text-slate-500" />
                </button>
              </div>

              <nav className="flex-1 py-6 space-y-1.5 px-4 overflow-y-auto">
                {navItems.map((item) => {
                  if (item.roles && !item.roles.includes(role)) return null;
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                        isActive 
                          ? 'active-nav-link shadow-sm' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary-dark dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-accent-dark' : 'text-slate-400 dark:text-slate-500'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-slate-100 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <UserCircle2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight capitalize">{username}</p>
                    <span className="text-xs text-slate-400 capitalize">{role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-bold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 glass-nav flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          {/* Left: Hamburger (mobile) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2.5 rounded-2xl bg-accent/10 hover:bg-accent/20 text-accent-dark transition-all duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Search Bar — desktop only */}
            <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-72 xl:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-4" />
              <input
                type="text"
                placeholder="Search history by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-2xl text-xs font-medium focus:outline-none focus:bg-white focus:border-slate-200 transition-all duration-200"
              />
            </form>
          </div>

          {/* Center: Salon Name (mobile only) */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-pink-100 shadow-sm">
              <img src={settings.logo || logoImg} alt="Logo" className="w-full h-full object-cover scale-110" />
            </div>
            <p className="text-sm font-extrabold text-primary-dark leading-none">{settings.salonName}</p>
          </div>

          {/* Right: Profile */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Bell — desktop only */}
            <button className="hidden lg:flex p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 relative transition-all duration-200">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
            </button>

            {/* Profile Avatar */}
            <div className="flex items-center gap-3 lg:pl-3 lg:border-l lg:border-slate-200/60">
              <div className="hidden text-right lg:block">
                <p className="text-xs font-bold text-slate-800 leading-none capitalize">{username}</p>
                <span className="text-[10px] font-bold text-accent-dark tracking-wide uppercase">
                  {role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center font-extrabold text-white text-sm shadow-sm">
                {username ? username.substring(0, 2).toUpperCase() : 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Inner Container */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto w-full mx-auto max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  console.log('App: rendering root router, Token exists:', !!localStorage.getItem('token'));
  return (
    <Router>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/customer-entry" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <DashboardLayout>
              <CustomerEntry />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/customer-history" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <DashboardLayout>
              <CustomerHistory />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/services" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <DashboardLayout>
              <Services />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
            <DashboardLayout>
              <Staff />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <DashboardLayout>
              <Reports />
            </DashboardLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/salaries" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <DashboardLayout>
              <Salaries />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
