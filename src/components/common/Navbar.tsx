import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';
import {
  Package,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickTrackNumber, setQuickTrackNumber] = useState('');

  const handleQuickTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickTrackNumber.trim()) {
      navigate(`/track/${quickTrackNumber.trim()}`);
      setQuickTrackNumber('');
    }
  };

  const getNavLinks = () => {
    if (!user) {
      return [
        { label: 'Track', path: '/track' },
        { label: 'Login', path: '/login' },
      ];
    }

    if (user.role === 'ADMIN') {
      return [
        { label: 'Overview', path: '/admin' },
        { label: 'Orders', path: '/admin/orders' },
        { label: 'Fleet', path: '/admin/fleet' },
        { label: 'Zones', path: '/admin/zones' },
        { label: 'Pricing', path: '/admin/pricing' },
      ];
    }

    if (user.role === 'AGENT') {
      return [
        { label: 'Console', path: '/agent' },
        { label: 'Deliveries', path: '/agent/deliveries' },
        { label: 'Track', path: '/track' },
      ];
    }

    return [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Book', path: '/book' },
      { label: 'Orders', path: '/orders' },
      { label: 'Track', path: '/track' },
    ];
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-[15px] tracking-tight">
                MileZero
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive =
                  location.pathname === link.path ||
                  (link.path !== '/' && location.pathname.startsWith(link.path + '/'));
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleQuickTrack} className="hidden md:flex items-center relative">
              <input
                type="text"
                value={quickTrackNumber}
                onChange={(e) => setQuickTrackNumber(e.target.value)}
                placeholder="Track shipment..."
                className="bg-gray-50 border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-44 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            </form>

            {isAuthenticated && <NotificationCenter />}

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-200">
                <div className="hidden sm:block text-right">
                  <div className="text-[13px] font-medium text-gray-700 leading-tight">{user.name.split(' ')[0]}</div>
                  <div className="text-[11px] text-gray-400 capitalize">{user.role.toLowerCase()}</div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 text-[13px] font-medium rounded-md bg-brand-600 hover:bg-brand-700 text-white transition-colors"
              >
                Sign In
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 px-4 pt-2 pb-3 space-y-0.5 bg-white">
          <form onSubmit={handleQuickTrack} className="mb-2 relative">
            <input
              type="text"
              value={quickTrackNumber}
              onChange={(e) => setQuickTrackNumber(e.target.value)}
              placeholder="Track shipment..."
              className="w-full bg-gray-50 border border-gray-200 rounded-md pl-8 pr-3 py-2 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </form>

          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-[13px] font-medium ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
};
