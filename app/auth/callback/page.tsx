'use client'
import { useEffect } from 'react'
// ✅ FIXED PATH BELOW (Only two ../)
import { supabase } from '../../utils/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Login error:', error)
        router.push('/')
      } else if (session) {
        checkUserRole(session.user.email!)
      }
    }
    handleAuth()
  }, [])

  const checkUserRole = async (email: string) => {
    const { data: userData } = await supabase.from('Users').select('role').eq('email', email).single()

    if (userData?.role) {
      if (userData.role === 'doctor') router.push('/doctor')
      else if (userData.role === 'pharmacist') router.push('/pharma')
      else router.push('/patient')
    } else {
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