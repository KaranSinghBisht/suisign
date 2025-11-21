import React from 'react';
import { motion } from 'framer-motion';
import { Upload, Users, PenTool } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: "Upload Agreement",
    desc: "Drag & drop PDF or text contracts. We encrypt the document contents locally before upload.",
    icon: Upload
  },
  {
    id: 2,
    title: "Define Signers",
    desc: "Add signer wallet addresses or SuiNS names. Only those wallets can decrypt via Seal.",
    icon: Users
  },
  {
    id: 3,
    title: "Execute On-Chain",
    desc: "Signers connect wallets and sign. A final on-chain proof appears in your dashboard.",
    icon: PenTool
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 border-y border-white/5 bg-surface/30">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-display font-bold text-white">How it works</h2>
        </motion.div>

        <div className="relative grid md:grid-cols-3 gap-12">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-[2px] bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 z-0" />

          {steps.map((step, idx) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center text-white mb-6 relative group">
                <div className="absolute inset-0 bg-accent/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <step.icon size={28} className="relative z-10" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-mono font-bold text-slate-400">
                  {step.id}
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-slate-400 max-w-xs text-sm">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
