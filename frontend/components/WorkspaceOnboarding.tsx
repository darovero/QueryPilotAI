import { useState } from "react";

type LegalDocumentKey = 'privacy' | 'terms';

const legalDocuments: Record<LegalDocumentKey, { title: string; paragraphs: string[] }> = {
    privacy: {
        title: 'Política de Privacidad',
        paragraphs: [
            'InsightForge AI procesa unicamente la informacion necesaria para autenticarte, habilitar tu sesion corporativa y proteger el acceso a las capacidades analiticas del sistema.',
            'Los datos de identidad y telemetria operativa se utilizan para auditoria, trazabilidad, seguridad y soporte. No se comparten con terceros fuera de los servicios autorizados por tu organizacion.',
            'Puedes solicitar la revision o eliminacion de tus datos conforme a las politicas internas de gobierno y cumplimiento aplicables a tu tenant corporativo.'
        ]
    },
    terms: {
        title: 'Términos del Servicio',
        paragraphs: [
            'El acceso a InsightForge AI esta restringido a usuarios autorizados por la organizacion. Todo uso queda sujeto a monitoreo, controles de seguridad y registro de actividad.',
            'No debes cargar informacion sin autorizacion, intentar eludir controles de seguridad ni utilizar la plataforma para consultas o acciones fuera de las politicas corporativas.',
            'El servicio puede limitar o revocar el acceso cuando se detecten riesgos operativos, incumplimientos de seguridad o actividades incompatibles con el uso empresarial previsto.'
        ]
    }
};

interface WorkspaceOnboardingProps {
    handleOnboardingComplete: (data: { name: string; industry: string; }) => void;
    isAddingWorkspace: boolean;
}

export function WorkspaceOnboarding({ handleOnboardingComplete, isAddingWorkspace }: WorkspaceOnboardingProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  // Form State
  const [profile, setProfile] = useState({ name: '', role: '' });
  const [workspace, setWorkspace] = useState({ name: '', industry: 'Technology', teamSize: '1-10' });
  const [useCases, setUseCases] = useState<string[]>([]);
  
  // Terms & Privacy State
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [sqlValidation, setSqlValidation] = useState(true);
  const [dataMasking, setDataMasking] = useState(true);
  const [auditLogging, setAuditLogging] = useState(true);
  const [activeDocument, setActiveDocument] = useState<LegalDocumentKey | null>(null);

  const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
  const handleFinish = () => handleOnboardingComplete(workspace);

  const toggleUseCase = (useCase: string) => {
      setUseCases(prev => prev.includes(useCase) ? prev.filter(c => c !== useCase) : [...prev, useCase]);
  };

  return (
    <div className="min-h-screen w-full bg-transparent flex flex-col items-center justify-center p-6 relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-[#1a1a1a]">
            <div 
               className="h-full bg-[#a78bfa] transition-all duration-500 ease-out"
               style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
        </div>

        <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
           
           {/* STEP 1: WELCOME & PROFILE */}
           {step === 1 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <div className="w-14 h-14 bg-[#111111] border border-[#333333] rounded-none flex items-center justify-center mb-6">
                       <span className="material-symbols-outlined text-[28px] text-[#f4f0e6]">waving_hand</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">Welcome to InsightForge AI</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">Let's set up your account in less than a minute.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6">
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Company Name</label>
                       <input 
                         type="text" 
                         value={profile.name}
                         onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                         placeholder="e.g. Acme Corp"
                         className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Your Role</label>
                       <select 
                         value={profile.role}
                         onChange={e => setProfile(prev => ({ ...prev, role: e.target.value }))}
                         className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors appearance-none"
                       >
                           <option value="" disabled>Select your role...</option>
                           <option value="Data Analyst">Data Analyst / Scientist</option>
                           <option value="Software Engineer">Software Engineer</option>
                           <option value="Product Manager">Product Manager</option>
                           <option value="C-Level">Executive / Founder</option>
                           <option value="Other">Other</option>
                       </select>
                    </div>
                    <button 
                       onClick={handleNext}
                       disabled={!profile.name.trim() || !profile.role}
                       className="w-full bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                       Continue
                    </button>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 1 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 2: WORKSPACE SETUP */}
           {step === 2 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">Create your workspace</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">This is where you and your team will connect databases.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6">
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Workspace Name</label>
                       <input 
                         type="text" 
                         value={workspace.name}
                         onChange={e => setWorkspace(prev => ({ ...prev, name: e.target.value }))}
                         placeholder="e.g. Acme Corp"
                         className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-[#a3a3a3] uppercase tracking-widest">Industry</label>
                       <select 
                         value={workspace.industry}
                         onChange={e => setWorkspace(prev => ({ ...prev, industry: e.target.value }))}
                         className="w-full bg-[#111111] border border-[#333333] rounded-none px-4 py-3.5 text-[14px] text-[#f4f0e6] focus:outline-none focus:border-zinc-400 focus:bg-[#0a0a0a] transition-colors appearance-none">
                           <option value="Technology">Technology</option>
                           <option value="Finance">Finance & Banking</option>
                           <option value="Healthcare">Healthcare</option>
                           <option value="Retail">Retail & E-commerce</option>
                           <option value="Manufacturing">Manufacturing</option>
                           <option value="Other">Other</option>
                       </select>
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-[#111111] border border-[#333333] text-[#d1cdbd] font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#1a1a1a] transition-colors">Back</button>
                       <button onClick={handleNext} disabled={!workspace.name.trim()} className="w-2/3 bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 2 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 3: USE CASES */}
           {step === 3 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">What's your primary goal?</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">Select all that apply. We'll tailor your experience.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6">
                    <div className="space-y-3">
                       {[
                           "Generate SQL queries from natural language",
                           "Understand complex or legacy databases",
                           "Create quick analytics dashboards",
                           "Ad-hoc data search & exploration"
                       ].map(useCase => (
                           <button 
                             key={useCase}
                             onClick={() => toggleUseCase(useCase)}
                             className={`w-full text-left p-4 rounded-none border transition-all flex items-center gap-4 ${useCases.includes(useCase) ? 'border-zinc-900 bg-[#111111] text-[#f4f0e6]' : 'border-[#333333] bg-[#0a0a0a] text-[#b5b5b5] hover:border-zinc-300'}`}
                           >
                               <div className={`w-5 h-5 rounded-none flex items-center justify-center shrink-0 border ${useCases.includes(useCase) ? 'border-zinc-900 bg-[#a78bfa] text-black' : 'border-zinc-300 bg-[#0a0a0a]'}`}>
                                   {useCases.includes(useCase) && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                               </div>
                               <span className="text-[14px] font-medium">{useCase}</span>
                           </button>
                       ))}
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-[#111111] border border-[#333333] text-[#d1cdbd] font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#1a1a1a] transition-colors">Back</button>
                       <button onClick={handleNext} disabled={useCases.length === 0} className="w-2/3 bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 3 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 4: TERMS & PRIVACY */}
           {step === 4 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6]">Privacy & Terms</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3]">Please review our policies before continuing.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-8">
                    
                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="pt-1">
                            <div className={`w-5 h-5 rounded-none flex items-center justify-center border transition-colors ${acceptedTerms ? 'border-zinc-900 bg-[#a78bfa] text-black' : 'border-zinc-300 bg-[#0a0a0a] group-hover:border-zinc-400'}`}>
                                {acceptedTerms && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                            </div>
                        </div>
                        <input type="checkbox" className="hidden" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                        <div>
                            <div className="text-[14px] text-[#f4f0e6] font-medium">I agree to the Terms of Service</div>
                            <div className="text-[13px] text-[#a3a3a3] leading-relaxed mt-1">
                                I have read and agree to the <button type="button" onClick={(e) => { e.preventDefault(); setActiveDocument('terms'); }} className="underline hover:text-[#f4f0e6]">Terms of Service</button> and <button type="button" onClick={(e) => { e.preventDefault(); setActiveDocument('privacy'); }} className="underline hover:text-[#f4f0e6]">Privacy Policy</button> governing the use of InsightForge AI.
                            </div>
                        </div>
                    </label>

                    <hr className="border-[#222222]" />

                    {/* Toggles */}
                    <div className="space-y-4 pt-2">
                        <h3 className="text-[13px] font-bold text-[#f4f0e6] uppercase tracking-widest mb-4">Security & Compliance Settings</h3>
                        
                        {/* SQL Validation */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-slate-100 rounded-none flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#d1cdbd]">verified_user</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-[14px] font-bold text-[#f4f0e6]">SQL Validation</div>
                                <div className="text-[13px] text-[#a3a3a3] leading-snug">Automatically check generated SQL for syntax errors and security vulnerabilities.</div>
                            </div>
                            <button 
                                onClick={() => setSqlValidation(!sqlValidation)}
                                className={`w-12 h-7 rounded-none transition-colors relative shrink-0 ${sqlValidation ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-none bg-[#0a0a0a] shadow-sm absolute top-1 transition-transform ${sqlValidation ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Data Masking */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-slate-100 rounded-none flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#d1cdbd]">masks</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-[14px] font-bold text-[#f4f0e6]">Data Masking</div>
                                <div className="text-[13px] text-[#a3a3a3] leading-snug">Dynamically obfuscate sensitive data fields in query results based on user roles.</div>
                            </div>
                            <button 
                                onClick={() => setDataMasking(!dataMasking)}
                                className={`w-12 h-7 rounded-none transition-colors relative shrink-0 ${dataMasking ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-none bg-[#0a0a0a] shadow-sm absolute top-1 transition-transform ${dataMasking ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Audit Logging */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-black border border-slate-100 rounded-none flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#d1cdbd]">receipt_long</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-[14px] font-bold text-[#f4f0e6]">Audit Logging</div>
                                <div className="text-[13px] text-[#a3a3a3] leading-snug">Maintain a comprehensive record of all queries, access attempts, and configuration changes.</div>
                            </div>
                            <button 
                                onClick={() => setAuditLogging(!auditLogging)}
                                className={`w-12 h-7 rounded-none transition-colors relative shrink-0 ${auditLogging ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`w-5 h-5 rounded-none bg-[#0a0a0a] shadow-sm absolute top-1 transition-transform ${auditLogging ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <hr className="border-[#222222] my-4" />

                        <div className="flex items-center justify-between gap-4 pt-2">
                            <div>
                                <div className="text-[14px] text-[#f4f0e6] font-medium">Telemetry & Telemetry Data</div>
                                <div className="text-[13px] text-[#a3a3a3]">Allow us to monitor crash reports and feature usage to improve the app.</div>
                            </div>
                            <button 
                                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                                className={`w-11 h-6 rounded-none transition-colors relative shrink-0 ${analyticsEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                            >
                                <div className={`w-4 h-4 rounded-none bg-[#0a0a0a] absolute top-1 transition-transform ${analyticsEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[14px] text-[#f4f0e6] font-medium">Marketing Communications</div>
                                <div className="text-[13px] text-[#a3a3a3]">Receive news, feature updates, and best practices occasionally.</div>
                            </div>
                            <button 
                                onClick={() => setMarketingEnabled(!marketingEnabled)}
                                className={`w-11 h-6 rounded-none transition-colors relative shrink-0 ${marketingEnabled ? 'bg-slate-900' : 'bg-slate-200'}`}
                            >
                                <div className={`w-4 h-4 rounded-none bg-[#0a0a0a] absolute top-1 transition-transform ${marketingEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-[#111111] border border-[#333333] text-[#d1cdbd] font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#1a1a1a] transition-colors">Back</button>
                       <button onClick={handleNext} disabled={!acceptedTerms} className="w-2/3 bg-[#a78bfa] text-black font-semibold rounded-none py-3.5 text-[14px] hover:bg-[#8b5cf6] transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-[#8a8a8a]">Step 4 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 5: CONNECT DB (OPTIONAL) */}
           {step === 5 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-none mx-auto flex items-center justify-center mb-6">
                       <span className="material-symbols-outlined text-[28px] text-emerald-600">database</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#f4f0e6] text-center">Connect your database</h1>
                    <p className="text-[15px] font-medium text-[#a3a3a3] text-center">You're all set! Add a data source now or skip for later.</p>
                 </div>
                 <div className="bg-[#0a0a0a] border border-[#333333] rounded-none p-8 shadow-sm space-y-6 text-center">
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="border border-[#333333] rounded-none p-4 bg-[#111111] flex flex-col items-center justify-center gap-2">
                           <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-8 h-8 opacity-70" alt="Azure" />
                           <span className="text-[12px] font-bold text-[#b5b5b5]">Azure SQL</span>
                        </div>
                        <div className="border border-[#333333] rounded-none p-4 bg-[#111111] flex flex-col items-center justify-center gap-2">
                           <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-8 h-8 opacity-70" alt="Postgres" />
                           <span className="text-[12px] font-bold text-[#b5b5b5]">PostgreSQL</span>
                        </div>
                    </div>

                    <button 
                       onClick={handleFinish}
                       disabled={isAddingWorkspace}
                       className="w-full bg-[#a78bfa] text-black font-bold rounded-none py-4 text-[14px] hover:bg-[#8b5cf6] transition-all shadow-md active:scale-95 disabled:opacity-50">
                       {isAddingWorkspace ? 'Creating Workspace...' : 'Skip and go to Dashboard'}
                    </button>
                    
                    <p className="text-[13px] text-[#a3a3a3] font-medium pt-2">
                        You can add connections anytime from the sidebar.
                    </p>
                 </div>
             </div>
           )}

        </div>

        {activeDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 animate-in fade-in duration-200">
                <div className="w-full max-w-xl rounded-none border border-[#333333] bg-[#0a0a0a] p-7 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8a8a]">Legal Information</p>
                            <h2 className="mt-2 text-2xl font-bold text-[#f4f0e6]">{legalDocuments[activeDocument].title}</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveDocument(null)}
                            className="rounded-none border border-[#333333] px-3 py-1.5 text-sm text-[#b5b5b5] transition-colors hover:bg-[#1a1a1a] hover:text-[#f4f0e6]"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-6 space-y-4 text-sm leading-6 text-[#b5b5b5]">
                        {legalDocuments[activeDocument].paragraphs.map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}
