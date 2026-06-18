import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { X, Plus } from 'lucide-react'

export default function CreateTaskModal({ projectId, defaultStatus = 'todo', onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState('medium')
  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [labelInput, setLabelInput] = useState('')
  const [labels, setLabels] = useState([])
  const queryClient = useQueryClient()

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  })

  const { data: members = [] } = useQuery({
    queryKey: ['workspace-members-search', project?.workspace_id],
    queryFn: () => api.get('/users/search', { params: { workspace_id: project?.workspace_id } }).then(r => r.data),
    enabled: !!project?.workspace_id,
  })

  const mutation = useMutation({
    mutationFn: () => api.post('/tasks', {
      project_id: projectId, title, description, status, priority,
      assignee_id: assigneeId || undefined, due_date: dueDate || undefined, labels
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks', projectId])
      onClose()
    }
  })

  const addLabel = () => {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim()])
      setLabelInput('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">New Task</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input" placeholder="What needs to be done?"
              value={title} onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none" rows={3} placeholder="Add more details..."
              value={description} onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assignee</label>
              <select className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Labels</label>
            <div className="flex gap-2">
              <input
                className="input flex-1" placeholder="Add a label..."
                value={labelInput} onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLabel()}
              />
              <button onClick={addLabel} className="btn-secondary px-3">
                <Plus size={14} />
              </button>
            </div>
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {labels.map(l => (
                  <span
                    key={l}
                    className="badge bg-slate-800 text-slate-300 text-xs cursor-pointer hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    onClick={() => setLabels(labels.filter(x => x !== l))}
                  >
                    {l} ×
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary flex-1"
              onClick={() => mutation.mutate()}
              disabled={!title || mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
          {mutation.isError && (
            <p className="text-xs text-red-400">{mutation.error?.response?.data?.error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
