import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  LayoutGrid,
  List,
  Users,
  Activity,
  Plus,
  Edit,
  Trash2,
  Calendar,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskListView } from '../components/tasks/TaskListView';
import { MemberManager } from '../components/projects/MemberManager';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { ProjectModal } from '../components/projects/ProjectModal';
import { StatusBadge, RoleBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager, isAdmin } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('kanban'); // kanban, list, members, activity
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isEditProjectModalOpen, setIsEditProjectModalOpen] = useState(false);
  const [newTaskInitialStatus, setNewTaskInitialStatus] = useState('TODO');

  // New task form state
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MEDIUM',
    due_date: '',
    assignee_id: '',
    tags: '',
  });
  const [creatingTask, setCreatingTask] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const [projData, tasksData] = await Promise.all([
        projectService.getProject(id),
        taskService.getTasks({ project_id: id, page_size: 100 }),
      ]);
      setProject(projData);
      setTasks(tasksData.items || []);
    } catch (err) {
      console.error('Failed to load project details:', err);
      alert('Error: ' + (err.response?.data?.detail || err.message));
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskMove = async ({ taskId, destinationStatus, newPosition }) => {
    // Optimistic UI update
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
      // Revert if error
      loadProjectData();
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await taskService.updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
      loadProjectData();
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setCreatingTask(true);
      const tagsArray = newTaskData.tags
        ? newTaskData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      const created = await taskService.createTask({
        project_id: parseInt(id),
        title: newTaskData.title,
        description: newTaskData.description,
        status: newTaskData.status,
        priority: newTaskData.priority,
        due_date: newTaskData.due_date || null,
        assignee_id: newTaskData.assignee_id ? parseInt(newTaskData.assignee_id) : null,
        tags: tagsArray,
      });

      setTasks((prev) => [...prev, created]);
      setIsNewTaskModalOpen(false);
      setNewTaskData({
        title: '',
        description: '',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: '',
        assignee_id: '',
        tags: '',
      });
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Error creating task: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCreatingTask(false);
    }
  };

  const handleOpenAddTaskModal = (status = 'TODO') => {
    setNewTaskData((prev) => ({ ...prev, status }));
    setIsNewTaskModalOpen(true);
  };

  const handleOpenTaskDetail = (task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t))
    );
    setSelectedTask(updatedTask);
  };

  const handleTaskDeleted = (deletedTaskId) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
    setIsTaskModalOpen(false);
    setSelectedTask(null);
  };

  const handleUpdateProject = async (formData) => {
    try {
      const updated = await projectService.updateProject(project.id, formData);
      setProject(updated);
      setIsEditProjectModalOpen(false);
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete '${project.title}'?`)) return;
    try {
      await projectService.deleteProject(project.id);
      navigate('/projects');
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Error: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddMember = async (memberData) => {
    const created = await projectService.addMember(project.id, memberData);
    setProject((prev) => ({
      ...prev,
      members: [...prev.members, created],
    }));
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    await projectService.removeMember(project.id, userId);
    setProject((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.user_id !== userId),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isOwnerOrAdmin = isAdmin || project?.owner_id === user?.id;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/projects')}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Projects</span>
      </button>

      {/* Project Overview Header Card */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <StatusBadge status={project?.status} />
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                {project?.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
              {project?.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              onClick={() => handleOpenAddTaskModal('TODO')}
              size="sm"
              icon={Plus}
            >
              Add Task
            </Button>
            {isOwnerOrAdmin && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditProjectModalOpen(true)}
                  icon={Edit}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteProject}
                  icon={Trash2}
                  className="text-rose-600 dark:text-rose-400"
                />
              </>
            )}
          </div>
        </div>

        {/* Sub-meta details */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Owner:</span>
            <span>{project?.owner?.full_name}</span>
          </div>

          {project?.start_date && (
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {project.start_date} &rarr; {project.target_date || 'Ongoing'}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {tasks.filter((t) => t.status === 'COMPLETED').length} / {tasks.length} tasks completed
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('kanban')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'kanban'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Kanban Board</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'list'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <List className="w-4 h-4" />
          <span>List View</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'members'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members ({project?.members?.length || 0})</span>
        </button>
      </div>

      {/* Active Tab View Content */}
      {activeTab === 'kanban' && (
        <KanbanBoard
          tasks={tasks}
          onTaskMove={handleTaskMove}
          onTaskClick={handleOpenTaskDetail}
          onAddTask={handleOpenAddTaskModal}
        />
      )}

      {activeTab === 'list' && (
        <TaskListView
          tasks={tasks}
          onTaskClick={handleOpenTaskDetail}
          onStatusChange={handleStatusChange}
        />
      )}

      {activeTab === 'members' && (
        <MemberManager
          members={project?.members || []}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          canManage={isOwnerOrAdmin}
          ownerId={project?.owner_id}
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        task={selectedTask}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
        members={project?.members || []}
      />

      {/* Create Task Modal */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create New Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement user authentication"
              value={newTaskData.title}
              onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Add details, criteria or context..."
              value={newTaskData.description}
              onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={newTaskData.status}
                onChange={(e) => setNewTaskData({ ...newTaskData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={newTaskData.priority}
                onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Assignee
              </label>
              <select
                value={newTaskData.assignee_id}
                onChange={(e) => setNewTaskData({ ...newTaskData, assignee_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned</option>
                {project?.members?.map((m) => (
                  <option key={m.user?.id} value={m.user?.id}>
                    {m.user?.full_name} ({m.user?.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newTaskData.due_date}
                onChange={(e) => setNewTaskData({ ...newTaskData, due_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="Backend, API, Security"
              value={newTaskData.tags}
              onChange={(e) => setNewTaskData({ ...newTaskData, tags: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => setIsNewTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creatingTask}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditProjectModalOpen}
        onClose={() => setIsEditProjectModalOpen(false)}
        onSubmit={handleUpdateProject}
        initialData={project}
      />
    </div>
  );
};
