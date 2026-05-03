import { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Zap, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Sparkles, 
  ShieldAlert,
  Terminal,
  ChevronRight,
  Eye,
  Camera,
  Film,
  Palette,
  Maximize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { analyzeMedia, type AnalysisResult } from "./services/gemini";

// --- Types ---
type AppState = "IDLE" | "SCANNING" | "ANALYZING" | "GENERATING" | "RESULT";

// --- Components ---

const Header = () => (
  <header className="h-16 border-b border-[#222] px-6 flex items-center justify-between bg-[#0a0a0a] sticky top-0 z-[100]">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">P</div>
      <span className="text-xl font-bold tracking-tighter uppercase text-white">PromptVision <span className="text-blue-500">AI</span></span>
    </div>
    <div className="flex items-center gap-6 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
      <span className="hidden md:block">Engine: v4.2.0</span>
      <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-blue-400 rounded-sm">Pro Account</span>
      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700"></div>
    </div>
  </header>
);

const Sidebar = ({ history, onSelect }: { history: any[], onSelect: (idx: number) => void }) => (
  <aside className="w-64 border-r border-[#222] bg-[#080808] p-4 flex flex-col gap-4 hidden lg:flex">
    <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500 mb-2 mt-4 ml-1">Recent Analyses</div>
    <div className="space-y-3 overflow-y-auto no-scrollbar flex-1">
      {history.length === 0 && (
         <div className="p-4 bg-zinc-900/20 border border-zinc-800 border-dashed rounded text-center">
           <p className="text-[10px] text-zinc-600 uppercase">No recent activity</p>
         </div>
      )}
      {history.map((item, idx) => (
        <div 
          key={idx}
          onClick={() => onSelect(idx)}
          className="p-3 bg-zinc-900/50 hover:bg-zinc-900 border-l-2 border-blue-600 rounded-r flex gap-3 cursor-pointer transition-colors"
        >
          <div className="w-10 h-10 bg-zinc-800 rounded flex-shrink-0 flex items-center justify-center">
            {item.type === 'video' ? <Video className="w-4 h-4 text-zinc-500" /> : <ImageIcon className="w-4 h-4 text-zinc-500" />}
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-zinc-200 truncate">{item.name}</div>
            <div className="text-[10px] text-zinc-500 italic mt-1">{item.time}</div>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-auto p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-lg text-center group cursor-pointer hover:border-blue-600/50 transition-colors">
      <div className="text-[10px] text-zinc-500 mb-1 font-bold tracking-tighter group-hover:text-blue-500">INITIATE NEW</div>
      <div className="text-xs font-bold text-zinc-400">+ NEW UPLOAD</div>
    </div>
  </aside>
);

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button 
      onClick={handleCopy}
      className={`text-[10px] px-3 py-1 rounded transition-colors uppercase font-bold tracking-tighter border ${copied ? 'bg-green-600/10 border-green-600 text-green-500' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'}`}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
};

const PromptBox = ({ title, content, isRtl = false }: { title: string; content: string; isRtl?: boolean }) => (
  <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-5 flex flex-col h-full group">
    <div className="flex justify-between items-center mb-4">
      <h2 className={`text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span> {title}
      </h2>
      <CopyButton text={content} />
    </div>
    <div className={`flex-1 bg-black p-4 rounded border border-zinc-900 text-[11px] leading-loose text-zinc-400 overflow-y-auto no-scrollbar ${isRtl ? 'rtl' : ''}`}>
      {content}
    </div>
  </div>
);

const SectionHeading = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <h2 className="text-xs font-bold tracking-[0.2em] uppercase text-zinc-400 mb-4 flex items-center gap-2">
    <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.6)]"></span> {title}
  </h2>
);

const PlatformCard = ({ name, prompt }: { name: string; prompt: string }) => (
  <div className="bg-[#0a0a0a] border border-[#222] p-4 rounded-lg space-y-3 hover:border-zinc-700 transition-colors group">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black italic tracking-wider text-blue-500 uppercase">{name}</span>
      <CopyButton text={prompt} />
    </div>
    <p className="text-[11px] leading-relaxed text-zinc-500 line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
      {prompt}
    </p>
  </div>
);

export default function App() {
  const [state, setState] = useState<AppState>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusMessages = {
    SCANNING: "SCANNING MEDIA DNA...",
    ANALYZING: "EXTRACTING CINEMATIC ATTRIBUTES...",
    GENERATING: "BUILDING MASTER PROMPTS...",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const runAnalysis = async (refinement?: string) => {
    if (!preview || !file) return;
    
    setState("SCANNING");
    setStatusMessage(statusMessages.SCANNING);
    
    try {
      await new Promise(r => setTimeout(r, 600));
      setState("ANALYZING");
      setStatusMessage(statusMessages.ANALYZING);
      
      await new Promise(r => setTimeout(r, 800));
      setState("GENERATING");
      setStatusMessage(statusMessages.GENERATING);

      const base64Data = preview.split(',')[1];
      const data = await analyzeMedia(base64Data, file.type, !!refinement, refinement);
      
      setResult(data);
      setState("RESULT");
      
      // Add to history
      if (!refinement) {
        setHistory(prev => [{
          name: data.artisticDirection,
          type: file.type.startsWith('video') ? 'video' : 'image',
          time: "Just now",
          data: data,
          preview: preview
        }, ...prev].slice(0, 10));
      }
    } catch (error) {
      console.error(error);
      alert("Analysis failed. Please check your API key.");
      setState("IDLE");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setState("IDLE");
  };

  return (
    <div className="h-screen bg-[#050505] text-[#e0e0e0] font-sans flex flex-col overflow-hidden">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar history={history} onSelect={(idx) => {
           setResult(history[idx].data);
           setPreview(history[idx].preview);
           setState("RESULT");
        }} />

        <main className="flex-1 overflow-y-auto no-scrollbar p-6 bg-[#050505]">
          <AnimatePresence mode="wait">
            {state === "IDLE" && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col gap-6"
              >
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-xl h-80 bg-[#0a0a0a] border-2 border-dashed border-[#222] rounded-xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-blue-600/50 hover:bg-[#0c0c0c] transition-all relative overflow-hidden"
                  >
                    <div className="w-16 h-16 bg-zinc-900 rounded-lg mb-6 flex items-center justify-center border border-zinc-800 shadow-xl group-hover:scale-110 transition-transform">
                      <Upload className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 tracking-tight uppercase">DRAG NEW MEDIA HERE</h3>
                    <p className="text-zinc-500 text-xs text-center uppercase tracking-widest">+ NEW UPLOAD</p>
                    <div className="mt-8 flex gap-3">
                      <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-500 font-bold uppercase tracking-widest rounded-sm">Images</div>
                      <div className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-[9px] text-zinc-500 font-bold uppercase tracking-widest rounded-sm">Videos</div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                  </div>

                  {preview && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex flex-col items-center gap-8">
                       <div className="relative max-w-sm rounded border border-[#222] overflow-hidden">
                          {file?.type.startsWith('video') ? <video src={preview} className="w-full h-auto aspect-video" /> : <img src={preview} alt="Preview" className="w-full h-auto" />}
                       </div>
                       <button onClick={() => runAnalysis()} className="px-10 py-4 bg-blue-600 font-bold uppercase tracking-[0.2em] text-[11px] rounded transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500">Run Cinematic Analysis</button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {(state === "SCANNING" || state === "ANALYZING" || state === "GENERATING") && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 h-full">
                <section className="flex gap-6 h-64">
                  <div className="w-64 bg-zinc-900 border border-[#222] rounded overflow-hidden relative">
                     {preview && (
                        file?.type.startsWith('video') ? <video src={preview} className="w-full h-full object-cover opacity-20" /> : <img src={preview} alt="" className="w-full h-full object-cover opacity-20" />
                     )}
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-[10px] font-mono text-blue-500 bg-black/80 px-4 py-2 border border-blue-600/30">SCANNING...</div>
                     </div>
                  </div>
                  <div className="flex-1 bg-[#0a0a0a] border border-[#222] p-8 rounded font-mono text-[11px] leading-relaxed relative overflow-hidden">
                    <div className="text-blue-500">[SYSTEM] INITIALIZING PROMPTVISION ENGINE...</div>
                    <div className="text-zinc-600 mt-2 uppercase">[DATA] SCANNING MEDIA BINARIES...</div>
                    <div className="text-zinc-600 uppercase">[DATA] DETECTING COLOR VECTORS...</div>
                    <div className="text-zinc-400 mt-6 uppercase leading-loose animate-pulse">
                      &gt; {statusMessage}
                    </div>
                    <div className="absolute bottom-8 left-8 right-8">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] text-zinc-600 uppercase">Processing Queue</span>
                          <span className="text-[9px] text-blue-500">85% COMPLETE</span>
                       </div>
                       <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: "85%" }} className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                       </div>
                    </div>
                  </div>
                </section>
                <div className="flex-1 bg-[#0a0a0a]/30 border border-dashed border-[#222] rounded flex items-center justify-center">
                   <div className="text-[10px] text-zinc-700 tracking-[0.5em] font-bold uppercase animate-pulse">Awaiting Analysis Completion</div>
                </div>
              </motion.div>
            )}

            {state === "RESULT" && result && (
              <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6 h-full">
                {/* Media Section */}
                <section className="flex gap-6 h-48">
                  <div className="w-48 bg-zinc-900 border border-[#222] rounded-lg relative overflow-hidden group">
                     {preview && (
                        file?.type.startsWith('video') ? <video src={preview} className="w-full h-full object-cover h-full" /> : <img src={preview} alt="" className="w-full h-full object-cover" />
                     )}
                     <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/80 text-blue-400 font-mono text-[9px] border border-blue-500/30">ACTIVE FILE</div>
                  </div>
                  <div className="flex-1 bg-[#0a0a0a] border border-[#222] p-6 rounded-lg font-mono text-[11px] leading-relaxed relative">
                    <div className="text-blue-500">[SUCCESS] ENGINE ANALYSIS COMPLETED</div>
                    <div className="text-zinc-500 uppercase mt-2">[DATA] ARTISTIC DIRECTION: {result.artisticDirection}</div>
                    <div className="text-zinc-500 uppercase">[DATA] DETECTED {result.cinematicTags.length} CINEMATIC ATTRIBUTES</div>
                    <div className="mt-4 flex flex-wrap gap-2 transition-all">
                       {result.cinematicTags.slice(0, 5).map((t, i) => (
                         <span key={i} className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 rounded"># {t}</span>
                       ))}
                    </div>
                    <button onClick={reset} className="absolute top-6 right-6 p-2 bg-zinc-800 hover:bg-zinc-700 rounded transition-colors border border-zinc-700">
                       <RefreshCw className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </section>

                <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                  <div className="flex flex-col gap-4 min-h-0">
                    <div className="bg-[#0a0a0a] border border-[#222] rounded-lg p-5 flex flex-col h-full overflow-hidden">
                      <SectionHeading icon={Eye} title="Visual Analysis Report" />
                      <div className="flex-1 overflow-y-auto no-scrollbar pr-2 leading-loose text-zinc-400 text-[11px] space-y-4">
                        {result.visualAnalysis.split('\n').filter(l => l.trim()).map((line, i) => <p key={i}>{line}</p>)}
                      </div>
                      <div className="mt-6 p-4 bg-zinc-950 border border-zinc-900 rounded flex flex-col gap-2 flex-shrink-0">
                         <div className="text-[10px] text-zinc-500 tracking-widest uppercase font-bold">Artistic Direction</div>
                         <div className="text-[12px] italic text-blue-100">{result.styleExplanation}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 min-h-0">
                    <PromptBox title="English Master Prompt" content={result.englishMasterPrompt} />
                  </div>
                </div>

                <footer className="h-16 flex items-center justify-between gap-6 flex-shrink-0 border-t border-[#222] pt-6">
                  <div className="flex gap-3">
                    <button onClick={() => {
                        const content = `ENG: ${result.englishMasterPrompt}\n\nARB: ${result.arabicMasterPrompt}\n\nDIR: ${result.artisticDirection}`;
                        const blob = new Blob([content], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "prompts.txt";
                        a.click();
                    }} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">Export All Prompts</button>
                    <div className="flex gap-1">
                      {["Cinematic", "Noir", "Realistic"].map(s => (
                        <button key={s} onClick={() => runAnalysis(s)} className="px-3 py-2 bg-zinc-800 text-zinc-400 text-[9px] font-bold uppercase tracking-tighter rounded hover:bg-zinc-700 border border-zinc-700 transition-colors">{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-1 justify-end max-w-lg">
                    <div className="text-right rtl flex-1 overflow-hidden">
                      <span className="text-zinc-200 text-[10px] block font-bold mb-1 tracking-widest uppercase">🇸🇦 Master Arabic</span>
                      <p className="text-[11px] text-zinc-500 leading-tight truncate">{result.arabicMasterPrompt}</p>
                    </div>
                    <div onClick={() => {
                       navigator.clipboard.writeText(result.arabicMasterPrompt);
                       alert("Arabic Prompt Copied");
                    }} className="w-10 h-10 border border-zinc-800 rounded bg-[#0a0a0a] hover:bg-zinc-900 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors flex-shrink-0">
                      <Copy className="w-5 h-5" />
                    </div>
                  </div>
                </footer>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
