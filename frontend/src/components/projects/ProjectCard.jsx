import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle2, Users, ArrowRight, MoreVertical } from 'lucide-react';
import { StatusBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

export const ProjectCard = ({ project, onEdit, onDelete, canManage }) => {
  const navigate = useNavigate();

  const totalTasks = project.tasks_count || 0;
  const completedTasks = project.completed_tasks_count || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col justify-between"
    >
      <div>
        {/* Top: Status & Owner */}
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={project.status} />
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span>Owner:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {project.owner?.full_name}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1 mb-1.5">
          {project.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {project.description || 'No description provided.'}
        </p>

        {/* Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">Progress</span>
            <span className="text-brand-600 dark:text-brand-400">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Details */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {completedTasks}/{totalTasks} tasks
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>{project.members_count || 1}</span>
          </span>
        </div>

        <div className="flex items-center space-x-1 font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
          <span>Open</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
};
