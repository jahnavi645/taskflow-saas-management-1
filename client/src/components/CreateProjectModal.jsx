import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { X } from 'lucide-react'

const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#14b8a6','#f97316','#ef4444','#84cc16']

export default function CreateProjectModal({ workspaceId, onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [dueDate, setDueDate] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: () => api.post('/projects', { workspace_id: workspaceId, name, description, color, due_date: dueDate || undefined }),
    onSuccess: (r) => {
      queryClient.invalidateQueries(['projects', workspaceId])
      queryClient.invalidateQueries(['workspaces'])
      onClose()
      navigate(`/project/${r.data.id}`)
    }
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-100">New Project</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Project Name *</label>
            <input
              className="input" placeholder="e.g. Website Redesign"
              value={name} onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none" rows={3} placeholder="What's this project about?"
              value={description} onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              type="date" className="input"
              value={dueDate} onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary flex-1"
              onClick={() => mutation.mutate()}
              disabled={!name || mutation.isPending}
            >
              {mutation.isPending ? 'Creating...' : 'Create Project'}
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
