import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../lib/authConfig';
import Link from 'next/link';

interface LandingPageProps {
    onShowLegal: (doc: 'privacy' | 'terms') => void;
}

export function LandingPage({ onShowLegal }: LandingPageProps) {
    const { instance } = useMsal();

    const handleLogin = () => {
        void instance.loginRedirect(loginRequest);
    };

    return (
        <div className="text-on-background bg-background min-h-screen font-sans selection:bg-primary selection:text-on-primary">
            {/* TopNavBar */}
            <nav className="fixed top-0 w-full flex justify-between items-center px-8 py-4 max-w-7xl mx-auto left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-md z-50 border-b border-surface-variant">
                <Link href="/" className="text-xl font-bold tracking-tight text-on-background">InsightForge AI</Link>
                <div className="hidden md:flex items-center space-x-8">
                    <Link className="text-on-surface-variant hover:text-primary transition-all duration-300 font-medium" href="/docs">Docs</Link>
                    <div className="flex items-center space-x-4">
                        <button onClick={handleLogin} className="text-on-surface-variant hover:text-primary transition-all duration-300 font-medium">Login</button>
                        <button onClick={handleLogin} className="bg-primary text-on-primary px-6 py-2 rounded-full font-semibold hover:bg-primary-fixed transition-transform active:scale-95">Try for free</button>
                    </div>
                </div>
                {/* Mobile Menu Placeholder */}
                <div className="md:hidden">
                    <span className="material-symbols-outlined text-on-background">menu</span>
                </div>
            </nav>

            <main className="relative pt-32">
                <style>{`
                    @keyframes space-mosaic {
                        0% { background-position: 0 0; }
                        100% { background-position: 40px 40px; }
                    }
                    .bg-space-mosaic {
                        background-image: 
                            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                        background-size: 40px 40px;
                        animation: space-mosaic 4s linear infinite;
                    }
                `}</style>
                {/* Animated tech grid background */}
                <div className="absolute inset-0 bg-space-mosaic pointer-events-none z-0" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }}></div>
                <div className="absolute top-0 inset-x-0 h-[600px] pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 10%, rgba(0, 225, 171, 0.1) 0%, transparent 60%)' }}></div>

                {/* Hero Section */}
                <section className="max-w-5xl mx-auto px-6 text-center pb-32 relative z-10">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-on-background mb-8 leading-[1.1] font-display">
                        Where Questions Become <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">Trusted Insights</span>
                    </h1>
                    <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-16 leading-relaxed">
                        Ask your data anything. InsightForge understands your business using semantic models and ontology, then generates SQL, charts, and insights instantly.
                    </p>
                    {/* Chat Style Input */}
                    <div className="max-w-2xl mx-auto mb-12 relative">
                        <div className="bg-surface border border-outline-variant shadow-2xl rounded-full p-2 flex items-center">
                            <span className="material-symbols-outlined ml-6 text-primary">auto_awesome</span>
                            <div className="flex-grow text-left px-4 text-on-surface-variant font-medium">
                                Show fraud rate by country this month
                            </div>
                            <button onClick={handleLogin} className="bg-primary text-on-primary h-12 px-8 rounded-full font-bold shadow-lg hover:bg-primary-fixed transition-all active:scale-95">
                                Ask AI
                            </button>
                        </div>
                    </div>
                </section>

                {/* Problem/Solution Section */}
                <section className="py-32 bg-surface-container-low border-y border-surface-variant overflow-hidden">
                    <div className="max-w-7xl mx-auto px-8 grid md:grid-cols-2 gap-24 items-center">
                        <div>
                            <span className="text-sm uppercase tracking-widest text-primary font-bold mb-4 block">The Friction</span>
                            <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight text-on-background font-display">
                                Legacy data stacks are <span className="opacity-40">silent killers</span> of speed.
                            </h2>
                            <p className="text-on-surface-variant text-lg leading-relaxed mb-8">
                                Traditional tools wait for humans to map schemas. Questions rot in queues. Decisions are made on gut feeling while your warehouse sits idle.
                            </p>
                        </div>
                        <div className="relative">
                            <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full"></div>
                            <div className="relative bg-surface p-10 rounded-[2rem] border border-surface-variant">
                                <span className="text-sm uppercase tracking-widest text-tertiary font-bold mb-4 block">The Evolution</span>
                                <h3 className="text-3xl font-bold mb-6 text-on-background font-display">Semantic Understanding</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    InsightForge doesn't just read tables; it learns your business logic. It understands that "Churn" is a behavior, not just a column, enabling true natural language reasoning.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Key Features Section */}
                <section className="py-32 bg-background">
                    <div className="max-w-7xl mx-auto px-8">
                        <div className="grid md:grid-cols-3 gap-12">
                            {/* Feature 1 */}
                            <div className="group">
                                <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center mb-8 border border-outline-variant group-hover:border-primary transition-colors">
                                    <span className="material-symbols-outlined text-primary text-3xl">terminal</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-on-background font-display">Natural Language to SQL</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    No more syntax errors. Convert complex natural language queries into optimized, safe SQL statements in milliseconds.
                                </p>
                            </div>
                            {/* Feature 2 */}
                            <div className="group">
                                <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center mb-8 border border-outline-variant group-hover:border-primary transition-colors">
                                    <span className="material-symbols-outlined text-primary text-3xl">layers</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-on-background font-display">Semantic Layer</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    Automatically maps relationships between disparate tables, creating a unified truth that aligns with how you think.
                                </p>
                            </div>
                            {/* Feature 3 */}
                            <div className="group">
                                <div className="w-16 h-16 rounded-2xl bg-surface-variant flex items-center justify-center mb-8 border border-outline-variant group-hover:border-primary transition-colors">
                                    <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                                </div>
                                <h3 className="text-2xl font-bold mb-4 text-on-background font-display">Ontology-aware Insights</h3>
                                <p className="text-on-surface-variant leading-relaxed">
                                    Understands business meaning. When you ask for 'high value customers', it knows exactly what that means for your industry.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Visual Flow Section */}
                <section className="py-32 bg-surface-container-low border-y border-surface-variant relative overflow-hidden">
                    <div className="max-w-5xl mx-auto px-8 relative z-10">
                        <style>{`
                            @keyframes flow-slide {
                                0% { left: -20%; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { left: 100%; opacity: 0; }
                            }
                            @keyframes pulse-s1 { 0%, 20%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 5%, 15% { transform: scale(1.15); box-shadow: 0 0 25px rgba(0,225,171,0.6); z-index: 20; } }
                            @keyframes pulse-s2 { 0%, 25%, 55%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 35%, 45% { transform: scale(1.15); box-shadow: 0 0 30px rgba(0,225,171,0.9); z-index: 20; } }
                            @keyframes pulse-s3 { 0%, 55%, 85%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 65%, 75% { transform: scale(1.15); box-shadow: 0 0 25px rgba(0,225,171,0.6); z-index: 20; } }
                            @keyframes pulse-s4 { 0%, 85%, 100% { transform: scale(1); box-shadow: 0 0 0 transparent; } 92%, 98% { transform: scale(1.15); box-shadow: 0 0 30px rgba(123,208,255,0.8); z-index: 20; } }
                        `}</style>
                        <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-0">
                            {/* Animated Flow Line */}
                            <div className="absolute top-1/2 left-0 w-full h-[3px] -translate-y-1/2 overflow-hidden pointer-events-none hidden md:block z-0">
                                <div className="absolute h-full w-[25%] bg-gradient-to-r from-transparent via-primary to-transparent" style={{ animation: 'flow-slide 3.5s linear infinite' }}></div>
                            </div>

                            {/* Step 1 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-full bg-surface border border-outline flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s1 3.5s linear infinite' }}>
                                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">chat_bubble</span>
                                </div>
                                <span className="text-sm font-bold text-on-surface-variant">Question</span>
                            </div>
                            
                            <div className="hidden md:block flex-grow border-t-[3px] border-dashed border-outline-variant mx-6 z-0"></div>
                            
                            {/* Step 2 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s2 3.5s linear infinite' }}>
                                    <span className="material-symbols-outlined text-on-primary text-3xl relative z-10">schema</span>
                                </div>
                                <span className="text-sm font-bold text-primary">Semantic</span>
                            </div>
                            
                            <div className="hidden md:block flex-grow border-t-[3px] border-dashed border-outline-variant mx-6 z-0"></div>
                            
                            {/* Step 3 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-full bg-surface border border-outline flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s3 3.5s linear infinite' }}>
                                    <span className="material-symbols-outlined text-on-surface-variant text-3xl">database</span>
                                </div>
                                <span className="text-sm font-bold text-on-surface-variant">SQL</span>
                            </div>
                            
                            <div className="hidden md:block flex-grow border-t-[3px] border-dashed border-outline-variant mx-6 z-0"></div>
                            
                            {/* Step 4 */}
                            <div className="flex flex-col items-center text-center z-10 group cursor-default">
                                <div className="w-20 h-20 rounded-full bg-tertiary flex items-center justify-center mb-4 transition-all duration-300 relative" style={{ animation: 'pulse-s4 3.5s linear infinite' }}>
                                    <span className="material-symbols-outlined text-on-tertiary text-3xl relative z-10">lightbulb</span>
                                </div>
                                <span className="text-sm font-bold text-tertiary">Insight</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-40">
                    <div className="max-w-4xl mx-auto px-8 text-center bg-surface-container-highest border border-surface-variant rounded-[3rem] py-24 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/20 blur-[100px] rounded-full"></div>
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-8 text-on-background relative z-10 font-display">
                            Start exploring your data <br /> with real understanding
                        </h2>
                        <div className="relative z-10">
                            <button onClick={handleLogin} className="bg-primary text-on-primary px-12 py-5 rounded-full font-bold text-xl hover:bg-primary-fixed transition-all hover:scale-105">
                                Try for free
                            </button>
                            <p className="mt-6 text-on-surface-variant font-medium">No credit card required. Setup in minutes.</p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto bg-background border-t border-surface-variant">
                <div className="mb-8 md:mb-0">
                    <div className="text-lg font-bold text-on-background mb-2">InsightForge AI</div>
                    <p className="text-on-surface-variant text-sm">© {new Date().getFullYear()} InsightForge AI. All rights reserved.</p>
                </div>
                <div className="flex space-x-8">
                    <button type="button" onClick={() => onShowLegal('privacy')} className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium">Privacy Policy</button>
                    <button type="button" onClick={() => onShowLegal('terms')} className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium">Terms of Service</button>
                    <a className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium" href="#">Security</a>
                    <a className="text-on-surface-variant hover:text-primary transition-all text-sm font-medium" href="#">Status</a>
                </div>
            </footer>
        </div>
    );
}
