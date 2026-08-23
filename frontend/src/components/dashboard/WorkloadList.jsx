import React from 'react';
import { Avatar } from '../common/Avatar';

export const WorkloadList = ({ workloads = [] }) => {
  if (workloads.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No team workload data available yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workloads.map((member) => {
        const percent =
          member.total_tasks > 0
            ? Math.round((member.completed_tasks / member.total_tasks) * 100)
            : 0;

        return (
          <div
            key={member.user_id}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Avatar user={{ full_name: member.full_name, avatar_url: member.avatar_url }} size="sm" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {member.full_name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {member.completed_tasks} / {member.total_tasks} completed
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                {percent}%
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
