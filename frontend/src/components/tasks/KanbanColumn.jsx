import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';

export const KanbanColumn = ({
  columnId,
  title,
  tasks = [],
  color = 'slate',
  onTaskClick,
  onAddTask,
}) => {
  const columnStyles = {
    slate: {
      dot: 'bg-slate-400',
      badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    blue: {
      dot: 'bg-blue-500',
      badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    },
    purple: {
      dot: 'bg-purple-500',
      badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    },
    emerald: {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
  };

  const currentStyle = columnStyles[color] || columnStyles.slate;

  return (
    <div className="flex flex-col w-80 shrink-0 bg-slate-100/70 dark:bg-slate-900/60 rounded-2xl p-3 border border-slate-200/60 dark:border-slate-800/80">
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-2">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${currentStyle.dot}`} />
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
            {title}
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${currentStyle.badge}`}>
            {tasks.length}
          </span>
        </div>

        {onAddTask && (
          <button
            onClick={() => onAddTask(columnId)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            title={`Add task to ${title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-[350px] rounded-xl transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-brand-50/50 dark:bg-brand-950/20 ring-2 ring-dashed ring-brand-400/50'
                : ''
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={onTaskClick}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl text-xs text-slate-400 dark:text-slate-600">
                No tasks
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};
