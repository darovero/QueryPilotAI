import { useState } from "react";

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

  const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
  const handleFinish = () => handleOnboardingComplete(workspace);

  const toggleUseCase = (useCase: string) => {
      setUseCases(prev => prev.includes(useCase) ? prev.filter(c => c !== useCase) : [...prev, useCase]);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-6 relative">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100">
            <div 
               className="h-full bg-zinc-900 transition-all duration-500 ease-out"
               style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
        </div>

        <div className="w-full max-w-lg space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
           
           {/* STEP 1: WELCOME & PROFILE */}
           {step === 1 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <div className="w-14 h-14 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center mb-6">
                       <span className="material-symbols-outlined text-[28px] text-zinc-900">waving_hand</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Welcome to QueryPilotAI</h1>
                    <p className="text-[15px] font-medium text-zinc-500">Let's set up your account in less than a minute.</p>
                 </div>
                 <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Your Name</label>
                       <input 
                         type="text" 
                         value={profile.name}
                         onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                         placeholder="Jane Doe"
                         className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-[14px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Your Role</label>
                       <select 
                         value={profile.role}
                         onChange={e => setProfile(prev => ({ ...prev, role: e.target.value }))}
                         className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-[14px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors appearance-none"
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
                       className="w-full bg-zinc-900 text-white font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                       Continue
                    </button>
                    <div className="text-center text-[12px] font-semibold text-zinc-400">Step 1 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 2: WORKSPACE SETUP */}
           {step === 2 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Create your workspace</h1>
                    <p className="text-[15px] font-medium text-zinc-500">This is where you and your team will connect databases.</p>
                 </div>
                 <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Workspace Name</label>
                       <input 
                         type="text" 
                         value={workspace.name}
                         onChange={e => setWorkspace(prev => ({ ...prev, name: e.target.value }))}
                         placeholder="e.g. Acme Corp"
                         className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-[14px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-zinc-500 uppercase tracking-widest">Industry</label>
                       <select 
                         value={workspace.industry}
                         onChange={e => setWorkspace(prev => ({ ...prev, industry: e.target.value }))}
                         className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3.5 text-[14px] text-zinc-900 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors appearance-none">
                           <option value="Technology">Technology</option>
                           <option value="Finance">Finance & Banking</option>
                           <option value="Healthcare">Healthcare</option>
                           <option value="Retail">Retail & E-commerce</option>
                           <option value="Manufacturing">Manufacturing</option>
                           <option value="Other">Other</option>
                       </select>
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-zinc-50 border border-zinc-200 text-zinc-700 font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-100 transition-colors">Back</button>
                       <button onClick={handleNext} disabled={!workspace.name.trim()} className="w-2/3 bg-zinc-900 text-white font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-zinc-400">Step 2 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 3: USE CASES */}
           {step === 3 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">What's your primary goal?</h1>
                    <p className="text-[15px] font-medium text-zinc-500">Select all that apply. We'll tailor your experience.</p>
                 </div>
                 <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6">
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
                             className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${useCases.includes(useCase) ? 'border-zinc-900 bg-zinc-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'}`}
                           >
                               <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${useCases.includes(useCase) ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white'}`}>
                                   {useCases.includes(useCase) && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                               </div>
                               <span className="text-[14px] font-medium">{useCase}</span>
                           </button>
                       ))}
                    </div>
                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-zinc-50 border border-zinc-200 text-zinc-700 font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-100 transition-colors">Back</button>
                       <button onClick={handleNext} disabled={useCases.length === 0} className="w-2/3 bg-zinc-900 text-white font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-zinc-400">Step 3 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 4: TERMS & PRIVACY */}
           {step === 4 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Privacy & Terms</h1>
                    <p className="text-[15px] font-medium text-zinc-500">Please review our policies before continuing.</p>
                 </div>
                 <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-8">
                    
                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <div className="pt-1">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${acceptedTerms ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white group-hover:border-zinc-400'}`}>
                                {acceptedTerms && <span className="material-symbols-outlined text-[14px] font-bold">check</span>}
                            </div>
                        </div>
                        <input type="checkbox" className="hidden" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
                        <div>
                            <div className="text-[14px] text-zinc-900 font-medium">I agree to the Terms of Service</div>
                            <div className="text-[13px] text-zinc-500 leading-relaxed mt-1">I have read and agree to the <a href="#" className="underline hover:text-zinc-900">Terms of Service</a> and <a href="#" className="underline hover:text-zinc-900">Privacy Policy</a> governing the use of QueryPilotAI.</div>
                        </div>
                    </label>

                    <hr className="border-zinc-100" />

                    {/* Toggles */}
                    <div className="space-y-6">
                        <h3 className="text-[13px] font-bold text-zinc-900 uppercase tracking-widest">Data & Privacy Settings</h3>
                        
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[14px] text-zinc-900 font-medium">Telemetry & Telemetry Data</div>
                                <div className="text-[13px] text-zinc-500">Allow us to monitor crash reports and feature usage to improve the app.</div>
                            </div>
                            <button 
                                onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${analyticsEnabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${analyticsEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-[14px] text-zinc-900 font-medium">Marketing Communications</div>
                                <div className="text-[13px] text-zinc-500">Receive news, feature updates, and best practices occasionally.</div>
                            </div>
                            <button 
                                onClick={() => setMarketingEnabled(!marketingEnabled)}
                                className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${marketingEnabled ? 'bg-zinc-900' : 'bg-zinc-200'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${marketingEnabled ? 'left-6' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                       <button onClick={handleBack} className="w-1/3 bg-zinc-50 border border-zinc-200 text-zinc-700 font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-100 transition-colors">Back</button>
                       <button onClick={handleNext} disabled={!acceptedTerms} className="w-2/3 bg-zinc-900 text-white font-semibold rounded-xl py-3.5 text-[14px] hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                    </div>
                    <div className="text-center text-[12px] font-semibold text-zinc-400">Step 4 of 5</div>
                 </div>
             </div>
           )}

           {/* STEP 5: CONNECT DB (OPTIONAL) */}
           {step === 5 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                 <div className="space-y-3">
                    <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl mx-auto flex items-center justify-center mb-6">
                       <span className="material-symbols-outlined text-[28px] text-emerald-600">database</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-zinc-900 text-center">Connect your database</h1>
                    <p className="text-[15px] font-medium text-zinc-500 text-center">You're all set! Add a data source now or skip for later.</p>
                 </div>
                 <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm space-y-6 text-center">
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 flex flex-col items-center justify-center gap-2">
                           <img src="/assets/iconos sql/DeviconAzuresqldatabase.svg" className="w-8 h-8 opacity-70" alt="Azure" />
                           <span className="text-[12px] font-bold text-zinc-600">Azure SQL</span>
                        </div>
                        <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 flex flex-col items-center justify-center gap-2">
                           <img src="/assets/iconos sql/DeviconPostgresqlWordmark.svg" className="w-8 h-8 opacity-70" alt="Postgres" />
                           <span className="text-[12px] font-bold text-zinc-600">PostgreSQL</span>
                        </div>
                    </div>

                    <button 
                       onClick={handleFinish}
                       disabled={isAddingWorkspace}
                       className="w-full bg-zinc-900 text-white font-bold rounded-xl py-4 text-[14px] hover:bg-zinc-800 transition-all shadow-md active:scale-95 disabled:opacity-50">
                       {isAddingWorkspace ? 'Creating Workspace...' : 'Skip and go to Dashboard'}
                    </button>
                    
                    <p className="text-[13px] text-zinc-500 font-medium pt-2">
                        You can add connections anytime from the sidebar.
                    </p>
                 </div>
             </div>
           )}

        </div>
    </div>
  );
}
