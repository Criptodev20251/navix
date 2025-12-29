import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide nav on splash or login
  const hideNav = ['/', '/login'].includes(location.pathname);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path);

  const navItems = [
    { icon: Icons.Home, label: 'Home', path: '/dashboard' },
    { icon: Icons.Briefcase, label: 'Serviços', path: '/documents' },
    { icon: Icons.Bell, label: 'Atividade', path: '/notifications' },
    { icon: Icons.User, label: 'Conta', path: '/profile' },
  ];

  if (hideNav) {
    return <div className="min-h-screen bg-white text-slate-900">{children}</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {children}
      </div>
      
      {/* Bottom Navigation - Sticky & Minimal */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-2 pb-6 z-50">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1.5 transition-all p-2 rounded-xl w-16 ${
                isActive(item.path) ? 'text-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon size={26} strokeWidth={isActive(item.path) ? 2.5 : 2} fill={isActive(item.path) ? "currentColor" : "none"} className={isActive(item.path) ? "text-black" : "text-gray-400"} />
              <span className={`text-[10px] font-semibold tracking-wide ${isActive(item.path) ? 'text-black' : 'text-gray-400'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};