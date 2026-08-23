import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';

export const KanbanBoard = ({
  tasks = [],
  onTaskMove,
  onTaskClick,
  onAddTask,
}) => {
  const columns = [
    { id: 'TODO', title: 'To Do', color: 'slate' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'blue' },
    { id: 'REVIEW', title: 'In Review', color: 'purple' },
    { id: 'COMPLETED', title: 'Completed', color: 'emerald' },
  ];

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onTaskMove({
      taskId: parseInt(draggableId, 10),
      sourceStatus: source.droppableId,
      destinationStatus: destination.droppableId,
      newPosition: destination.index + 1,
    });
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-5 overflow-x-auto pb-6 pt-2 items-start scroll-smooth">
        {columns.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => (a.position || 0) - (b.position || 0));

          return (
            <KanbanColumn
              key={col.id}
              columnId={col.id}
              title={col.title}
              color={col.color}
              tasks={colTasks}
              onTaskClick={onTaskClick}
              onAddTask={onAddTask}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
};
