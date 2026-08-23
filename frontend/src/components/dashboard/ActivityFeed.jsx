import React from 'react';
import { Activity, Clock, CheckCircle2, FilePlus, MessageSquare } from 'lucide-react';

export const ActivityFeed = ({ activities = [] }) => {
  const getIcon = (action) => {
    if (action.includes('CREATED')) return <FilePlus className="w-3.5 h-3.5 text-blue-500" />;
    if (action.includes('COMPLETED')) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    if (action.includes('COMMENT')) return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
    return <Activity className="w-3.5 h-3.5 text-brand-500" />;
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
  };

  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No recent activity logged yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {activities.map((a) => (
        <div key={a.id} className="relative flex items-start space-x-3 text-xs">
          {/* Node Icon */}
          <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
            {getIcon(a.action)}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 dark:text-slate-100 font-semibold leading-tight">
              {a.user_name}
            </p>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">
              {a.details || a.action}
            </p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
              {formatTime(a.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
