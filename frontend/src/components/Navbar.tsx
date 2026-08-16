import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Zap, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-indigo-500/20 bg-slate-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading font-extrabold text-xl bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            DocMind AI
          </h1>
          <p className="text-xs text-slate-400 font-medium">Multi-Modal Intelligence Platform</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <UserIcon className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-slate-200">{user.full_name || user.email}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      )}
    </header>
  );
};
