import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export const TaskCharts = ({ statusDistribution, priorityDistribution }) => {
  const statusData = [
    { name: 'To Do', value: statusDistribution?.TODO || 0, color: '#94a3b8' },
    { name: 'In Progress', value: statusDistribution?.IN_PROGRESS || 0, color: '#3b82f6' },
    { name: 'In Review', value: statusDistribution?.REVIEW || 0, color: '#a855f7' },
    { name: 'Completed', value: statusDistribution?.COMPLETED || 0, color: '#10b981' },
  ];

  const priorityData = [
    { name: 'Low', count: priorityDistribution?.LOW || 0, fill: '#94a3b8' },
    { name: 'Medium', count: priorityDistribution?.MEDIUM || 0, fill: '#0ea5e9' },
    { name: 'High', count: priorityDistribution?.HIGH || 0, fill: '#f59e0b' },
    { name: 'Urgent', count: priorityDistribution?.URGENT || 0, fill: '#f43f5e' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Tasks by Status */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Tasks by Status
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Tasks by Priority */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Tasks by Priority
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {priorityData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
