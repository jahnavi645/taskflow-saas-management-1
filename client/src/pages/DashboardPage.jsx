import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'
import { Link } from 'react-router-dom'
import {
  CheckSquare, FolderKanban, Clock, AlertTriangle, TrendingUp,
  ArrowRight, Calendar, Zap, Menu
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'

const priorityColors = {
  urgent: 'text-red-400 bg-red-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  low: 'text-slate-400 bg-slate-500/10',
}

const statusColors = {
  todo: 'text-slate-400 bg-slate-500/10',
  in_progress: 'text-blue-400 bg-blue-500/10',
  review: 'text-purple-400 bg-purple-500/10',
  done: 'text-green-400 bg-green-500/10',
}

function dueDateLabel(date) {
  if (!date) return null
  const d = new Date(date)
  if (isToday(d)) return { text: 'Due today', cls: 'text-yellow-400' }
  if (isTomorrow(d)) return { text: 'Due tomorrow', cls: 'text-orange-400' }
  if (isPast(d)) return { text: `Overdue`, cls: 'text-red-400' }
  return { text: format(d, 'MMM d'), cls: 'text-slate-500' }
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const ts = analytics?.task_stats || {}
  const ps = analytics?.project_stats || {}
  const completion = ts.total > 0 ? Math.round((ts.done / ts.total) * 100) : 0

  const stats = [
    { label: 'Total Tasks', value: ts.total || 0, icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'In Progress', value: ts.in_progress || 0, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Projects', value: ps.active || 0, icon: FolderKanban, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'High Priority', value: ts.high_priority || 0, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="text-indigo-400">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} — Here's what's happening across your workspaces.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-100">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-400" />
            Overall Progress
          </h3>
          <div className="flex items-end gap-3 mb-3">
            <span className="text-4xl font-bold text-slate-100">{completion}%</span>
            <span className="text-slate-500 text-sm mb-1">complete</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-full transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'To Do', val: ts.todo || 0, color: 'bg-slate-500' },
              { label: 'In Progress', val: ts.in_progress || 0, color: 'bg-blue-500' },
              { label: 'In Review', val: ts.review || 0, color: 'bg-purple-500' },
              { label: 'Done', val: ts.done || 0, color: 'bg-green-500' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-xs text-slate-500">{s.label}</span>
                <span className="text-xs font-semibold text-slate-300 ml-auto">{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Clock size={15} className="text-yellow-400" />
            Upcoming Due
          </h3>
          {analytics?.upcoming_due?.length === 0 && (
            <p className="text-slate-600 text-xs">No tasks due in the next 7 days.</p>
          )}
          <div className="space-y-2.5">
            {analytics?.upcoming_due?.map(t => {
              const dl = dueDateLabel(t.due_date)
              return (
                <div key={t.id} className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: t.project_color || '#6366f1' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{t.title}</p>
                    <p className="text-xs text-slate-600">{t.project_name}</p>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${dl?.cls}`}>{dl?.text}</span>
                </div>
              )
            })}
          </div>
          {(analytics?.overdue_count > 0) && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 rounded-lg p-2">
              <AlertTriangle size={12} />
              {analytics.overdue_count} overdue task{analytics.overdue_count > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Zap size={15} className="text-cyan-400" />
            My Tasks
          </h3>
          {analytics?.my_tasks?.length === 0 && (
            <p className="text-slate-600 text-xs">No tasks assigned to you.</p>
          )}
          <div className="space-y-2">
            {analytics?.my_tasks?.map(t => (
              <div key={t.id} className="flex items-center gap-2 group">
                <span className={`badge ${priorityColors[t.priority] || priorityColors.medium} text-xs`}>
                  {t.priority}
                </span>
                <span className="text-xs text-slate-300 truncate flex-1">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Calendar size={15} className="text-slate-400" />
          Recent Activity
        </h3>
        {analytics?.recent_activity?.length === 0 && (
          <p className="text-slate-600 text-sm">No recent activity.</p>
        )}
        <div className="space-y-2">
          {analytics?.recent_activity?.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.project_color || '#6366f1' }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-slate-300 truncate block">{t.title}</span>
                <span className="text-xs text-slate-600">{t.project_name}</span>
              </div>
              <span className={`badge ${statusColors[t.status] || ''} text-xs`}>
                {t.status?.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-600 flex-shrink-0">
                {format(new Date(t.updated_at), 'MMM d')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
