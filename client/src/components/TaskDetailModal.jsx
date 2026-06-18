import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { X, Edit2, Trash2, MessageSquare, Send, Clock, User, Tag, AlertCircle } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { useAuth } from '../context/AuthContext'

const priorityColors = {
  urgent: 'text-red-400 bg-red-500/10',
  high: 'text-orange-400 bg-orange-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  low: 'text-slate-400 bg-slate-500/10',
}

export default function TaskDetailModal({ task: initialTask, onClose }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTask.title)
  const [description, setDescription] = useState(initialTask.description || '')
  const [status, setStatus] = useState(initialTask.status)
  const [priority, setPriority] = useState(initialTask.priority)
  const [dueDate, setDueDate] = useState(initialTask.due_date?.split('T')[0] || '')
  const [comment, setComment] = useState('')

  const { data: taskData } = useQuery({
    queryKey: ['task', initialTask.id],
    queryFn: () => api.get(`/tasks/${initialTask.id}`).then(r => r.data),
    initialData: initialTask,
  })

  const task = taskData || initialTask

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', task.id],
    queryFn: () => api.get(`/comments/${task.id}`).then(r => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: () => api.put(`/tasks/${task.id}`, { title, description, status, priority, due_date: dueDate || null }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', task.project_id])
      queryClient.invalidateQueries(['task', task.id])
      queryClient.invalidateQueries(['analytics-dashboard'])
      setEditing(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', task.project_id])
      onClose()
    }
  })

  const commentMutation = useMutation({
    mutationFn: () => api.post(`/comments/${task.id}`, { content: comment }),
    onSuccess: () => {
      queryClient.invalidateQueries(['comments', task.id])
      setComment('')
    }
  })

  const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div className="flex-1 mr-4">
            {editing ? (
              <input
                className="input text-base font-semibold"
                value={title} onChange={e => setTitle(e.target.value)}
                autoFocus
              />
            ) : (
              <h2 className="text-lg font-bold text-slate-100">{task.title}</h2>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {task.project_name && (
                <span className="badge bg-slate-800 text-slate-400 text-xs" style={{ borderLeft: `3px solid ${task.project_color || '#6366f1'}` }}>
                  {task.project_name}
                </span>
              )}
              <span className={`badge text-xs ${priorityColors[task.priority] || ''}`}>{task.priority}</span>
              {overdue && (
                <span className="badge bg-red-500/10 text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle size={10} /> Overdue
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!editing && (
              <button onClick={() => setEditing(true)} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">
                <Edit2 size={15} />
              </button>
            )}
            <button
              onClick={() => { if (confirm('Delete this task?')) deleteMutation.mutate() }}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input resize-none" rows={5}
                    value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Task description..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Priority</label>
                    <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <button className="btn-secondary flex-1" onClick={() => setEditing(false)}>Cancel</button>
                  <button
                    className="btn-primary flex-1"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
                  {task.description ? (
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                  ) : (
                    <p className="text-sm text-slate-600 italic">No description provided</p>
                  )}
                </div>

                {task.labels?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Tag size={11} /> Labels
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {task.labels.map(l => (
                        <span key={l} className="badge bg-slate-800 text-slate-300 text-xs">{l}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MessageSquare size={11} /> Comments ({comments.length})
                  </h3>
                  <div className="space-y-3 mb-4">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                          {c.user_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-300">{c.user_name}</span>
                            <span className="text-xs text-slate-600">{format(new Date(c.created_at), 'MMM d, h:mm a')}</span>
                          </div>
                          <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-300 leading-relaxed">
                            {c.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-xs text-slate-600">No comments yet. Be the first to comment!</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        className="input flex-1" placeholder="Add a comment..."
                        value={comment} onChange={e => setComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && comment.trim() && commentMutation.mutate()}
                      />
                      <button
                        onClick={() => commentMutation.mutate()}
                        disabled={!comment.trim() || commentMutation.isPending}
                        className="btn-primary px-3"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!editing && (
            <div className="w-48 border-l border-slate-800 p-4 space-y-4 flex-shrink-0">
              <div>
                <p className="text-xs text-slate-600 mb-1.5 font-medium uppercase tracking-wide">Status</p>
                <select
                  className="input text-xs"
                  value={status}
                  onChange={e => {
                    setStatus(e.target.value)
                    api.put(`/tasks/${task.id}`, { status: e.target.value }).then(() => {
                      queryClient.invalidateQueries(['tasks', task.project_id])
                    })
                  }}
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1">
                  <User size={10} /> Assignee
                </p>
                {task.assignee_name ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {task.assignee_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-400">{task.assignee_name}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-600">Unassigned</span>
                )}
              </div>
              {task.due_date && (
                <div>
                  <p className="text-xs text-slate-600 mb-1.5 font-medium uppercase tracking-wide flex items-center gap-1">
                    <Clock size={10} /> Due Date
                  </p>
                  <span className={`text-xs font-medium ${overdue ? 'text-red-400' : 'text-slate-400'}`}>
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-600 mb-1.5 font-medium uppercase tracking-wide">Created by</p>
                <span className="text-xs text-slate-500">{task.creator_name || 'Unknown'}</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 mb-1.5 font-medium uppercase tracking-wide">Created</p>
                <span className="text-xs text-slate-500">
                  {task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy') : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
