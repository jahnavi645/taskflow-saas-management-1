import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  LayoutDashboard, FolderKanban, Settings, LogOut, Plus, ChevronDown,
  ChevronRight, Bell, User, Briefcase, Menu, X
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [wsExpanded, setWsExpanded] = useState(true)

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then(r => r.data),
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/users/notifications').then(r => r.data),
    refetchInterval: 30000,
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`
        ${open ? 'w-64' : 'w-0 overflow-hidden'}
        flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col
        transition-all duration-200 relative z-40
      `}>
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                <path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="20" cy="18" r="3" fill="currentColor" className="text-cyan-400"/>
              </svg>
            </div>
            <span className="font-bold text-slate-100 text-base tracking-tight">TaskFlow</span>
          </div>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">
          <Link to="/dashboard" className={`sidebar-link ${isActive('/dashboard') ? 'active' : ''}`}>
            <LayoutDashboard size={16} />
            Dashboard
          </Link>

          <div className="pt-4 pb-1">
            <button
              onClick={() => setWsExpanded(!wsExpanded)}
              className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400"
            >
              <span>Workspaces</span>
              {wsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>

          {wsExpanded && workspaces.map(ws => (
            <WorkspaceItem key={ws.id} ws={ws} isActive={isActive} />
          ))}

          <button
            onClick={async () => {
              const name = prompt('Workspace name:')
              if (!name) return
              await api.post('/workspaces', { name })
              navigate('/dashboard')
            }}
            className="sidebar-link w-full text-left"
          >
            <Plus size={16} />
            New Workspace
          </button>
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-0.5">
          <Link to="/settings" className={`sidebar-link ${isActive('/settings') ? 'active' : ''}`}>
            <Settings size={16} />
            Settings
          </Link>
          <div className="relative">
            <Link to="/settings?tab=notifications" className="sidebar-link w-full">
              <Bell size={16} />
              Notifications
              {unreadCount > 0 && (
                <span className="ml-auto bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
          <button
            onClick={logout}
            className="sidebar-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 p-2 rounded-lg transition-all"
        >
          <Menu size={18} />
        </button>
      )}
    </>
  )
}

function WorkspaceItem({ ws, isActive }) {
  const [expanded, setExpanded] = useState(false)
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', ws.id],
    queryFn: () => api.get('/projects', { params: { workspace_id: ws.id } }).then(r => r.data),
    enabled: expanded,
  })

  return (
    <div>
      <div className="flex items-center gap-1">
        <button onClick={() => setExpanded(!expanded)} className="p-0.5 text-slate-600 hover:text-slate-400">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <Link
          to={`/workspace/${ws.id}`}
          className={`sidebar-link flex-1 py-2 ${isActive(`/workspace/${ws.id}`) ? 'active' : ''}`}
        >
          <Briefcase size={14} />
          <span className="truncate">{ws.name}</span>
        </Link>
      </div>
      {expanded && projects.map(p => (
        <Link
          key={p.id}
          to={`/project/${p.id}`}
          className={`sidebar-link pl-9 py-1.5 ${isActive(`/project/${p.id}`) ? 'active' : ''}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color || '#6366f1' }}
          />
          <span className="truncate text-xs">{p.name}</span>
        </Link>
      ))}
    </div>
  )
}
