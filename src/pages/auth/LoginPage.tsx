import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { Package, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, switchPersona, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'AGENT') navigate('/agent');
      else navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-brand-600 flex items-center justify-center mx-auto mb-4">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Sign in to MileZero</h1>
          <p className="text-[13px] text-gray-500 mt-1">Last-mile delivery management</p>
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
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[14px] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-[13px] text-gray-500">
            No account?{' '}
            <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium">
              Register
            </Link>
          </p>
        </div>

        {/* Demo accounts */}
        <div className="mt-6">
          <div className="text-[12px] text-gray-400 text-center mb-3 uppercase tracking-wider font-medium">
            Quick demo access
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => switchPersona(acc)}
                disabled={isLoading}
                className="text-left px-3 py-2 rounded-md bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="text-[13px] font-medium text-gray-700 group-hover:text-gray-900 truncate">
                  {acc.label.split('(')[0].trim()}
                </div>
                <div className="text-[11px] text-gray-400 capitalize">{acc.role.toLowerCase()}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
