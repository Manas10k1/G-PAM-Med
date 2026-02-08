'use client'
import { useState } from 'react'
import { supabase } from './utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Log in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // 2. Fetch User Role from Public Table
      if (data.user && data.user.email) {
        const { data: userData, error: userError } = await supabase
          .from('Users')
          .select('role')
          .eq('email', data.user.email)
          .single()

        if (userError || !userData) {
          // If login works but no role found, they might be a patient by default
          router.push('/patient')
        } else {
          // Redirect based on role
          if (userData.role === 'doctor') router.push('/doctor')
          else if (userData.role === 'pharmacist') router.push('/pharma')
          else router.push('/patient')
        }
      }

    } catch (error: any) {
      alert("Login Failed: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
        
        {/* Glowing orb effect */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="text-center mb-10 relative z-10">
          <div className="inline-block p-3 rounded-2xl bg-white/5 mb-4 border border-white/10">
            <div className="w-8 h-8 bg-gradient-to-tr from-violet-500 to-indigo-500 rounded-lg"></div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-gray-500 text-sm">Sign in to access your medical dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-violet-400 transition-colors" size={18} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-gray-600"
                placeholder="doctor@hospital.com"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-violet-400 transition-colors" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-xl focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-gray-600"
                placeholder="••••••••"
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : <span className="flex items-center gap-2">Sign In <ArrowRight size={16}/></span>}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-8 relative z-10">
          New to G-PAM Med? <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Create Account</Link>
        </p>
      </div>
    </div>
  )
}