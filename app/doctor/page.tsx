'use client'
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/navigation'
import { GoogleGenerativeAI } from "@google/generative-ai"
import ReactMarkdown from 'react-markdown'
import { 
  Stethoscope, 
  User, 
  Search, 
  Send, 
  Activity, 
  Clock, 
  LogOut,
  Upload,
  Trash2,
  BrainCircuit,
  Pill,
  Zap,
  LayoutDashboard
} from 'lucide-react'

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
const genAI = new GoogleGenerativeAI(API_KEY)

export default function DoctorDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'consultation' | 'profile'>('consultation')
  const [myEmail, setMyEmail] = useState('')
  const [sessionLoading, setSessionLoading] = useState(true)
  const [searchNameInput, setSearchNameInput] = useState('') 
  const [patientName, setPatientName] = useState('')
  const [activePatientEmail, setActivePatientEmail] = useState('') 
  const [activePatientProfile, setActivePatientProfile] = useState<any>(null)
  const [drug, setDrug] = useState('')
  const [dosage, setDosage] = useState('')
  const [finalDiagnosis, setFinalDiagnosis] = useState('')
  const [history, setHistory] = useState<any[]>([]) 
  const [chatMessages, setChatMessages] = useState<{role: string, text: string}[]>([])
  const [userMessage, setUserMessage] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const chatSessionRef = useRef<any>(null)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [profile, setProfile] = useState({ full_name: '', qualifications: '', hospital_name: '', address: '', image_url: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  
  // --- THIS WAS THE MISSING LINE CAUSING THE ERROR ---
  const [uploading, setUploading] = useState(false) 
  // --------------------------------------------------

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState(false)

  const commonSymptoms = ["Fever", "Cough", "Headache", "Fatigue", "Sore Throat", "Nausea", "Chest Pain", "Shortness of Breath", "Abdominal Pain", "Muscle Pain", "Rash", "Anxiety", "Insomnia"]

  // ... (Keep the rest of your code the same from here down)
  // Or if you want to be safe, I can provide the full file again.
  // Ideally, just adding that one missing line fixes the build error.

  useEffect(() => { checkSession() }, [])

  const checkSession = async () => {
    const isTestMode = localStorage.getItem('isTestMode')
    if (isTestMode === 'true') { setMyEmail('doc@test.com'); fetchProfile('doc@test.com'); setSessionLoading(false); return }
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) { router.push('/'); return }
    setMyEmail(user.email || ''); fetchProfile(user.email || ''); setSessionLoading(false)
  }

  const fetchProfile = async (email: string) => {
    const { data: profileData } = await supabase.from('doctor_profiles').select('*').eq('email', email).single()
    const { data: userData } = await supabase.from('Users').select('Full_name').eq('email', email).single()
    
    let finalData = profileData || { full_name: '', qualifications: '', hospital_name: '', address: '', image_url: '' }
    if (!finalData.full_name && userData?.Full_name) finalData.full_name = userData.Full_name
    
    setProfile({
        full_name: finalData.full_name || '',
        qualifications: finalData.qualifications || '',
        hospital_name: finalData.hospital_name || '',
        address: finalData.address || '',
        image_url: finalData.image_url || ''
    })
  }

  const handleSearch = async () => {
    setPatientName(''); setHistory([]); setActivePatientEmail(''); setActivePatientProfile(null)
    const { data: users, error } = await supabase.from('Users').select('email, Full_name').ilike('Full_name', `%${searchNameInput}%`).eq('role', 'patient')
    if (error || !users || users.length === 0) { alert('Patient not found.'); return }
    const targetUser = users[0]
    setPatientName(targetUser.Full_name)
    setActivePatientEmail(targetUser.email) 
    const { data: medProfile } = await supabase.from('patient_profiles').select('*').eq('email', targetUser.email).single()
    if (medProfile) setActivePatientProfile(medProfile)
    const { data: historyData } = await supabase.from('prescriptions').select('*').eq('patient_email', targetUser.email).order('created_at', { ascending: false })
    if (historyData) setHistory(historyData)
  }

  const startConsultation = async () => {
    const symptomsList = selectedSymptoms.join(', ')
    if (!symptomsList) { alert("Please select symptoms."); return }
    if (!API_KEY) { alert("⚠️ API Key Missing!"); return }

    setAiLoading(true); setChatMessages([])
    let patientContext = activePatientProfile ? `PATIENT PROFILE:\n- Age: ${activePatientProfile.age || 'Unknown'}\n- CONDITIONS: ${activePatientProfile.chronic_conditions || 'None'}\n- ALLERGIES: ${activePatientProfile.allergies || 'None'}` : "No known chronic conditions."
    const systemPrompt = `You are an expert AI Medical Assistant. Be concise, professional, and use bullet points.\n${patientContext}`

    try {
      let validModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]
      try {
          const listReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
          const listData = await listReq.json()
          if (listData?.models) validModels = listData.models.map((m: any) => m.name.replace('models/', '')).filter((n: string) => (n.includes('flash') || n.includes('pro')) && !n.includes('vision'))
      } catch (e) {}

      let success = false
      for (const modelName of validModels) {
        if (success) break;
        try {
          const model = genAI.getGenerativeModel({ model: modelName })
          const chat = model.startChat({ history: [{ role: "user", parts: [{ text: systemPrompt }] }, { role: "model", parts: [{ text: "Understood." }] }] })
          const result = await chat.sendMessage(`Patient presents with: ${symptomsList}. Diagnosis?`)
          chatSessionRef.current = chat; setChatMessages([ { role: 'user', text: `Symptoms: ${symptomsList}` }, { role: 'model', text: result.response.text() } ]); success = true 
        } catch (e) {}
      }
      if (!success) throw new Error("AI Busy.")
    } catch (e: any) { alert(e.message) }
    setAiLoading(false)
  }

  const handleSendMessage = async () => {
    if (!userMessage.trim() || !chatSessionRef.current) return
    const msg = userMessage; setUserMessage(''); setChatMessages(prev => [...prev, { role: 'user', text: msg }]); setAiLoading(true)
    try { const result = await chatSessionRef.current.sendMessage(msg); setChatMessages(prev => [...prev, { role: 'model', text: result.response.text() }]); } catch (error) { alert("Error.") }
    setAiLoading(false)
  }

  const handlePrescribe = async (e: any) => {
    e.preventDefault(); if (!patientName) return
    const { error } = await supabase.from('prescriptions').insert({ patient_email: activePatientEmail, drug_name: drug, dosage: dosage, doctor_email: myEmail, symptoms: selectedSymptoms.join(', '), diagnosis: finalDiagnosis })
    if (error) alert('Error.'); else { alert('Sent!'); setDrug(''); setDosage(''); setFinalDiagnosis(''); const { data: h } = await supabase.from('prescriptions').select('*').eq('patient_email', activePatientEmail).order('created_at', { ascending: false }); if(h) setHistory(h) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); localStorage.removeItem('isTestMode'); router.push('/') }
  
  const handleImageClick = () => fileInputRef.current?.click()
  
  const handleImageUpload = async (event: any) => { 
      try { 
          setUploading(true); setImageError(false); 
          const file = event.target.files[0]; 
          if (!file) return; 
          const fileExt = file.name.split('.').pop(); 
          const fileName = `doc_${Date.now()}.${fileExt}`; 
          const { error } = await supabase.storage.from('avatars').upload(fileName, file); 
          if (error) throw error; 
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName); 
          setProfile({ ...profile, image_url: data.publicUrl }); 
      } catch (error: any) { alert(error.message) } finally { setUploading(false) } 
  }
  
  const handleSaveProfile = async (e: any) => { e.preventDefault(); setProfileLoading(true); await supabase.from('doctor_profiles').upsert({ email: myEmail, ...profile }); fetchProfile(myEmail); setProfileLoading(false) }
  const handleSymptomChange = (s: string) => { if (selectedSymptoms.includes(s)) setSelectedSymptoms(selectedSymptoms.filter(i => i !== s)); else setSelectedSymptoms([...selectedSymptoms, s]) }

  if (sessionLoading) return <div className="flex h-screen items-center justify-center bg-black text-gray-500">Loading Workspace...</div>

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-main bg-grid text-gray-100 font-sans">
      <aside className="w-72 flex flex-col p-6 border-r border-white/5 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-10"><div className="w-10 h-10 rounded-xl bg-gradient-button flex items-center justify-center shadow-lg"><LayoutDashboard className="text-white w-5 h-5" /></div><div><h1 className="font-bold text-lg text-white">G-pam Med</h1><p className="text-[10px] text-gray-500 font-medium tracking-wider">CLINICAL WORKSPACE</p></div></div>
        <nav className="flex-1 space-y-2">
          <button onClick={() => setActiveTab('consultation')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'consultation' ? 'bg-gradient-sidebar border-l-4 border-violet-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><Stethoscope size={20} /><span>Consultation</span></button>
          <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-gradient-sidebar border-l-4 border-violet-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}><User size={20} /><span>My Profile</span></button>
        </nav>
        <div className="mt-auto pt-6 border-t border-white/5"><button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-400 transition-colors text-sm"><LogOut size={16} /> Sign Out</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 relative">
        {activeTab === 'consultation' && (
          <div className="max-w-[1600px] mx-auto space-y-8">
            <div className="flex items-center gap-4"><div className="relative flex-1"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} /><input type="text" placeholder="Search for a patient..." value={searchNameInput} onChange={(e) => setSearchNameInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="w-full bg-gradient-card border border-white/5 text-gray-200 rounded-2xl pl-14 pr-4 py-4 text-sm focus:border-violet-500/50 focus:outline-none shadow-xl" /></div><button onClick={handleSearch} className="bg-gradient-button text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-lg shadow-violet-500/20 flex items-center gap-2">Find Patient</button></div>
            {patientName ? (
              <div className="grid grid-cols-12 gap-8 h-[calc(100vh-180px)]">
                <div className="col-span-8 flex flex-col gap-4">
                  <div className="flex-1 bg-gradient-card border border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative backdrop-blur-sm">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5"><div className="flex items-center gap-3"><BrainCircuit size={20} className="text-violet-400"/><h3 className="font-bold text-sm text-gray-200">AI Assistant</h3></div></div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6">{chatMessages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-gradient-button text-white' : 'bg-black/40 border border-white/10 text-gray-300'}`}><ReactMarkdown>{msg.text}</ReactMarkdown></div></div>))}</div>
                    <div className="p-5 bg-black/20 border-t border-white/5"><div className="flex flex-wrap gap-2 mb-4">{commonSymptoms.map(s => <button key={s} onClick={() => handleSymptomChange(s)} className={`text-[11px] font-medium px-4 py-2 rounded-xl border transition-all ${selectedSymptoms.includes(s) ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-white/5 border-white/5 text-gray-500'}`}>{s}</button>)}</div><div className="flex gap-3"><input type="text" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} className="flex-1 bg-black/30 border border-white/10 text-gray-200 rounded-xl px-4 py-3 text-sm" /><button onClick={handleSendMessage} className="p-3 bg-black/30 border border-white/10 text-gray-400 rounded-xl"><Send size={18} /></button>{!chatSessionRef.current && <button onClick={startConsultation} className="bg-gradient-button text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2"><Zap size={16} /> Analyze</button>}</div></div>
                  </div>
                </div>
                <div className="col-span-4 flex flex-col gap-6">
                  <div className="bg-gradient-card border border-white/5 rounded-3xl p-6 shadow-xl"><div className="flex items-center gap-3 mb-6"><Pill size={18} className="text-emerald-400"/><h3 className="font-bold text-sm text-gray-200">Prescription</h3></div><form onSubmit={handlePrescribe} className="space-y-4"><textarea value={finalDiagnosis} onChange={(e) => setFinalDiagnosis(e.target.value)} placeholder="Diagnosis..." className="w-full h-24 bg-black/30 border border-white/10 text-gray-200 rounded-xl p-3 text-sm" /><div className="grid grid-cols-2 gap-3"><input type="text" placeholder="Drug" value={drug} onChange={e => setDrug(e.target.value)} className="w-full bg-black/30 border border-white/10 text-gray-200 rounded-xl px-3 py-3 text-sm" /><input type="text" placeholder="Dosage" value={dosage} onChange={e => setDosage(e.target.value)} className="w-full bg-black/30 border border-white/10 text-gray-200 rounded-xl px-3 py-3 text-sm" /></div><button type="submit" className="w-full py-3.5 bg-gradient-button text-white rounded-xl text-sm font-bold">Confirm & Send</button></form></div>
                  <div className="flex-1 bg-gradient-card border border-white/5 rounded-3xl flex flex-col overflow-hidden"><div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5"><Clock size={18} className="text-orange-400"/><h3 className="font-bold text-sm text-gray-200">History</h3></div><div className="flex-1 overflow-y-auto p-4 space-y-3">{history.map((rec) => (<div key={rec.id} className="p-4 bg-black/30 rounded-2xl border border-white/5"><div className="flex justify-between items-center mb-1"><span className="text-sm font-bold text-gray-200">{rec.drug_name}</span><span className="text-[10px] text-gray-600">{new Date(rec.created_at).toLocaleDateString()}</span></div><p className="text-xs text-gray-500 truncate">{rec.diagnosis}</p></div>))}</div></div>
                </div>
              </div>
            ) : <div className="h-[60vh] flex items-center justify-center text-gray-600">Search for a patient to begin.</div>}
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-gradient-card border border-white/5 rounded-2xl p-8 shadow-xl mt-10 backdrop-blur-md">
            <h2 className="text-2xl font-bold text-white mb-8 border-b border-white/5 pb-4">Edit Profile</h2>
            <form onSubmit={handleSaveProfile} className="space-y-8">
              <div className="flex flex-col items-center gap-4">
                <div onClick={handleImageClick} className="w-32 h-32 rounded-full border-4 border-[#0f111a] ring-2 ring-violet-500/30 p-1 cursor-pointer hover:opacity-80 transition-opacity relative group bg-black/40 flex items-center justify-center">
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">{profile.image_url && !imageError ? <img src={profile.image_url} onError={() => setImageError(true)} className="w-full h-full object-cover" /> : <User size={48} className="text-violet-400" />}</div>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white w-8 h-8" /></div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              </div>
              <div className="grid grid-cols-2 gap-6"><div className="col-span-2"><label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Full Name</label><input type="text" value={profile.full_name || ''} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3" /></div><div><label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Qualifications</label><input type="text" value={profile.qualifications || ''} onChange={e => setProfile({...profile, qualifications: e.target.value})} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3" /></div><div><label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Hospital</label><input type="text" value={profile.hospital_name || ''} onChange={e => setProfile({...profile, hospital_name: e.target.value})} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3" /></div><div className="col-span-2"><label className="text-[10px] uppercase font-bold text-gray-500 block mb-2">Address</label><textarea value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full bg-black/30 border border-white/10 text-white rounded-xl px-4 py-3" rows={3} /></div></div>
              <button type="submit" disabled={profileLoading} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-xl font-bold">{profileLoading ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}