import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Database, Brain, ArrowRight, CheckCircle, Lock, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export const Landing = () => {
  return (
    <div className="relative overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-36">
        
        {/* Floating gradient blobs - decorative - adjusted for light mode */}
        <div className="absolute top-20 left-[10%] w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-[96px] opacity-40 animate-float -z-10"></div>
        <div className="absolute top-40 right-[10%] w-72 h-72 bg-brand-300 rounded-full mix-blend-multiply filter blur-[96px] opacity-40 animate-float-delayed -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full glass border border-brand-200 text-brand-700 text-sm font-semibold mb-8 animate-fadeIn shadow-sm backdrop-blur-xl">
              <span className="flex h-2.5 w-2.5 rounded-full bg-brand-500 mr-2 animate-pulse"></span>
              Enterprise V2.0 Live on Sepolia Testnet
            </div>
            
            {/* Main Title - Dark Text for White Background */}
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 animate-slideUp leading-tight">
              Trust, Verified by <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 animate-gradient-xy bg-[length:200%_auto]">
                Blockchain & AI
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed animate-slideUp delay-100 max-w-2xl mx-auto font-light">
              The industry standard for real-time document verification. Secure assets on Ethereum and detect forgery with Gemini AI forensics.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-5 animate-slideUp delay-200">
              <Link to="/create" className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-brand-600 rounded-2xl hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-600 shadow-xl shadow-brand-200 hover:shadow-2xl hover:-translate-y-1 overflow-hidden">
                <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
                <span className="relative">Create New Document</span>
                <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent z-10"></div>
              </Link>
              
              <Link to="/verify" className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-slate-700 transition-all duration-200 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 shadow-lg hover:shadow-xl hover:-translate-y-1 backdrop-blur-sm bg-white/80">
                Verify Document
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section with Glassmorphism */}
      <div className="py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-dark rounded-3xl p-10 md:p-14 shadow-2xl border border-slate-700/50"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">10k+</div>
                <div className="text-slate-400 font-medium">Documents Secured</div>
              </div>
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">$0</div>
                <div className="text-slate-400 font-medium">Fraud Losses</div>
              </div>
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">99.9%</div>
                <div className="text-slate-400 font-medium">AI Accuracy</div>
              </div>
              <div className="p-4">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">2.4s</div>
                <div className="text-slate-400 font-medium">Avg Verification Time</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* How It Works */}
      <section className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 animate-fadeIn delay-300">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight">How It Works</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">Three simple steps to unbreakable trust. Powered by cryptography and intelligence.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: <Database className="h-8 w-8 text-white" />,
                bg: "bg-blue-500",
                title: "1. Register on Blockchain",
                desc: "Documents are hashed using SHA-256. The hash is anchored to the Ethereum blockchain, creating an immutable proof of existence.",
                delay: "delay-100"
              },
              {
                icon: <Brain className="h-8 w-8 text-white" />,
                bg: "bg-purple-500",
                title: "2. AI Analysis",
                desc: "Gemini AI scans the document structure and content for pixel manipulation, OCR inconsistencies, and forgery attempts.",
                delay: "delay-200"
              },
              {
                icon: <CheckCircle className="h-8 w-8 text-white" />,
                bg: "bg-emerald-500",
                title: "3. Instant Verification",
                desc: "Anyone can verify the document instantly via QR code or file upload. No login required. 100% trustless verification.",
                delay: "delay-300"
              }
            ].map((item, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.6, 
                  delay: idx * 0.15,
                  ease: [0.16, 1, 0.3, 1] 
                }}
                className="glass-panel p-8 rounded-3xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 group"
              >
                <div className={`${item.bg} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed text-lg">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass border-t border-slate-200 py-12 relative z-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-xl font-bold text-slate-900">TrustChain AI</span>
            <p className="text-sm text-slate-500 mt-1">Enterprise Blockchain Solutions &copy; 2024</p>
          </div>
          <div className="flex space-x-8 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-brand-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brand-600 transition-colors">Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
};