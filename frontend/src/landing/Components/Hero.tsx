// frontend/src/landing/Components/Hero.tsx
import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, FileCheck, ShieldCheck, Clock, MoreHorizontal, Wallet, Check } from 'lucide-react';
import { ShinyButton } from './ShinyButton';
import { TextReveal } from './TextReveal';
import { useNavigate } from 'react-router-dom';

export const Hero: React.FC = () => {
  // 3D Tilt Logic
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);
  const navigate = useNavigate();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden perspective-2000">
      
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Column: Copy */}
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8 hover:bg-white/10 transition-colors cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span className="text-xs font-medium text-slate-300 tracking-wide uppercase">Live on Testnet</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] mb-8">
              <TextReveal text="Sign serious agreements," />
              <TextReveal
                text="on-chain."
                delay={0.5}
                wordClassName="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-300 drop-shadow-lg"
              />
            </h1>
            
            <p className="text-lg text-slate-400 mb-10 max-w-xl leading-relaxed">
              The standard for Web3 agreements. Upload documents, verify identities with wallet signatures and SuiNS names, and store encrypted proofs on Sui + Walrus with keys gated by Mysten&apos;s Seal.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => navigate("/app")}
                className="px-8 py-3.5 bg-primary hover:bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 group"
              >
                <Wallet size={18} className="group-hover:rotate-12 transition-transform" />
                Launch App
              </button>
              
              <ShinyButton
                type="button"
                onClick={() => {
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                How it works
                <ArrowRight size={18} />
              </ShinyButton>
            </div>
          </motion.div>
        </div>

        {/* Right Column: UI Mockup with 3D Tilt */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ perspective: 1000 }}
          className="relative z-20"
        >
          <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
            }}
            className="relative group"
          >
             {/* Glowing Backing */}
             <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-accent/30 rounded-[2rem] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-500" />

            {/* Main Card */}
            <div className="relative bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Window Header */}
              <div className="h-12 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="ml-auto px-3 py-1 rounded-full bg-black/30 text-[10px] text-slate-500 font-mono border border-white/5">
                  https://suisign-app.vercel.app/dashboard
                </div>
              </div>

              {/* App Body */}
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Welcome back</div>
                    <div className="text-xl font-semibold text-white flex items-center gap-2">
                      0x4a...89b2
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white tracking-tight">3</div>
                    <div className="text-xs text-slate-400">Action Items</div>
                  </div>
                </div>

                {/* List Items */}
                <div className="space-y-3">
                  {/* Item 1: Active */}
                  <motion.div 
                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
                    className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 cursor-pointer group transition-all"
                  >
                    <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                      <FileCheck size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white group-hover:text-accent transition-colors">SAFT Series A.pdf</h4>
                      <p className="text-xs text-slate-400">Awaiting 2 signers</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-1 rounded text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                        PENDING
                      </span>
                    </div>
                  </motion.div>

                  {/* Item 2: Completed */}
                  <motion.div 
                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                    className="p-4 rounded-xl bg-transparent border border-white/5 flex items-center gap-4 cursor-pointer opacity-60 hover:opacity-100 transition-all"
                  >
                    <div className="p-2.5 rounded-lg bg-green-500/10 text-green-400">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-200">NDA - Contractor.pdf</h4>
                      <p className="text-xs text-slate-400">Executed 2h ago</p>
                    </div>
                    <div className="text-right">
                       <span className="px-2 py-1 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        ON-CHAIN
                      </span>
                    </div>
                  </motion.div>

                   {/* Item 3: Waiting */}
                   <motion.div 
                    whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
                    className="p-4 rounded-xl bg-transparent border border-white/5 flex items-center gap-4 cursor-pointer opacity-60 hover:opacity-100 transition-all"
                  >
                    <div className="p-2.5 rounded-lg bg-slate-500/10 text-slate-400">
                      <Clock size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-200">Audit Report Q3.pdf</h4>
                      <p className="text-xs text-slate-400">Waiting for you</p>
                    </div>
                     <div className="text-right">
                       <div className="p-1 hover:bg-white/10 rounded text-slate-400 transition-colors">
                         <MoreHorizontal size={16} />
                       </div>
                    </div>
                  </motion.div>
                </div>

                {/* Floating "Signed" Badge Simulation */}
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
                  className="absolute bottom-8 right-[-20px] bg-surface/95 backdrop-blur-xl border border-green-500/30 p-4 rounded-xl shadow-2xl flex items-center gap-4 z-30 translate-z-12"
                  style={{ transform: "translateZ(40px)" }}
                >
                  <div className="bg-green-500 rounded-full p-1.5 text-black shadow-[0_0_10px_rgba(34,197,94,0.6)]">
                     <Check size={16} strokeWidth={3} />
                  </div>
                  <div>
                     <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Transaction Success</div>
                     <div className="text-xs font-mono text-green-400">0x8a...f29c</div>
                  </div>
                </motion.div>

              </div>
            </div>
          </motion.div>
        </motion.div>

      </div>
    </section>
  );
};
