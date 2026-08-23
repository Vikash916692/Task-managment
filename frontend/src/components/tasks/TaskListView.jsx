import React from 'react';
import { Calendar, MessageSquare, Tag, CheckCircle2 } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

export const TaskListView = ({
  tasks = [],
  onTaskClick,
  onStatusChange,
}) => {
  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'No deadline';
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
        <p className="text-slate-400 text-sm">No tasks found matching your filter criteria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Task</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Priority</th>
              <th className="py-3.5 px-4">Assignee</th>
              <th className="py-3.5 px-4">Due Date</th>
              <th className="py-3.5 px-4 text-right">Discussion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
              >
                {/* Title & Project/Tags */}
                <td className="py-4 px-4 sm:px-6">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {task.title}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    {task.project_title && (
                      <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                        {task.project_title}
                      </span>
                    )}
                    {task.tags && task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Status Dropdown/Badge */}
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value)}
                    className="text-xs font-semibold rounded-lg px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </td>

                {/* Priority */}
                <td className="py-4 px-4">
                  <PriorityBadge priority={task.priority} />
                </td>

                {/* Assignee */}
                <td className="py-4 px-4">
                  {task.assignee ? (
                    <div className="flex items-center space-x-2">
                      <Avatar user={task.assignee} size="xs" />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        {task.assignee.full_name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                  )}
                </td>

                {/* Due Date */}
                <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 opacity-70" />
                    <span>{formatDueDate(task.due_date)}</span>
                  </div>
                </td>

                {/* Comments count */}
                <td className="py-4 px-4 text-right text-xs text-slate-400">
                  {task.comments_count > 0 ? (
                    <span className="inline-flex items-center space-x-1 font-medium text-slate-600 dark:text-slate-300">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{task.comments_count}</span>
                    </span>
                  ) : (
                    <span className="opacity-40">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
