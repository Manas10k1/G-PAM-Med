'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { GoogleGenerativeAI } from "@google/generative-ai"
import ReactMarkdown from 'react-markdown'
import { LayoutDashboard, Pill, TrendingUp, Zap, FileText, Activity } from 'lucide-react'

// ---------------------------------------------------------
// 🔴 PASTE YOUR API KEY HERE
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
// ---------------------------------------------------------

const genAI = new GoogleGenerativeAI(API_KEY)

export default function PharmaDashboard() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDrug, setSelectedDrug] = useState('')
  const [drugList, setDrugList] = useState<string[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: prescriptions } = await supabase.from('prescriptions').select('*').order('created_at', { ascending: true })
    if (prescriptions) {
      setData(prescriptions)
      const uniqueDrugs = Array.from(new Set(prescriptions.map((p: any) => p.drug_name).filter(Boolean))) as string[]
      setDrugList(uniqueDrugs)
      if (uniqueDrugs.length > 0) setSelectedDrug(uniqueDrugs[0])
    }
    setLoading(false)
  }

  const getDrugStats = () => {
    const drugData = data.filter(d => d.drug_name === selectedDrug)
    const ratedData = drugData.filter(d => d.drug_rating !== null)
    const avgRating = ratedData.length > 0 ? (ratedData.reduce((acc, curr) => acc + curr.drug_rating, 0) / ratedData.length).toFixed(1) : "N/A"
    return { drugData, ratedData, avgRating }
  }

  const { drugData, ratedData, avgRating } = getDrugStats()

  // --- SMART AI ENGINE: PREFERS GEMINI 2.5 ---
  const generateSummary = async () => {
    if (!API_KEY || API_KEY.includes("PASTE")) { alert("Missing API Key"); return }
    setAiLoading(true); setAiSummary("")
    
    const feedbackText = ratedData.map(r => `Patient: ${r.drug_feedback || 'None'}, Doctor: ${r.doctor_feedback || 'None'}`).join('\n')
    const prompt = `Act as a Pharmaceutical Data Analyst. Analyze feedback for ${selectedDrug} (Avg Rating: ${avgRating}/5). Summarize effectiveness and side effects concisely (max 3 bullet points).\n\n${feedbackText}`

    try {
        // 1. Define Preference List (2.5 -> 1.5 -> 1.0)
        let validModels = [
            "gemini-2.5-flash", 
            "gemini-2.5-pro", 
            "gemini-1.5-flash", 
            "gemini-1.5-pro", 
            "gemini-pro"
        ]

        // 2. Fetch available models dynamically from Google
        try {
            const listReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
            const listData = await listReq.json()
            
            if (listData && listData.models) {
                const apiModels = listData.models
                    .map((m: any) => m.name.replace('models/', ''))
                    .filter((name: string) => (name.includes('flash') || name.includes('pro')) && !name.includes('vision'))
                
                // Smart Sort: Force 2.5 to top, then 1.5
                validModels = apiModels.sort((a: string, b: string) => {
                    // If 'a' is version 2.5, it comes first (-1)
                    if (a.includes('2.5')) return -1;
                    if (b.includes('2.5')) return 1;
                    // Then version 1.5
                    if (a.includes('1.5')) return -1;
                    if (b.includes('1.5')) return 1;
                    return 0;
                })
            }
        } catch (e) { 
            console.warn("Could not fetch dynamic model list, using hardcoded preferences.") 
        }

        // 3. Try models in order (2.5 first)
        let success = false
        for (const modelName of validModels) {
            if (success) break;
            try {
                console.log(`Trying AI Model: ${modelName}...`)
                const model = genAI.getGenerativeModel({ model: modelName })
                const result = await model.generateContent(prompt)
                setAiSummary(result.response.text())
                success = true
            } catch (e) {
                console.warn(`Model ${modelName} failed or unavailable.`)
            }
        }
        
        if (!success) setAiSummary("System overloaded. Please try again in a moment.")

    } catch (e) { setAiSummary("Analysis failed.") }
    setAiLoading(false)
  }

  // Chart Data
  const chartData = Object.values(drugData.reduce((acc: any, curr: any) => {
      const date = new Date(curr.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      if (!acc[date]) acc[date] = { date, sales: 0, rating: 0, count: 0 }
      acc[date].sales += 1
      if (curr.drug_rating) { acc[date].rating += curr.drug_rating; acc[date].count += 1 }
      return acc
  }, {})).map((d: any) => ({ ...d, quality: d.count ? (d.rating/d.count).toFixed(1) : 0 }))

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-violet-500">Loading Analytics...</div>

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-main bg-grid text-gray-100 font-sans">
        
        {/* SIDEBAR */}
        <aside className="w-72 flex flex-col p-6 border-r border-white/5 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-gradient-button flex items-center justify-center shadow-lg shadow-violet-500/20"><TrendingUp className="text-white w-6 h-6" /></div>
                <div><h1 className="font-bold text-lg text-white">PharmaIntel</h1><p className="text-[10px] text-gray-500 font-medium tracking-wider">MARKET ANALYTICS</p></div>
            </div>
            <nav className="space-y-2">
                <button className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-gradient-sidebar border-l-4 border-violet-500 text-white font-medium shadow-[0_0_20px_rgba(139,92,246,0.1)]">
                    <LayoutDashboard size={20} className="text-violet-400" /> Dashboard
                </button>
                <div className="px-4 py-2 text-xs font-bold text-gray-500 uppercase mt-4">Active Modules</div>
                <div className="w-full flex items-center gap-4 px-4 py-2 text-gray-500 opacity-50 cursor-not-allowed"><FileText size={18}/> Reports</div>
                <div className="w-full flex items-center gap-4 px-4 py-2 text-gray-500 opacity-50 cursor-not-allowed"><Activity size={18}/> Live Feed</div>
            </nav>
        </aside>

        {/* MAIN DASHBOARD */}
        <main className="flex-1 overflow-y-auto p-8 relative">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">Performance Overview</h2>
                    <p className="text-sm text-gray-400">Real-time market tracking for {selectedDrug}</p>
                </div>
                <div className="relative">
                    <select value={selectedDrug} onChange={(e) => {setSelectedDrug(e.target.value); setAiSummary('')}} className="bg-gradient-card border border-white/10 text-white px-6 py-3 rounded-xl appearance-none pr-12 focus:outline-none focus:border-violet-500 font-bold shadow-xl cursor-pointer hover:border-violet-500/50 transition-colors">
                        {drugList.map(d => <option key={d} value={d} className="bg-gray-900">{d}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400 font-bold">▼</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* CHARTS */}
                <div className="col-span-8 space-y-8">
                    {/* Sales Chart */}
                    <div className="bg-gradient-card border border-white/5 p-6 rounded-3xl shadow-xl backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2"><TrendingUp size={16} className="text-emerald-400"/> Sales Volume</h3>
                            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">Live Data</div>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" tick={{fill: '#888', fontSize: 12}} />
                                    <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} />
                                    <Tooltip contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff'}} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                    <Bar dataKey="sales" fill="url(#colorSales)" radius={[6, 6, 0, 0]} />
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Quality Chart */}
                    <div className="bg-gradient-card border border-white/5 p-6 rounded-3xl shadow-xl backdrop-blur-sm">
                         <div className="flex justify-between items-center mb-6">
                            <h3 className="text-gray-400 text-xs font-bold uppercase flex items-center gap-2"><Activity size={16} className="text-blue-400"/> Effectiveness Rating</h3>
                            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">Patient Vitals</div>
                         </div>
                         <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" tick={{fill: '#888', fontSize: 12}} />
                                    <YAxis domain={[0, 5]} stroke="#666" tick={{fill: '#888', fontSize: 12}} />
                                    <Tooltip contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff'}} />
                                    <Line type="monotone" dataKey="quality" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill:'#0a0a0a', stroke:'#3b82f6', strokeWidth: 2}} activeDot={{r: 6, fill: '#3b82f6'}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* AI & STATS */}
                <div className="col-span-4 space-y-6">
                    {/* Scorecard */}
                    <div className="bg-gradient-card border border-white/5 p-8 rounded-3xl text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Average Rating</h3>
                        <div className={`text-6xl font-black mt-4 mb-2 tracking-tighter ${Number(avgRating) >= 4 ? 'text-emerald-400' : 'text-amber-400'}`}>{avgRating}</div>
                        <div className="text-sm text-gray-500">out of 5.0 stars</div>
                    </div>

                    {/* AI Analysis Card */}
                    <div className="bg-gradient-card border border-white/5 p-6 rounded-3xl relative overflow-hidden backdrop-blur-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><Zap size={18} className="text-violet-400"/> AI Analysis</h3>
                            <button onClick={generateSummary} disabled={aiLoading} className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-violet-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100">{aiLoading ? 'Thinking...' : 'Generate Report'}</button>
                        </div>
                        <div className="bg-black/30 rounded-xl p-4 border border-white/5 min-h-[120px]">
                            {aiSummary ? (
                                <div className="text-sm text-gray-300 leading-relaxed text-markdown">
                                    <ReactMarkdown>{aiSummary}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 py-4">
                                    <Zap size={24} className="opacity-20"/>
                                    <p className="text-xs italic">Click Generate to analyze {ratedData.length} patient reviews.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Feedback Stream */}
                    <div className="bg-gradient-card border border-white/5 p-6 rounded-3xl flex-1 flex flex-col max-h-[400px]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-gray-400 text-xs font-bold uppercase">Feedback Stream</h3>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-gray-400">{ratedData.length} Reviews</span>
                        </div>
                        <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                             {ratedData.length === 0 ? <p className="text-gray-600 text-sm text-center py-10">No reviews yet.</p> : ratedData.map((d: any) => (
                                 <div key={d.id} className="p-4 bg-black/30 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                     {d.drug_feedback ? (
                                        <p className="text-xs text-gray-300 mb-2 italic">"{d.drug_feedback}"</p>
                                     ) : (
                                        <p className="text-xs text-gray-600 mb-2 italic">No written comment.</p>
                                     )}
                                     <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                                         <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Verified Patient</span>
                                         </div>
                                         <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                                            <span className="text-[10px] font-bold text-emerald-400">{d.drug_rating}/5</span>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  )
}