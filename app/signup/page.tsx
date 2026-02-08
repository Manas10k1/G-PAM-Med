'use client'
import { useState, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUp() {
  const router = useRouter()
  
  // Basic Info
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') 
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'patient' | 'doctor' | 'pharma'>('patient')
  const [loading, setLoading] = useState(false)

  // Doctor Specifics
  const [qualifications, setQualifications] = useState('')
  const [hospital, setHospital] = useState('')
  const [address, setAddress] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: any) => {
    const file = e.target.files[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  // --- NEW: GOOGLE SIGN IN ---
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/patient`, // Default redirect to patient dashboard
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) alert(error.message)
  }

  const handleSignUp = async (e: any) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: existingUser } = await supabase.from('Users').select('email').eq('email', email).single()

      if (existingUser) {
        alert("User already exists! Please log in instead.")
        setLoading(false)
        return
      }

      const { error: userError } = await supabase.from('Users').insert({
          email,
          password,
          Full_name: fullName,
          role
        })

      if (userError) throw userError

      if (role === 'doctor') {
        let imageUrl = ''
        if (imageFile) {
          const fileExt = imageFile.name.split('.').pop()
          const fileName = `doc_${Date.now()}.${fileExt}`
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, imageFile)
          if (uploadError) throw uploadError
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
          imageUrl = data.publicUrl
        }

        const { error: profileError } = await supabase.from('doctor_profiles').insert({
            email,
            full_name: fullName, 
            qualifications,
            hospital_name: hospital,
            address,
            image_url: imageUrl
          })

        if (profileError) throw profileError
      }

      alert("Account Created Successfully! 🎉")
      
      if (role === 'doctor') router.push('/doctor')
      else if (role === 'patient') router.push('/patient')
      else router.push('/pharma')

    } catch (error: any) {
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, color: '#333' }}>Create Account</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>Join our medical network</p>
        </div>

        {/* --- GOOGLE BUTTON --- */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'white',
            color: '#333',
            border: '1px solid #ccc',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style={{ width: '20px', height: '20px' }} />
          Sign up with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#888' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
          <span style={{ padding: '0 10px', fontSize: '12px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ddd' }}></div>
        </div>

        <form onSubmit={handleSignUp} style={{ display: 'grid', gap: '20px' }}>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}>
            {['patient', 'doctor', 'pharma'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r as any)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '20px',
                  border: role === r ? '2px solid #0070f3' : '1px solid #ddd',
                  backgroundColor: role === r ? '#eaf4ff' : 'white',
                  color: role === r ? '#0070f3' : '#666',
                  fontWeight: 'bold',
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {r === 'pharma' ? 'Pharmacist' : r}
              </button>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required style={inputStyle} placeholder="e.g. Tony Stark" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="name@example.com" />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
          </div>

          {role === 'doctor' && (
            <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee', animation: 'fadeIn 0.3s' }}>
              <h4 style={{ margin: '0 0 15px 0', color: '#0070f3' }}>👨‍⚕️ Doctor Profile Setup</h4>
              
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#eee', 
                    margin: '0 auto', cursor: 'pointer', overflow: 'hidden', border: '2px dashed #ccc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '30px', color: '#999' }}>📷</span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>Tap to upload photo</p>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
              </div>

              <div style={{ display: 'grid', gap: '15px' }}>
                <input type="text" placeholder="Qualifications (e.g. MBBS, MD)" value={qualifications} onChange={e => setQualifications(e.target.value)} style={inputStyle} />
                <input type="text" placeholder="Hospital / Clinic Name" value={hospital} onChange={e => setHospital(e.target.value)} style={inputStyle} />
                <input type="text" placeholder="Clinic Address" value={address} onChange={e => setAddress(e.target.value)} style={inputStyle} />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '10px', 
              padding: '15px', 
              backgroundColor: loading ? '#ccc' : '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: loading ? 'not-allowed' : 'pointer' 
            }}
          >
            {loading ? 'Creating Account...' : 'Sign Up & Get Started'}
          </button>

        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', marginTop: '20px', color: '#666' }}>
          Already have an account? <Link href="/" style={{ color: '#0070f3', fontWeight: 'bold' }}>Log In</Link>
        </p>

      </div>
      <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  fontSize: '14px',
  outline: 'none'
}