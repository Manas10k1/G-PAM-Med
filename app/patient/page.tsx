'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import { 
  HeartPulse, 
  FileText, 
  User, 
  LogOut, 
  Upload, 
  Star, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  MapPin,
  Activity,
  AlertCircle
} from 'lucide-react'

export default function PatientDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'records' | 'profile'>('records')
  
  // --- SESSION DATA ---
  const [myEmail, setMyEmail] = useState('')
  const [patientName, setPatientName] = useState('')
  const [loading, setLoading] = useState(true)

  // --- PROFILE DATA ---
  const [profile, setProfile] = useState({
    full_name: '',
    age: '',
    gender: '',
    image_url: '',
    chronic_conditions: '', 
    allergies: ''
  })
  const [customCondition, setCustomCondition] = useState('') 
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState(false)

  // --- RECORDS DATA ---
  const [prescriptions, setPrescriptions] = useState<any[]>([])
  const [viewProfileId, setViewProfileId] = useState<number | null>(null) 
  const [doctorStats, setDoctorStats] = useState<any>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [openFeedbackId, setOpenFeedbackId] = useState<number | null>(null)
  const [ratings, setRatings] = useState<any>({})

  // Standard Conditions List
  const conditionsList = ["Diabetes", "Hypertension (BP)", "Asthma", "Heart Disease", "Thyroid", "Arthritis"]

  useEffect(() => {
    checkSessionAndFetch()
  }, [])

  const checkSessionAndFetch = async () => {
    const isTestMode = localStorage.getItem('isTestMode')
    if (isTestMode === 'true') { setupUser('tony@test.com'); return }

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/'); return }
    
    setupUser(user.email || '')
  }

  const setupUser = async (email: string) => {
    setMyEmail(email)
    
    // Fetch Basic Name
    const { data: userData } = await supabase.from('Users').select('Full_name').eq('email', email).single()
    setPatientName(userData?.Full_name || email)

    // Fetch Full Profile
    const { data: profileData } = await supabase.from('patient_profiles').select('*').eq('email', email).single()
    if (profileData) {
      setProfile({
        ...profileData,
        age: profileData.age || '', 
        gender: profileData.gender || ''
      })
    } else {
      setProfile(prev => ({ ...prev, full_name: userData?.Full_name || '' }))
    }

    // Fetch Prescriptions
    const { data: scripts } = await supabase.from('prescriptions').select('*').eq('patient_email', email).order('created_at', { ascending: false })
    setPrescriptions(scripts || [])
    setLoading(false)
  }

  // --- PROFILE HANDLERS ---
  const handleConditionToggle = (condition: string) => {
    let current = profile.chronic_conditions ? profile.chronic_conditions.split(', ').filter(c => c.trim() !== '') : []
    if (current.includes(condition)) { current = current.filter(c => c !== condition) } else { current.push(condition) }
    setProfile({ ...profile, chronic_conditions: current.join(', ') })
  }

  const addCustomCondition = (e: any) => {
    e.preventDefault()
    if (!customCondition.trim()) return
    const newCondition = customCondition.trim()
    let current = profile.chronic_conditions ? profile.chronic_conditions.split(', ').filter(c => c.trim() !== '') : []
    if (!current.includes(newCondition)) {
      current.push(newCondition)
      setProfile({ ...profile, chronic_conditions: current.join(', ') })
    }
    setCustomCondition('') 
  }

  const handleImageUpload = async (e: any) => {
    try {
      setUploading(true); setImageError(false)
      const file = e.target.files[0]
      if (!file) return
      const fileExt = file.name.split('.').pop()
      const fileName = `patient_${Date.now()}.${fileExt}`
      const { error } = await supabase.storage.from('avatars').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      setProfile({ ...profile, image_url: data.publicUrl })
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const saveProfile = async (e: any) => {
    e.preventDefault()
    const { error } = await supabase.from('patient_profiles').upsert({
      email: myEmail,
      full_name: profile.full_name,
      age: parseInt(profile.age) || 0,
      gender: profile.gender,
      image_url: profile.image_url,
      chronic_conditions: profile.chronic_conditions,
      allergies: profile.allergies
    })
    if (error) alert("Error saving: " + error.message)
    else alert("Profile Updated!")
  }

  // --- HELPERS ---
  const handleViewProfile = async (prescriptionId: number, docEmail: string) => {
    if (viewProfileId === prescriptionId) { setViewProfileId(null); return }
    setDoctorStats(null) 
    const { data: profileData } = await supabase.from('doctor_profiles').select('*').eq('email', docEmail).single()
    const { data: ratingData } = await supabase.from('prescriptions').select('doctor_rating, doctor_feedback').eq('doctor_email', docEmail).not('doctor_rating', 'is', null)
    let inAppRating = 'N/A', inAppReviews: any[] = []
    if (ratingData && ratingData.length > 0) { const total = ratingData.reduce((acc:any, curr:any) => acc + curr.doctor_rating, 0); inAppRating = (total / ratingData.length).toFixed(1); inAppReviews = ratingData.map((d:any) => ({ user: 'Verified Patient', rating: d.doctor_rating, text: d.doctor_feedback || 'No comment' })) }
    if (profileData) setDoctorStats({ ...profileData, inAppRating, allReviews: inAppReviews })
    else setDoctorStats({ full_name: docEmail, image_url: null, qualifications: 'Profile not updated', hospital_name: 'Unknown Clinic', address: '', inAppRating, allReviews: inAppReviews })
    setViewProfileId(prescriptionId)
  }

  const toggleFeedbackForm = (id: number) => { if (openFeedbackId === id) setOpenFeedbackId(null); else setOpenFeedbackId(id) }
  const handleInputChange = (id: number, field: string, value: any) => { setRatings({ ...ratings, [id]: { ...ratings[id], [field]: value } }) }
  const submitFeedback = async (id: number) => { const r = ratings[id]; if (!r?.docRating || !r?.drugRating) { alert("Please rate both."); return }; const { error } = await supabase.from('prescriptions').update({ doctor_rating: parseInt(r.docRating), doctor_feedback: r.docComment, drug_rating: parseInt(r.drugRating), drug_feedback: r.drugComment }).eq('id', id); if (error) alert("Error saving."); else { alert("Feedback sent!"); setupUser(myEmail); setOpenFeedbackId(null) } }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const activeConditions = profile.chronic_conditions ? profile.chronic_conditions.split(', ').filter(c => c) : []

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-violet-500">Loading Portal...</div>

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-main bg-grid text-gray-100 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-72 flex flex-col p-6 border-r border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-button flex items-center justify-center shadow-lg shadow-violet-500/20">
            <HeartPulse className="text-white w-6 h-6" />
          </div>
          <div><h1 className="font-bold text-lg text-white">MediLife</h1><p className="text-[10px] text-gray-500 font-medium tracking-wider">PATIENT PORTAL</p></div>
        </div>

        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('records')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${activeTab === 'records' ? 'bg-gradient-sidebar border-l-4 border-violet-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <FileText size={20} className={activeTab === 'records' ? 'text-violet-400' : ''} />
            <span>My Records</span>
          </button>
          
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 ${activeTab === 'profile' ? 'bg-gradient-sidebar border-l-4 border-violet-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <User size={20} className={activeTab === 'profile' ? 'text-violet-400' : ''} />
            <span>My Profile</span>
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={handleLogout} className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm"><LogOut size={16} /> Sign Out</button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto bg-gradient-card border border-white/5 rounded-3xl p-8 shadow-xl backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-2">Edit Medical Profile</h2>
            <p className="text-sm text-gray-400 mb-8">Doctors will see this information to check for drug interactions.</p>
            
            <form onSubmit={saveProfile} className="space-y-6">
              <div className="flex items-center gap-6">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-full border-2 border-violet-500/30 p-1 cursor-pointer bg-black/40 hover:opacity-80 transition-opacity relative group">
                   <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
                      {profile.image_url && !imageError ? <img src={profile.image_url} onError={() => setImageError(true)} className="w-full h-full object-cover" /> : <User size={32} className="text-violet-400" />}
                   </div>
                   <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="text-white w-6 h-6" />
                   </div>
                </div>
                <div>
                   <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-violet-400 hover:text-violet-300 font-medium">Change Photo</button>
                   <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Full Name</label><input type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-violet-500/50 focus:outline-none" /></div>
                <div><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Age</label><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-violet-500/50 focus:outline-none" /></div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-5">
                <label className="text-xs font-bold text-gray-400 uppercase mb-4 block">Common Conditions</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {conditionsList.map(c => (
                    <div key={c} onClick={() => handleConditionToggle(c)} className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border transition-all ${activeConditions.includes(c) ? 'bg-violet-500/20 border-violet-500 text-violet-300' : 'bg-black/20 border-white/10 text-gray-400 hover:bg-white/5'}`}>
                        {activeConditions.includes(c) ? '✓ ' : '+ '}{c}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Other condition..." value={customCondition} onChange={(e) => setCustomCondition(e.target.value)} className="flex-1 bg-black/30 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-violet-500/50 focus:outline-none" />
                  <button type="button" onClick={addCustomCondition} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm">Add</button>
                </div>
                {activeConditions.length > 0 && (
                   <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                      {activeConditions.map(c => (
                         <span key={c} className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                            {c} <button type="button" onClick={() => handleConditionToggle(c)} className="hover:text-white ml-1">×</button>
                         </span>
                      ))}
                   </div>
                )}
              </div>

              <div><label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Allergies</label><input type="text" value={profile.allergies} onChange={e => setProfile({...profile, allergies: e.target.value})} placeholder="None" className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3 focus:border-violet-500/50 focus:outline-none" /></div>
              <button type="submit" className="w-full py-4 bg-gradient-button text-white rounded-xl font-bold shadow-lg shadow-violet-500/20">Save Medical Profile</button>
            </form>
          </div>
        )}

        {activeTab === 'records' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Medical Records</h2>
            {prescriptions.length === 0 ? <p className="text-gray-500">No records found.</p> : (
              <div>
                {/* LATEST PRESCRIPTION CARD */}
                {prescriptions.length > 0 && (
                  <div className="bg-gradient-card border border-violet-500/30 rounded-3xl overflow-hidden shadow-2xl mb-8 relative">
                    <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">LATEST</div>
                    
                    <div className="p-8 border-b border-white/5">
                      <div className="flex justify-between items-start">
                        <div>
                           <h3 className="text-2xl font-bold text-white mb-1">{prescriptions[0].drug_name}</h3>
                           <p className="text-sm text-gray-400">Prescribed on {new Date(prescriptions[0].created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-sm font-bold text-violet-300">Dr. {prescriptions[0].doctor_email}</p>
                           <button onClick={() => handleViewProfile(prescriptions[0].id, prescriptions[0].doctor_email)} className="text-xs text-gray-500 hover:text-white underline mt-1">{viewProfileId === prescriptions[0].id ? 'Hide Profile' : 'View Doctor'}</button>
                        </div>
                      </div>
                    </div>

                    {/* DOCTOR PROFILE DROPDOWN */}
                    {viewProfileId === prescriptions[0].id && doctorStats && (
                      <div className="bg-black/20 p-6 border-b border-white/5 flex gap-4 animate-in fade-in slide-in-from-top-2">
                        {doctorStats.image_url ? <img src={doctorStats.image_url} className="w-16 h-16 rounded-full object-cover border border-white/10" /> : <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center"><User size={24} className="text-gray-400"/></div>}
                        <div>
                           <h3 className="font-bold text-white">{doctorStats.full_name}</h3>
                           <p className="text-xs text-gray-400">{doctorStats.qualifications} • {doctorStats.hospital_name}</p>
                           <div className="mt-2 flex items-center gap-2"><Star size={12} className="text-yellow-400 fill-yellow-400"/> <span className="text-xs text-white">{doctorStats.inAppRating} Rating</span></div>
                        </div>
                      </div>
                    )}

                    <div className="p-8">
                       <div className="grid grid-cols-2 gap-8 mb-8">
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                             <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Dosage</p>
                             <p className="text-lg text-white font-medium">{prescriptions[0].dosage}</p>
                          </div>
                          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                             <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Reason</p>
                             <p className="text-lg text-white font-medium">{prescriptions[0].symptoms}</p>
                          </div>
                       </div>

                       {!prescriptions[0].doctor_rating ? (
                          <div>
                             <button onClick={() => toggleFeedbackForm(prescriptions[0].id)} className={`w-full py-3 rounded-xl border font-bold text-sm transition-all ${openFeedbackId === prescriptions[0].id ? 'bg-white/10 border-white/20 text-white' : 'border-violet-500/50 text-violet-400 hover:bg-violet-500/10'}`}>
                                {openFeedbackId === prescriptions[0].id ? 'Cancel' : '⭐ Rate Experience'}
                             </button>
                             
                             {openFeedbackId === prescriptions[0].id && (
                                <div className="mt-4 p-6 bg-black/30 rounded-2xl border border-white/5 animate-in fade-in zoom-in-95">
                                   <h4 className="text-sm font-bold text-white mb-4">How was your visit?</h4>
                                   <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div>
                                         <label className="text-xs text-gray-500 block mb-2">Doctor Rating</label>
                                         <select onChange={(e) => handleInputChange(prescriptions[0].id, 'docRating', e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-2 rounded-lg text-sm"><option value="">Select Stars...</option><option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Average</option><option value="2">2 - Poor</option><option value="1">1 - Bad</option></select>
                                      </div>
                                      <div>
                                         <label className="text-xs text-gray-500 block mb-2">Medicine Rating</label>
                                         <select onChange={(e) => handleInputChange(prescriptions[0].id, 'drugRating', e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-2 rounded-lg text-sm"><option value="">Select Effectiveness...</option><option value="5">5 - Very Effective</option><option value="4">4 - Good</option><option value="3">3 - Okay</option><option value="2">2 - Not Effective</option><option value="1">1 - Side Effects</option></select>
                                      </div>
                                   </div>
                                   <input type="text" placeholder="Comments..." onChange={(e) => handleInputChange(prescriptions[0].id, 'docComment', e.target.value)} className="w-full bg-black/40 border border-white/10 text-white p-3 rounded-xl text-sm mb-4 focus:border-violet-500/50 focus:outline-none" />
                                   <button onClick={() => submitFeedback(prescriptions[0].id)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm">Submit Feedback</button>
                                </div>
                             )}
                          </div>
                       ) : (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-emerald-400 text-xs font-bold">✓ Feedback Submitted</div>
                       )}
                    </div>
                  </div>
                )}
                
                {/* OLDER RECORDS */}
                {prescriptions.length > 1 && (
                  <div className="text-center mt-12 mb-12">
                    {!showHistory ? (
                       <button onClick={() => setShowHistory(true)} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-full text-sm font-medium transition-colors border border-white/5">View Past History ({prescriptions.length - 1} hidden)</button>
                    ) : (
                       <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                          {prescriptions.slice(1).map(script => (
                             <div key={script.id} className="bg-black/20 border border-white/5 p-5 rounded-2xl flex justify-between items-center text-left hover:bg-white/5 transition-colors">
                                <div>
                                   <h4 className="text-white font-bold">{script.drug_name}</h4>
                                   <p className="text-xs text-gray-500">Reason: {script.symptoms}</p>
                                </div>
                                <div className="text-right">
                                   <p className="text-xs text-gray-400">{new Date(script.created_at).toLocaleDateString()}</p>
                                </div>
                             </div>
                          ))}
                          <button onClick={() => setShowHistory(false)} className="mt-6 px-6 py-3 bg-black/40 hover:bg-black/60 text-gray-400 rounded-full text-sm font-medium transition-colors">Close History</button>
                       </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}