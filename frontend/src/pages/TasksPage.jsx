import React, { useState, useEffect } from 'react';
import { CheckSquare, LayoutGrid, List, Plus } from 'lucide-react';
import { taskService } from '../services/taskService';
import { projectService } from '../services/projectService';
import { authService } from '../services/authService';
import { TaskFilterBar } from '../components/tasks/TaskFilterBar';
import { TaskListView } from '../components/tasks/TaskListView';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { Button } from '../components/common/Button';

export const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // list or kanban

  const [filters, setFilters] = useState({
    search: '',
    project_id: '',
    status: '',
    priority: '',
    assignee_id: '',
    sort_by: 'position',
    sort_order: 'asc',
    page: 1,
    page_size: 50,
  });

  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters]);

  const loadMetadata = async () => {
    try {
      const [projData, usersData] = await Promise.all([
        projectService.getProjects(),
        authService.getUsers({ limit: 100 }),
      ]);
      setProjects(projData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load filter metadata:', err);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await taskService.getTasks(filters);
      setTasks(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      project_id: '',
      status: '',
      priority: '',
      assignee_id: '',
      sort_by: 'position',
      sort_order: 'asc',
      page: 1,
      page_size: 50,
    });
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await taskService.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to change status:', err);
      loadTasks();
    }
  };

  const handleTaskMove = async ({ taskId, destinationStatus, newPosition }) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: destinationStatus, position: newPosition }
          : t
      )
    );
    try {
      await taskService.moveTask(taskId, {
        status: destinationStatus,
        position: newPosition,
      });
    } catch (err) {
      console.error('Failed to move task:', err);
      loadTasks();
    }
  };

  const handleTaskUpdated = (updated) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (deletedId) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedId));
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            All Tasks ({totalCount})
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Search, filter, and track tasks across all visible projects
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-brand-500 text-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              viewMode === 'kanban'
                ? 'bg-brand-500 text-white'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Board</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <TaskFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        projects={projects}
        members={users}
        showProjectSelect={true}
      />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : viewMode === 'list' ? (
        <TaskListView
          tasks={tasks}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setIsModalOpen(true);
          }}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={(t) => {
            setSelectedTask(t);
            setIsModalOpen(true);
          }}
        />
      )}

      {/* Detail Modal */}
      <TaskDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        members={users}
      />
    </div>
  );
};
