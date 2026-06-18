import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-600 rounded-full filter blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-600 rounded-full filter blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-500/30">
            <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-white">
              <path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="20" cy="18" r="3" fill="#22d3ee"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">TaskFlow</h1>
          <p className="text-slate-400 text-lg max-w-sm mx-auto leading-relaxed">
            The SaaS platform where high-performing teams ship faster together.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { num: '10k+', label: 'Active Teams' },
              { num: '500k+', label: 'Tasks Completed' },
              { num: '99.9%', label: 'Uptime SLA' },
              { num: '4.9★', label: 'User Rating' },
            ].map(stat => (
              <div key={stat.num} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-indigo-400">{stat.num}</div>
                <div className="text-sm text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="flex items-center gap-2.5 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                  <path d="M4 6h16M4 12h10M4 18h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="20" cy="18" r="3" fill="#22d3ee"/>
                </svg>
              </div>
              <span className="font-bold text-slate-100 text-lg">TaskFlow</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-100">Welcome back</h2>
            <p className="text-slate-500 mt-1 text-sm">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email" className="input" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••"
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
            </div>
            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium">Create account</Link>
          </p>

          <div className="mt-6 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
            <p className="text-xs text-slate-500 text-center mb-2 font-medium">Demo Credentials</p>
            <button
              type="button"
              onClick={() => { setEmail('demo@taskflow.io'); setPassword('demo1234') }}
              className="w-full text-xs text-indigo-400 hover:text-indigo-300 text-center"
            >
              demo@taskflow.io / demo1234
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
