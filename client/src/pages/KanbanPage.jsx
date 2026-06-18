import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, List, ChevronRight, GripVertical } from 'lucide-react'
import { format, isPast } from 'date-fns'
import CreateTaskModal from '../components/CreateTaskModal'
import TaskDetailModal from '../components/TaskDetailModal'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'border-slate-600', headerColor: 'text-slate-400', dotColor: 'bg-slate-500' },
  { id: 'in_progress', label: 'In Progress', color: 'border-blue-500/30', headerColor: 'text-blue-400', dotColor: 'bg-blue-500' },
  { id: 'review', label: 'In Review', color: 'border-purple-500/30', headerColor: 'text-purple-400', dotColor: 'bg-purple-500' },
  { id: 'done', label: 'Done', color: 'border-green-500/30', headerColor: 'text-green-400', dotColor: 'bg-green-500' },
]

const priorityColors = {
  urgent: 'text-red-400 bg-red-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  low: 'text-slate-500 bg-slate-500/10',
}

export default function KanbanPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [createStatus, setCreateStatus] = useState('todo')
  const [selectedTask, setSelectedTask] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => api.get('/tasks', { params: { project_id: projectId } }).then(r => r.data),
  })

  const updateTask = useMutation({
    mutationFn: ({ id, status }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries(['tasks', projectId]),
  })

  const handleDragStart = (e, task) => {
    setDragging(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colId)
  }

  const handleDrop = (e, colId) => {
    e.preventDefault()
    if (dragging && dragging.status !== colId) {
      updateTask.mutate({ id: dragging.id, status: colId })
    }
    setDragging(null)
    setDragOver(null)
  }

  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id)
    return acc
  }, {})

  return (
    <div className="p-6 h-screen flex flex-col animate-fade-in">
      <div className="mb-5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          <Link to="/dashboard" className="hover:text-slate-300">Dashboard</Link>
          <ChevronRight size={12} />
          <Link to={`/project/${projectId}`} className="hover:text-slate-300">{project?.name}</Link>
          <ChevronRight size={12} />
          <span className="text-slate-300">Kanban</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project?.color || '#6366f1' }} />
            <h1 className="text-xl font-bold text-slate-100">{project?.name} — Kanban Board</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/project/${projectId}`)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <List size={14} />
              List View
            </button>
            <button
              onClick={() => { setCreateStatus('todo'); setShowCreate(true) }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus size={14} />
              Add Task
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 h-full min-w-max pb-4">
          {COLUMNS.map(col => {
            const colTasks = grouped[col.id] || []
            const isDragTarget = dragOver === col.id
            return (
              <div
                key={col.id}
                className={`flex flex-col w-72 bg-slate-900/50 rounded-xl border-t-2 ${col.color} border-l border-r border-b border-slate-800 transition-all ${isDragTarget ? 'ring-2 ring-indigo-500/50 bg-slate-900' : ''}`}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col.id)}
                onDragLeave={() => setDragOver(null)}
              >
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                    <span className={`text-sm font-semibold ${col.headerColor}`}>{col.label}</span>
                    <span className="bg-slate-800 text-slate-500 text-xs rounded-full px-2">{colTasks.length}</span>
                  </div>
                  <button
                    onClick={() => { setCreateStatus(col.id); setShowCreate(true) }}
                    className="text-slate-600 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 kanban-col">
                  {colTasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                      dragging={dragging?.id === task.id}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                  {isDragTarget && colTasks.length === 0 && (
                    <div className="border-2 border-dashed border-indigo-500/30 rounded-lg h-20 flex items-center justify-center">
                      <span className="text-xs text-indigo-500/50">Drop here</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {showCreate && (
        <CreateTaskModal
          projectId={projectId}
          defaultStatus={createStatus}
          onClose={() => setShowCreate(false)}
        />
      )}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}

function KanbanCard({ task, onDragStart, dragging, onClick }) {
  const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      onClick={onClick}
      className={`card p-3 cursor-grab active:cursor-grabbing hover:border-slate-700 transition-all duration-150 hover:shadow-md hover:shadow-slate-900/50 group
        ${dragging ? 'opacity-50 rotate-1 scale-102 border-indigo-500/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-200 group-hover:text-slate-100 line-clamp-2 flex-1">{task.title}</p>
        <GripVertical size={14} className="text-slate-700 group-hover:text-slate-500 flex-shrink-0 mt-0.5" />
      </div>
      {task.description && (
        <p className="text-xs text-slate-600 line-clamp-2 mb-2">{task.description}</p>
      )}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map(l => (
            <span key={l} className="badge bg-slate-800 text-slate-400 text-xs">{l}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className={`badge text-xs ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-2">
          {task.due_date && (
            <span className={`text-xs ${overdue ? 'text-red-400' : 'text-slate-600'}`}>
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
          {task.assignee_name && (
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {task.assignee_name?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
