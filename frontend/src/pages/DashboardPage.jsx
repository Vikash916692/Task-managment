import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  Users,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { StatCard } from '../components/dashboard/StatCard';
import { TaskCharts } from '../components/dashboard/TaskCharts';
import { WorkloadList } from '../components/dashboard/WorkloadList';
import { ActivityFeed } from '../components/dashboard/ActivityFeed';
import { PriorityBadge, StatusBadge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-700 text-white shadow-lg shadow-brand-500/15">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">
            Welcome back, {user?.full_name}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-brand-100 mt-1">
            Here is your workspace overview, real-time analytics, and task distributions.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/projects')}
            icon={FolderKanban}
            className="text-slate-900"
          >
            View Projects
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Tasks"
          value={stats?.total_tasks || 0}
          subtitle={`${stats?.completed_tasks || 0} completed`}
          icon={CheckCircle2}
          color="indigo"
        />
        <StatCard
          title="Active Projects"
          value={stats?.active_projects || 0}
          subtitle={`${stats?.total_projects || 0} total managed`}
          icon={FolderKanban}
          color="blue"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats?.completion_rate_percentage || 0}%`}
          subtitle="Across visible projects"
          icon={TrendingUp}
          trend={stats?.completion_rate_percentage > 50 ? 'Strong Progress' : 'In Motion'}
          color="emerald"
        />
        <StatCard
          title="Overdue Tasks"
          value={stats?.overdue_tasks || 0}
          subtitle="Need immediate attention"
          icon={AlertTriangle}
          color={stats?.overdue_tasks > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Visual Charts: Status & Priority Distributions */}
      <TaskCharts
        statusDistribution={stats?.status_distribution}
        priorityDistribution={stats?.priority_distribution}
      />

      {/* Row 3: Upcoming Deadlines, Team Workloads, & Activity Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Deadlines
                </h3>
              </div>
              <span className="text-xs text-slate-400">Next 7 days</span>
            </div>

            <div className="space-y-3">
              {!stats?.upcoming_deadlines || stats?.upcoming_deadlines.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic">
                  No deadlines approaching in the next 7 days.
                </p>
              ) : (
                stats.upcoming_deadlines.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-brand-500/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <PriorityBadge priority={t.priority} />
                      <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                        {t.due_date}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Project: {t.project_title}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Team Workloads */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Team Workload
              </h3>
            </div>
            <WorkloadList workloads={stats?.team_workloads} />
          </div>
        </div>

        {/* Recent Activity Audit Feed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Recent Audit Trail
              </h3>
            </div>
            <ActivityFeed activities={stats?.recent_activities} />
          </div>
        </div>
      </div>
    </div>
  );
};
