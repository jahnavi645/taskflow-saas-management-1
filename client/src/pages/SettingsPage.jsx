import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { User, Bell, Lock, Check, BellOff } from 'lucide-react'
import { format } from 'date-fns'

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [name, setName] = useState(user?.name || '')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/users/notifications').then(r => r.data),
  })

  const profileMutation = useMutation({
    mutationFn: () => api.put('/users/profile', { name }),
    onSuccess: (r) => {
      setUser(prev => ({ ...prev, name: r.data.name }))
      setProfileMsg('Profile updated!')
      setTimeout(() => setProfileMsg(''), 3000)
    }
  })

  const pwdMutation = useMutation({
    mutationFn: () => api.put('/users/password', { current_password: currentPwd, new_password: newPwd }),
    onSuccess: () => {
      setPwdMsg('Password changed!')
      setCurrentPwd(''); setNewPwd('')
      setTimeout(() => setPwdMsg(''), 3000)
    },
    onError: (e) => setPwdMsg(e.response?.data?.error || 'Failed to change password')
  })

  const markReadMutation = useMutation({
    mutationFn: () => api.put('/users/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  })

  const markOneMutation = useMutation({
    mutationFn: (id) => api.put(`/users/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries(['notifications'])
  })

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
  ]

  const unread = notifications.filter(n => !n.is_read).length

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-500 mt-1 text-sm">Manage your account and preferences</p>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.id === 'notifications' && unread > 0 && (
                  <span className="ml-auto bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-5">Profile Information</h2>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-200">{user?.name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Display Name</label>
                  <input className="input" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input className="input" value={user?.email} disabled className="input opacity-50 cursor-not-allowed" />
                  <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
                </div>
                {profileMsg && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <Check size={14} /> {profileMsg}
                  </div>
                )}
                <button
                  className="btn-primary"
                  onClick={() => profileMutation.mutate()}
                  disabled={profileMutation.isPending || name === user?.name}
                >
                  {profileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-slate-100">Notifications</h2>
                {unread > 0 && (
                  <button
                    onClick={() => markReadMutation.mutate()}
                    className="btn-ghost text-xs flex items-center gap-1.5"
                  >
                    <Check size={12} /> Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <BellOff size={32} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.is_read && markOneMutation.mutate(n.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        n.is_read
                          ? 'border-slate-800/50 bg-slate-800/20'
                          : 'border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!n.is_read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />}
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${n.is_read ? 'text-slate-400' : 'text-slate-200'}`}>
                            {n.title}
                          </p>
                          {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                          <p className="text-xs text-slate-600 mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card p-6">
              <h2 className="text-base font-semibold text-slate-100 mb-5">Change Password</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password" className="input"
                    value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password" className="input" placeholder="Min 8 characters"
                    value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  />
                </div>
                {pwdMsg && (
                  <div className={`text-sm flex items-center gap-2 ${pwdMsg.includes('!') ? 'text-green-400' : 'text-red-400'}`}>
                    {pwdMsg}
                  </div>
                )}
                <button
                  className="btn-primary"
                  onClick={() => pwdMutation.mutate()}
                  disabled={!currentPwd || !newPwd || newPwd.length < 8 || pwdMutation.isPending}
                >
                  {pwdMutation.isPending ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
