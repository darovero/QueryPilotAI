'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  userName: string;
  onComplete: (orgData: { name: string; industry: string }) => void;
}

export function OnboardingFlow({ userName, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    if (!orgName.trim()) {
      toast.error("Please enter a workspace name.");
      return;
    }
    setIsSubmitting(true);
    // The parent (UnifiedChat) will handle the fetchWithAuth call
    onComplete({ name: orgName, industry });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full">
        {/* Step Indicator */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-zinc-900' : 'bg-zinc-100'}`} 
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-8 shadow-xl">
              <span className="material-symbols-outlined text-white text-[32px]">auto_awesome</span>
            </div>
            <h1 className="text-4xl font-bold text-zinc-900 tracking-tight leading-tight">
              Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-600 to-zinc-900">InsightForge AI</span>
            </h1>
            <p className="text-zinc-500 mt-6 text-lg leading-relaxed">
              Hey {userName.split(' ')[0]}, we're excited to have you here. Let's set up your secure analytics workspace in just a few steps.
            </p>
            <button 
              onClick={handleNext}
              className="mt-10 w-full bg-zinc-900 text-white font-semibold py-4 rounded-2xl hover:bg-zinc-800 transition-all shadow-lg hover:shadow-zinc-200 flex items-center justify-center gap-2 group"
            >
              Get Started
              <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 2: Workspace Creation */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Create your Workspace</h2>
            <p className="text-zinc-500 mt-3 text-[15px]">This is where your databases and insights will live.</p>
            
            <div className="mt-10 space-y-6">
              <div>
                <label className="block text-[13px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="e.g. Acme Corp Analytics"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-zinc-700 uppercase tracking-wider mb-2">Industry (Optional)</label>
                <select 
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all appearance-none"
                >
                  <option value="">Select an industry...</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Retail">Retail</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="SaaS">SaaS</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={handleBack}
                className="flex-1 bg-white border border-zinc-200 text-zinc-600 font-semibold py-4 rounded-2xl hover:bg-zinc-50 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!orgName.trim()}
                className="flex-[2] bg-zinc-900 text-white font-semibold py-4 rounded-2xl hover:bg-zinc-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600">
               <span className="material-symbols-outlined text-[40px]">check_circle</span>
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Ready to Forge?</h2>
            <p className="text-zinc-500 mt-4 text-lg">
              Your workspace <strong>{orgName}</strong> is ready. You can now connect your first database and start generating insights.
            </p>

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-10 w-full bg-zinc-900 text-white font-semibold py-4 rounded-2xl hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Enter Dashboard
                  <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                </>
              )}
            </button>
            <p className="mt-6 text-zinc-400 text-[12px]">
              By entering, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
