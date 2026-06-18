import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, KanbanSquare, List, ChevronRight, Search, Filter, BarChart2 } from 'lucide-react'
import { format, isPast } from 'date-fns'
import CreateTaskModal from '../components/CreateTaskModal'
import TaskDetailModal from '../components/TaskDetailModal'

const priorityColors = {
  urgent: 'text-red-400 bg-red-500/10 border-red-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  low: 'text-slate-400 bg-slate-500/10 border-slate-600/20',
}

const statusColors = {
  todo: 'text-slate-400',
  in_progress: 'text-blue-400',
  review: 'text-purple-400',
  done: 'text-green-400',
}

export default function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get('/tasks', { params: { project_id: projectId } }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['tasks', projectId]),
  })

  const filteredTasks = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const grouped = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done'),
  }

  if (projectLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-slate-300">Dashboard</Link>
          <ChevronRight size={12} />
          <span className="text-slate-300">{project?.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: project?.color || '#6366f1' }} />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{project?.name}</h1>
              {project?.description && <p className="text-slate-500 text-sm mt-0.5">{project.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/project/${projectId}/kanban`)}
              className="btn-secondary flex items-center gap-2"
            >
              <KanbanSquare size={15} />
              Kanban
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              Add Task
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: tasks.length, color: 'text-slate-300' },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-400' },
          { label: 'Done', value: tasks.filter(t => t.status === 'done').length, color: 'text-green-400' },
          { label: 'Overdue', value: tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'done').length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input pl-8" placeholder="Search tasks..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="review">In Review</option>
          <option value="done">Done</option>
        </select>
        <select className="input w-auto" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([status, statusTasks]) => (
          <div key={status}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${statusColors[status]}`}>
                {status.replace('_', ' ')}
              </h2>
              <span className="bg-slate-800 text-slate-500 text-xs rounded-full px-2 py-0.5">
                {statusTasks.length}
              </span>
            </div>
            {statusTasks.length === 0 ? (
              <div className="border border-dashed border-slate-800 rounded-xl p-4 text-center">
                <p className="text-slate-700 text-xs">No {status.replace('_', ' ')} tasks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {statusTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() => setSelectedTask(task)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateTaskModal projectId={projectId} onClose={() => setShowCreate(false)} />
      )}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}

function TaskRow({ task, onClick }) {
  const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
  return (
    <div
      onClick={onClick}
      className="card p-4 hover:border-slate-700 cursor-pointer transition-all duration-150 hover:shadow-md hover:shadow-slate-900/50 flex items-center gap-4 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-200 group-hover:text-slate-100 truncate">{task.title}</span>
          {task.labels?.map(l => (
            <span key={l} className="badge bg-slate-800 text-slate-400 text-xs">{l}</span>
          ))}
        </div>
        {task.description && (
          <p className="text-xs text-slate-600 mt-0.5 truncate">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {task.assignee_name && (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {task.assignee_name?.charAt(0)?.toUpperCase()}
            </div>
            <span className="text-xs text-slate-500 hidden sm:block">{task.assignee_name}</span>
          </div>
        )}
        {task.due_date && (
          <span className={`text-xs font-medium ${overdue ? 'text-red-400' : 'text-slate-500'}`}>
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
        <span className={`badge border text-xs ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority}
        </span>
        {task.comment_count > 0 && (
          <span className="text-xs text-slate-600">{task.comment_count} comments</span>
        )}
      </div>
    </div>
  )
}
