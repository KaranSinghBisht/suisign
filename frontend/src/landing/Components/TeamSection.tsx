import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Filter, Bell, Search } from 'lucide-react';

export const TeamSection: React.FC = () => {
  return (
    <section id="teams" className="py-24 overflow-hidden bg-gradient-to-b from-transparent to-black/20">
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
        
        {/* Text Content */}
        <div className="order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-accent font-mono text-sm mb-4 tracking-widest uppercase flex items-center gap-2">
              <span className="w-8 h-[1px] bg-accent" />
              For DAOs & Teams
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">Built for decentralized teams.</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Manage multisig agreements, track document status in real-time, and keep your organization compliant without centralized reliance.
            </p>

            <ul className="space-y-6">
              {[
                "Gmail-style inbox to track pending and completed agreements",
                "Wallet-based identities with SuiNS support for signers",
                "Seal-gated decryption so only listed wallets can view contents",
                "On-chain proofs on Sui backed by Walrus encrypted storage"
              ].map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 text-slate-300 group"
                >
                  <div className="p-1 rounded-full bg-success/10 text-success mt-0.5 group-hover:bg-success/20 transition-colors">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="group-hover:text-white transition-colors">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Visual Content */}
        <div className="order-1 lg:order-2 relative">
          <motion.div 
             initial={{ opacity: 0, scale: 0.95, rotateY: 5 }}
             whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
             transition={{ duration: 0.8 }}
             className="bg-[#0f172a] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative z-10"
          >
            {/* Mock Toolbar */}
            <div className="h-14 border-b border-white/5 bg-white/[0.02] flex items-center px-4 justify-between">
              <div className="flex gap-1">
                 <div className="px-3 py-1.5 bg-white/5 rounded text-sm text-white font-medium">Active</div>
                 <div className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">Archived</div>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <Search size={16} className="hover:text-white cursor-pointer transition-colors" />
                <Filter size={16} className="hover:text-white cursor-pointer transition-colors" />
                <div className="w-[1px] h-4 bg-white/10" />
                <Bell size={16} className="hover:text-white cursor-pointer transition-colors" />
              </div>
            </div>

            {/* Activity Feed Mock */}
            <div className="divide-y divide-white/5">
              {[
                { action: "signed", user: "alex.sui", doc: "Advisor Agreement", time: "2m ago", avatar: "bg-gradient-to-br from-purple-500 to-indigo-500" },
                { action: "created", user: "dao_admin", doc: "Treasury Proposal #42", time: "15m ago", avatar: "bg-gradient-to-br from-blue-500 to-cyan-500" },
                { action: "signed", user: "0x7d...91a", doc: "Treasury Proposal #42", time: "18m ago", avatar: "bg-gradient-to-br from-emerald-500 to-green-500" },
                { action: "rejected", user: "legal.sui", doc: "Partnership Draft v1", time: "1h ago", avatar: "bg-gradient-to-br from-orange-500 to-red-500" }
              ].map((item, i) => (
                <motion.div 
                  key={i} 
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}
                  className="p-4 flex items-center gap-4 group cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-full ${item.avatar} flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-black`}>
                     {item.user[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-300 truncate">
                      <span className="font-semibold text-white hover:text-accent transition-colors">{item.user}</span> {item.action}
                    </p>
                    <p className="text-xs text-slate-500 italic truncate">{item.doc}</p>
                  </div>
                  <div className="text-xs text-slate-600 font-mono whitespace-nowrap">{item.time}</div>
                </motion.div>
              ))}
            </div>
            
            {/* Bottom Bar */}
            <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
               <span className="text-xs text-slate-500 hover:text-accent cursor-pointer transition-colors">View all activity →</span>
            </div>
          </motion.div>
          
          {/* Decor */}
          <div className="absolute -z-10 top-10 -right-10 w-40 h-40 bg-blue-600/20 blur-[80px] rounded-full animate-pulse" />
          <div className="absolute -z-10 bottom-10 -left-10 w-40 h-40 bg-accent/10 blur-[80px] rounded-full" />
        </div>
      </div>
    </section>
  );
};
