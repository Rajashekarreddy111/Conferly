import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, User, LogOut, ChevronDown, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/notificationsApi';
import { Badge } from './Badge';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAlerts = async () => {
      if (!user) return;
      try {
        const data = await notificationsApi.getDeadlineNotifications(user);
        if (isMounted) setAlerts(data || []);
      } catch (err) {
        console.error('Error fetching deadline alerts:', err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Poll alerts every 60s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-jet-950/90 backdrop-blur-md border-b border-jet-700/60 px-4 sm:px-6 flex items-center">
      <div className="flex items-center justify-between w-full">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-jet-800 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cerulean-600 to-neonrose-neon flex items-center justify-center shadow-glow-cerulean/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                Confer<span className="text-cerulean-400">ly</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-jet-800 px-2 py-0.5 rounded-md border border-jet-600">
                Portal
              </span>
            </div>
          </div>
        </div>

        {/* Right: Notifications, Role Pill & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Deadline Alert Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-jet-800 border border-transparent hover:border-jet-600 transition-all"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-neonrose-500 rounded-full animate-ping" />
              )}
              {alerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-neonrose-500 rounded-full" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-jet-900 border border-jet-600 shadow-card-dark p-4 z-50 animate-scale-up">
                <div className="flex items-center justify-between pb-3 border-b border-jet-750">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neonrose-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Deadline Alerts ({alerts.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">&le; 24h Remaining</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-jet-800 mt-2">
                  {alerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      No urgent deadline alerts at this time.
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div key={alert.id} className="py-3 first:pt-1 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-100">{alert.conferenceName}</span>
                          <span className="text-[10px] font-semibold text-neonrose-400 px-2 py-0.5 rounded-full bg-neonrose-950/60 border border-neonrose-500/40">
                            {alert.remainingTime}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-snug">{alert.message}</p>
                        {user.role === 'student' && (
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              navigate('/student/conferences');
                            }}
                            className="mt-1 text-[11px] font-semibold text-cerulean-400 hover:text-cerulean-300 transition-colors inline-block"
                          >
                            Apply Conference &rarr;
                          </button>
                        )}
                        {(user.role === 'coordinator' || user.role === 'mentor') && (
                          <button
                            onClick={() => {
                              setShowNotifications(false);
                              navigate('/coordinator/conference-tracking');
                            }}
                            className="mt-1 text-[11px] font-semibold text-cerulean-400 hover:text-cerulean-300 transition-colors inline-block"
                          >
                            View Pending Students ({alert.unappliedCount}) &rarr;
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Role Badge */}
          {user && (
            <div className="hidden sm:block">
              <Badge variant={user.role} className="capitalize">
                {user.role === 'coordinator' || user.role === 'mentor' ? 'Coordinator' : user.role}
              </Badge>
            </div>
          )}

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-jet-850 hover:bg-jet-800 border border-jet-700/60 transition-all text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-cerulean-950/80 border border-cerulean-500/40 flex items-center justify-center text-cerulean-300 text-xs font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block leading-none">
                <p className="text-xs font-bold text-white truncate max-w-[120px]">
                  {user?.name || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                  {user?.email || user?.rollNumber}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-jet-900 border border-jet-600 shadow-card-dark p-2 z-50 animate-scale-up">
                <div className="px-3 py-2 border-b border-jet-800">
                  <p className="text-xs font-bold text-white">{user?.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] uppercase font-semibold text-cerulean-400 bg-cerulean-950/60 px-2 py-0.5 rounded border border-cerulean-500/30">
                    {user?.role}
                  </span>
                </div>
                <div className="pt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (user?.role === 'admin') navigate('/admin/settings');
                      else if (user?.role === 'coordinator') navigate('/coordinator/profile');
                      else navigate('/student/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-jet-800 transition-colors text-left"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neonrose-400 hover:text-neonrose-300 hover:bg-neonrose-950/30 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
