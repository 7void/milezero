import React from 'react';
import { useAuth, DEMO_ACCOUNTS, DemoAccount } from '../../context/AuthContext';

export const RoleSwitcher: React.FC = () => {
  const { user, switchPersona, isLoading } = useAuth();

  return (
    <aside
      aria-label="Demo Role Switcher"
      className="bg-gray-900 px-4 py-1.5 text-[12px]"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <span className="text-gray-400 font-medium">
          Demo accounts:
        </span>

        <div className="flex flex-wrap items-center gap-1">
          {DEMO_ACCOUNTS.map((acc: DemoAccount) => {
            const isActive = user?.email.toLowerCase() === acc.email.toLowerCase();
            return (
              <button
                key={acc.email}
                onClick={() => switchPersona(acc)}
                disabled={isLoading}
                title={acc.description}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {acc.label}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
