import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { Sidebar } from '../common/Sidebar';
import { Modal } from '../common/Modal';
import { Clock, AlertTriangle, X, ExternalLink, ArrowRight, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsApi } from '../../api/notificationsApi';

export const DashboardLayout = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [urgentAlert, setUrgentAlert] = useState(null);
  const [allAlerts, setAllAlerts] = useState([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const checkUrgent = async () => {
      if (!user) return;
      try {
        const alerts = await notificationsApi.getDeadlineNotifications(user);
        if (isMounted) {
          setAllAlerts(alerts || []);
          if (alerts && alerts.length > 0) {
            setUrgentAlert(alerts[0]);
          } else {
            setUrgentAlert(null);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkUrgent();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleAlertCloseClick = (e) => {
    e.stopPropagation();
    // Requirement 6: Clicking 'X' navigates to the Notifications/Alerts view/modal
    setShowNotificationModal(true);
  };

  return (
    <div className="min-h-screen bg-jet-950 flex flex-col">
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex lg:pl-64">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl mx-auto w-full min-w-0">
          {/* Urgent Deadline Notification Banner */}
          {urgentAlert && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-neonrose-950/80 to-jet-900 border border-neonrose-500/50 shadow-glow-rose/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse-glow">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-neonrose-600/30 text-neonrose-400 border border-neonrose-500/40 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-neonrose-neon" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neonrose-400">
                      High Priority Deadline Alert
                    </span>
                    <span className="text-[10px] bg-neonrose-900/60 text-neonrose-200 px-2 py-0.5 rounded-full border border-neonrose-500/40 font-mono">
                      {urgentAlert.remainingTime}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white mt-0.5">
                    {urgentAlert.message}
                  </p>
                </div>
              </div>

              {/* Requirement 6: Clickable alert close ('X') navigates to Notifications view/modal */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleAlertCloseClick}
                  className="px-2.5 py-1.5 rounded-xl bg-neonrose-950 hover:bg-neonrose-900 text-neonrose-300 hover:text-white border border-neonrose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Open Deadline Notification Center"
                  aria-label="View all urgent deadline alerts"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Alerts ({allAlerts.length})</span>
                  <X className="w-3.5 h-3.5 ml-0.5 text-neonrose-400" />
                </button>
              </div>
            </div>
          )}

          {/* Page Title & Subtitle Header */}
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>
              )}
            </div>
          )}

          {/* Child Page Content */}
          {children}
        </main>
      </div>

      {/* Deadline Notifications Modal (Triggered by 'X' on Banner) */}
      <Modal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        title={`Urgent Deadline Notifications (${allAlerts.length})`}
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Active conferences requiring urgent action with deadlines closing within 24 hours.
          </p>

          <div className="divide-y divide-jet-800 max-h-80 overflow-y-auto">
            {allAlerts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                No active conferences closing within the next 24 hours.
              </p>
            ) : (
              allAlerts.map((alert) => (
                <div key={alert.id} className="py-3.5 first:pt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{alert.conferenceName}</span>
                    <span className="text-[10px] font-bold text-neonrose-400 bg-neonrose-950/80 px-2 py-0.5 rounded-full border border-neonrose-500/40 font-mono">
                      {alert.remainingTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{alert.message}</p>
                  
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {user?.role === 'student' && (
                      <button
                        onClick={() => {
                          setShowNotificationModal(false);
                          navigate('/student/conferences');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs font-semibold shadow-glow-cerulean/20 flex items-center gap-1.5"
                      >
                        <span>Apply & Upload Proof</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(user?.role === 'coordinator' || user?.role === 'mentor') && (
                      <button
                        onClick={() => {
                          setShowNotificationModal(false);
                          navigate('/coordinator/conference-tracking');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-cerulean-600 hover:bg-cerulean-500 text-white text-xs font-semibold shadow-glow-cerulean/20 flex items-center gap-1.5"
                      >
                        <span>Track Cohort ({alert.unappliedCount} Pending)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-jet-750 text-xs">
            <button
              type="button"
              onClick={() => {
                setUrgentAlert(null);
                setShowNotificationModal(false);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              Dismiss banner for now
            </button>
            <button
              type="button"
              onClick={() => setShowNotificationModal(false)}
              className="px-4 py-2 rounded-xl bg-jet-800 hover:bg-jet-750 text-white font-semibold border border-jet-600"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
