import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Package } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    defaultServiceType: 'B2C',
  });
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await register({
        ...formData,
        role: 'CUSTOMER',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all";
  const labelCls = "block text-[13px] font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Create a MileZero Account</h1>
          <p className="text-[13px] text-gray-500 mt-1">Book and track last-mile logistics</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-[13px]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Rahul Sharma"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rahul@example.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 6 characters"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Account Type</label>
                <select
                  value={formData.defaultServiceType}
                  onChange={(e) => setFormData({ ...formData, defaultServiceType: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="B2C">Individual (B2C)</option>
                  <option value="B2B">Business (B2B)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Optional"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[14px] transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 hover:text-brand-700 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
