import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Users,
  GraduationCap,
  CalendarDays,
  BarChart3,
  Settings,
  Target,
  Search,
  UserCircle,
  FileCheck2,
  Compass,
  LogOut,
  X,
  Sparkles,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 1. Admin navigation items (9 pages)
  const adminNav = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Paper Title Tracking', path: '/admin/paper-tracking', icon: FileText },
    { label: 'Find Related Papers', path: '/admin/find-papers', icon: Sparkles },
    { label: 'Manage Sections', path: '/admin/sections', icon: Layers },
    { label: 'Manage Coordinators', path: '/admin/coordinators', icon: Users },
    { label: 'Manage Students', path: '/admin/students', icon: GraduationCap },
    { label: 'Manage Conferences', path: '/admin/conferences', icon: CalendarDays },
    { label: 'Application Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  // 2. Coordinator navigation items (8 pages)
  const coordNav = [
    { label: 'Dashboard', path: '/coordinator/dashboard', icon: LayoutDashboard },
    { label: 'Paper Title Tracking', path: '/coordinator/paper-tracking', icon: FileText },
    { label: 'Find Related Papers', path: '/coordinator/find-papers', icon: Sparkles },
    { label: 'Manage Students', path: '/coordinator/students', icon: GraduationCap },
    { label: 'Manage Conferences', path: '/coordinator/conferences', icon: CalendarDays },
    { label: 'Conference Tracking', path: '/coordinator/conference-tracking', icon: Target },
    { label: 'Student Tracking', path: '/coordinator/student-tracking', icon: Search },
    { label: 'Profile & Settings', path: '/coordinator/profile', icon: UserCircle },
  ];

  // 3. Student navigation items (5 pages)
  const studentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'Base Paper Title', path: '/student/base-paper', icon: FileText },
    { label: 'All Conferences', path: '/student/conferences', icon: Compass },
    { label: 'My Applications', path: '/student/applications', icon: FileCheck2 },
    { label: 'My Profile', path: '/student/profile', icon: UserCircle },
  ];

  const navItems =
    user?.role === 'admin'
      ? adminNav
      : user?.role === 'coordinator' || user?.role === 'mentor'
      ? coordNav
      : studentNav;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-jet-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel - Stagnant Fixed Left Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-jet-950 border-r border-jet-700/60 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:fixed lg:top-16 lg:bottom-0 lg:left-0 lg:z-30 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Upper content section */}
        <div className="flex flex-col flex-1 min-h-0">
          {/* Mobile Close Bar (Removed duplicate sidebar logo to keep exactly one Conferly logo in Navbar) */}
          <div className="flex lg:hidden items-center justify-between p-4 border-b border-jet-700/60 shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation Menu</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-jet-800 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Info Box */}
          <div className="mx-4 my-3 p-3 rounded-xl bg-jet-900 border border-jet-700/60 shrink-0">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Current Session
            </p>
            <p className="text-xs font-semibold text-white truncate mt-0.5">{user?.name}</p>
            <span className="inline-block mt-1 text-[10px] font-semibold text-cerulean-300 bg-cerulean-950/60 px-2 py-0.5 rounded border border-cerulean-500/30 uppercase tracking-wide">
              {user?.role} Portal
            </span>
          </div>

          {/* Navigation Links with smooth dedicated internal scroll */}
          <nav className="px-3 py-2 space-y-1 overflow-y-auto flex-1">
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={idx}
                  to={item.path}
                  onClick={() => {
                    if (window.innerWidth < 1024) onClose();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-cerulean-600/15 text-cerulean-300 border border-cerulean-500/40 shadow-glow-cerulean/20 font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-jet-850'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-jet-700/60 bg-jet-900/40 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-neonrose-400 hover:text-neonrose-300 hover:bg-neonrose-950/30 border border-neonrose-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
