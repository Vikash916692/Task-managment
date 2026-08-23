import React, { useState, useEffect } from 'react';
import {
  Calendar,
  User,
  Tag,
  MessageSquare,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Avatar } from '../common/Avatar';
import { PriorityBadge, StatusBadge } from '../common/Badge';
import { commentService } from '../../services/commentService';
import { taskService } from '../../services/taskService';
import { useAuth } from '../../context/AuthContext';

export const TaskDetailModal = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
  onTaskDeleted,
  members = [],
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({});
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'TODO',
        priority: task.priority || 'MEDIUM',
        due_date: task.due_date || '',
        assignee_id: task.assignee_id || '',
        tags: task.tags ? task.tags.join(', ') : '',
      });
      loadComments(task.id);
    }
  }, [task]);

  const loadComments = async (taskId) => {
    try {
      setLoadingComments(true);
      const data = await commentService.getComments(taskId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    try {
      setSavingTask(true);
      const tagsArray = formData.tags
        ? formData.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const updated = await taskService.updateTask(task.id, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assignee_id: formData.assignee_id ? parseInt(formData.assignee_id) : 0,
        tags: tagsArray,
      });

      onTaskUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save task:', err);
      alert('Failed to update task: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingTask(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await taskService.deleteTask(task.id);
      onTaskDeleted(task.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const created = await commentService.addComment(task.id, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : task.title}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Main Task Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Title & Status Bar */}
          {isEditing ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <StatusBadge status={formData.status} />
              <PriorityBadge priority={formData.priority} />
              {task.due_date && (
                <span className="inline-flex items-center space-x-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            {isEditing ? (
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a detailed description..."
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            ) : (
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {formData.description || <span className="italic text-slate-400">No description provided.</span>}
              </p>
            )}
          </div>

          {/* Task Metadata Fields (Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Status Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Assignee
              </label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user?.id || m.id} value={m.user?.id || m.id}>
                    {m.user?.full_name || m.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Tags */}
          {isEditing && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Frontend, Bug, HighPriority"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button type="submit" size="sm" loading={savingTask}>
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Task Details
                </Button>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={handleDelete}
              icon={Trash2}
            >
              Delete Task
            </Button>
          </div>
        </form>

        {/* Comments Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2 mb-3">
            <MessageSquare className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Activity & Comments ({comments.length})
            </h4>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1 mb-4">
            {loadingComments ? (
              <p className="text-xs text-slate-400 py-4 text-center">Loading discussion...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center italic">
                No comments yet. Start the conversation!
              </p>
            ) : (
              comments.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <Avatar user={c.author} size="xs" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {c.author?.full_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim()}
              loading={submittingComment}
              icon={Send}
            >
              Post
            </Button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
