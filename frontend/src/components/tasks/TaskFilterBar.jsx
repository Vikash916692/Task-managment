import React from 'react';
import { Search, Filter, RotateCcw, ArrowUpDown } from 'lucide-react';

export const TaskFilterBar = ({
  filters,
  onChange,
  onReset,
  projects = [],
  members = [],
  showProjectSelect = true,
}) => {
  const handleInputChange = (field, value) => {
    onChange({ ...filters, [field]: value, page: 1 });
  };

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-6 space-y-3">
      {/* Search and Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks by title or description..."
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
          />
        </div>

        {/* Project Selector (if enabled) */}
        {showProjectSelect && (
          <select
            value={filters.project_id || ''}
            onChange={(e) => handleInputChange('project_id', e.target.value ? parseInt(e.target.value) : '')}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        )}

        {/* Priority Filter */}
        <select
          value={filters.priority || ''}
          onChange={(e) => handleInputChange('priority', e.target.value || '')}
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={(e) => handleInputChange('status', e.target.value || '')}
          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REVIEW">In Review</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Row 2: Assignee, Sort, and Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Assignee Filter */}
          <select
            value={filters.assignee_id || ''}
            onChange={(e) => handleInputChange('assignee_id', e.target.value ? parseInt(e.target.value) : '')}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Assignees</option>
            {members.map((m) => (
              <option key={m.id || m.user?.id} value={m.user?.id || m.id}>
                {m.user?.full_name || m.full_name}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <div className="flex items-center space-x-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.sort_by || 'position'}
              onChange={(e) => handleInputChange('sort_by', e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="position">Kanban Order</option>
              <option value="due_date">Due Date</option>
              <option value="priority">Priority</option>
              <option value="created_at">Date Created</option>
            </select>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={onReset}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Filters</span>
        </button>
      </div>
    </div>
  );
};
