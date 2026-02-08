'use client'
import { useEffect } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // This handles the "magic" code Google sends back
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Login error:', error)
        router.push('/') // Send back to login on error
      } else if (session) {
        // Login successful! Now find out who they are.
        checkUserRole(session.user.email!)
      }
    }
    handleAuth()
  }, [])

  const checkUserRole = async (email: string) => {
    // 1. Check if they are in our 'Users' table
    const { data: userData } = await supabase.from('Users').select('role').eq('email', email).single()

    if (userData?.role) {
      // 2. Redirect to correct dashboard
      if (userData.role === 'doctor') router.push('/doctor')
      else if (userData.role === 'pharmacist') router.push('/pharma')
      else router.push('/patient')
    } else {
      // 3. New Google user? Send to Signup to pick a role
      router.push('/signup') 
    }
  }

  return (
    <div className="h-screen bg-black flex items-center justify-center text-white">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Verifying Google Account...</p>
      </div>
    </div>
  )
}