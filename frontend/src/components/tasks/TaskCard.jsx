import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, MessageSquare, Tag, AlertCircle } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { Avatar } from '../common/Avatar';

export const TaskCard = ({ task, index, onClick }) => {
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'COMPLETED';

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <Draggable draggableId={String(task.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(task)}
          className={`p-4 mb-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group ${
            snapshot.isDragging
              ? 'shadow-xl ring-2 ring-brand-500 scale-[1.02] rotate-1 z-50 bg-white dark:bg-slate-800'
              : ''
          }`}
        >
          {/* Priority & Tags */}
          <div className="flex items-center justify-between mb-2">
            <PriorityBadge priority={task.priority} />
            {task.tags && task.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                  {task.tags[0]}
                </span>
                {task.tags.length > 1 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    +{task.tags.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
            {task.title}
          </h4>

          {/* Description Snippet */}
          {task.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Footer Metadata */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            {/* Due Date & Comments */}
            <div className="flex items-center space-x-3 text-xs text-slate-400 dark:text-slate-500">
              {task.due_date && (
                <span
                  className={`flex items-center space-x-1 text-xs font-medium ${
                    isOverdue
                      ? 'text-rose-600 dark:text-rose-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isOverdue ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                  <span>{formatDueDate(task.due_date)}</span>
                </span>
              )}

              {task.comments_count > 0 && (
                <span className="flex items-center space-x-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{task.comments_count}</span>
                </span>
              )}
            </div>

            {/* Assignee Avatar */}
            <div>
              {task.assignee ? (
                <Avatar user={task.assignee} size="xs" />
              ) : (
                <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-slate-400">
                  ?
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
