import React, { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, Users } from 'lucide-react';
import { Avatar } from '../common/Avatar';
import { RoleBadge } from '../common/Badge';
import { Button } from '../common/Button';
import { authService } from '../../services/authService';

export const MemberManager = ({
  members = [],
  onAddMember,
  onRemoveMember,
  canManage = false,
  ownerId,
}) => {
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('CONTRIBUTOR');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (canManage) {
      loadAvailableUsers();
    }
  }, [canManage, members]);

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const allUsers = await authService.getUsers({ limit: 100 });
      const currentMemberIds = new Set(members.map((m) => m.user_id));
      const candidates = allUsers.filter((u) => !currentMemberIds.has(u.id));
      setAvailableUsers(candidates);
      if (candidates.length > 0) {
        setSelectedUserId(String(candidates[0].id));
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      setSubmitting(true);
      await onAddMember({
        user_id: parseInt(selectedUserId),
        role: selectedRole,
      });
      setSelectedUserId('');
      loadAvailableUsers();
    } catch (err) {
      console.error('Error adding member:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Member Form (Only for PMs and Admins) */}
      {canManage && (
        <form
          onSubmit={handleAdd}
          className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <UserPlus className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Add Team Member</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* User Select */}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers || availableUsers.length === 0}
              className="sm:col-span-2 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
            >
              {availableUsers.length === 0 ? (
                <option value="">No additional users available</option>
              ) : (
                availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))
              )}
            </select>

            {/* Role Select */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-500"
            >
              <option value="CONTRIBUTOR">Contributor</option>
              <option value="MANAGER">Manager</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              disabled={!selectedUserId || availableUsers.length === 0}
              icon={UserPlus}
            >
              Add to Project
            </Button>
          </div>
        </form>
      )}

      {/* Members List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Project Members ({members.length})
            </h4>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {members.map((m) => {
            const isOwner = m.user_id === ownerId;
            return (
              <div
                key={m.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Avatar user={m.user} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      {m.user?.full_name}
                      {isOwner && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{m.user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <RoleBadge role={m.role} />
                  {canManage && !isOwner && (
                    <button
                      onClick={() => onRemoveMember(m.user_id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove from project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
