import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
              <path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="20" cy="18" r="3" fill="#22d3ee"/>
            </svg>
          </div>
          <span className="font-bold text-slate-100 text-lg">TaskFlow</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-100">Create your account</h2>
          <p className="text-slate-500 mt-1 text-sm">Start managing projects with your team</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm">
            <AlertCircle size={15} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input
              type="text" className="input" placeholder="Alex Johnson"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>
          <div>
            <label className="label">Work email</label>
            <input
              type="email" className="input" placeholder="alex@company.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input pr-10" placeholder="Min 8 characters"
                value={password} onChange={e => setPassword(e.target.value)} required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-2 h-2 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-700'}`} />
                <span className={`text-xs ${password.length >= 8 ? 'text-green-400' : 'text-slate-600'}`}>
                  At least 8 characters
                </span>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 flex items-start gap-2 p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/20">
          <CheckCircle size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-slate-400">
            A workspace will be automatically created for you to start organizing your projects.
          </p>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
