'use client'
import { useState } from 'react'
import { supabase } from './utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link' 

export default function Home() {
  const [email, setEmail] = useState('')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: any) => {
    e.preventDefault()
    setLoading(true)
    
    // --- MAGIC TEST LOGIN (Backdoors) ---
    if (email === 'doc@test.com') {
      localStorage.setItem('isTestMode', 'true')
      router.push('/doctor')
      return
    }
    
    // NEW: Add backdoor for Tony
    if (email === 'tony@test.com') {
      localStorage.setItem('isTestMode', 'true')
      router.push('/patient')
      return
    }

    try {
      // --- REAL LOGIN (Database Check) ---
      localStorage.removeItem('isTestMode') // Clear test mode for real users

      const { data: user, error } = await supabase
        .from('Users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !user) {
        alert("User not found! Please check email or Sign Up.")
        setLoading(false)
        return
      }

      if (user.role === 'doctor') router.push('/doctor')
      else if (user.role === 'patient') router.push('/patient')
      else if (user.role === 'pharma') router.push('/pharma')
      
    } catch (err) {
      alert("Login failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'black', color: 'white' }}>
      <div style={{ padding: '40px', border: '1px solid #333', borderRadius: '10px', textAlign: 'center', width: '350px' }}>
        
        <h2 style={{ marginBottom: '20px' }}>MediConnect Login</h2>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ fontSize: '12px', color: '#888' }}>Enter your email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" 
              style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: 'none', backgroundColor: '#222', color: 'white' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '12px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #333' }}>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>New to MediConnect?</p>
          <Link href="/signup">
            <button style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '5px', cursor: 'pointer' }}>
              Create New Account
            </button>
          </Link>
        </div>

      </div>
    </div>
  )
}