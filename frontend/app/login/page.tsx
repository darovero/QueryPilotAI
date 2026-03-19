"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center relative overflow-hidden font-sans text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Subtle Background Grid (Light Theme) */}
      <div 
        className="absolute inset-0 pointer-events-none z-0" 
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1.2 1.2 A 1.2 1.2 0 1 1 1.2 1.1\' fill=\'%23e4e4e7\' fill-opacity=\'1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200 p-8 flex flex-col items-center">
        
        {/* Provisional Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 p-[2px] mb-8 shadow-sm">
           <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-inner"></div>
           </div>
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 mb-2">Welcome to QueryPilot</h1>
        <p className="text-[14px] text-zinc-500 font-medium mb-10">Login/Signup to your account</p>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3 mb-10">
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 text-white transition-all py-3 px-4 rounded-xl text-[14px] font-medium shadow-sm active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11erty-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"></path>
            </svg>
            Continue with GitHub
          </button>

          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 text-zinc-700 transition-all border border-zinc-200 py-3 px-4 rounded-xl text-[14px] font-medium shadow-sm active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Footer Links */}
        <p className="text-[12px] text-zinc-400 text-center leading-relaxed">
          Read our <Link href="#" className="underline hover:text-zinc-700 transition-colors">Privacy Policy</Link> and <Link href="#" className="underline hover:text-zinc-700 transition-colors">Terms of Service</Link>
        </p>
      </div>

      {/* Floating Action Button (Chat) */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-zinc-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 group">
        <span className="material-symbols-outlined text-[24px] text-zinc-700 group-hover:text-zinc-900">chat_bubble</span>
      </button>

    </div>
  );
}
