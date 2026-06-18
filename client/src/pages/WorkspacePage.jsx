import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, FolderKanban, Users, Settings, ChevronRight, MoreHorizontal } from 'lucide-react'
import { format } from 'date-fns'
import CreateProjectModal from '../components/CreateProjectModal'

const projectColors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#14b8a6','#f97316']

export default function WorkspacePage() {
  const { workspaceId } = useParams()
  const queryClient = useQueryClient()
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then(r => r.data),
  })

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => api.get('/projects', { params: { workspace_id: workspaceId } }).then(r => r.data),
  })

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${workspaceId}/invite`, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workspace', workspaceId])
      setShowInvite(false)
      setInviteEmail('')
    }
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link to="/dashboard" className="hover:text-slate-300">Dashboard</Link>
            <ChevronRight size={12} />
            <span className="text-slate-300">{workspace?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100">{workspace?.name}</h1>
          {workspace?.description && <p className="text-slate-500 mt-1 text-sm">{workspace.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInvite(true)} className="btn-secondary flex items-center gap-2">
            <Users size={15} />
            Invite
          </button>
          <button onClick={() => setShowCreateProject(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Projects', value: projects.length, color: 'text-indigo-400' },
          { label: 'Members', value: workspace?.members?.length || 0, color: 'text-cyan-400' },
          { label: 'Active', value: projects.filter(p => p.status === 'active').length, color: 'text-green-400' },
          { label: 'Total Tasks', value: projects.reduce((a, p) => a + parseInt(p.task_count || 0), 0), color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Projects</h2>
        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="card p-5 h-36 animate-pulse bg-slate-800/50" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="card p-12 text-center">
            <FolderKanban size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No projects yet</p>
            <button onClick={() => setShowCreateProject(true)} className="btn-primary mt-4">
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Users size={14} />
          Team Members ({workspace?.members?.length || 0})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {workspace?.members?.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-800/50">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {m.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-200 truncate">{m.name}</div>
                <div className="text-xs text-slate-500 truncate">{m.email}</div>
              </div>
              <span className={`badge text-xs capitalize ${
                m.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' :
                m.role === 'manager' ? 'bg-purple-500/20 text-purple-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>{m.role}</span>
            </div>
          ))}
        </div>
      </div>

      {showCreateProject && (
        <CreateProjectModal
          workspaceId={workspaceId}
          onClose={() => setShowCreateProject(false)}
        />
      )}

      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal-content max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-100 mb-4">Invite to Workspace</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Email Address</label>
                <input
                  className="input" type="email" placeholder="colleague@company.com"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="btn-secondary flex-1" onClick={() => setShowInvite(false)}>Cancel</button>
                <button
                  className="btn-primary flex-1"
                  onClick={() => inviteMutation.mutate()}
                  disabled={!inviteEmail || inviteMutation.isPending}
                >
                  {inviteMutation.isPending ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
              {inviteMutation.isError && (
                <p className="text-xs text-red-400">{inviteMutation.error?.response?.data?.error}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }) {
  const total = parseInt(project.task_count || 0)
  const done = parseInt(project.completed_tasks || 0)
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Link to={`/project/${project.id}`} className="card p-5 hover:border-slate-700 transition-all duration-150 hover:shadow-lg hover:shadow-slate-900/50 group block">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color || '#6366f1' }} />
          <h3 className="font-semibold text-slate-100 text-sm group-hover:text-indigo-400 transition-colors">{project.name}</h3>
        </div>
        <span className={`badge text-xs ${project.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-500'}`}>
          {project.status}
        </span>
      </div>
      {project.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>}
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <span>{total} tasks</span>
        <span>·</span>
        <span>{done} completed</span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">Progress</span>
          <span className="text-xs font-medium text-slate-400">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: project.color || '#6366f1' }}
          />
        </div>
      </div>
    </Link>
  )
}
