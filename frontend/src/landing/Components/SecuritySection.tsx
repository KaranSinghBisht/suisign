import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Code, Server } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="bg-[#050b1f] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden"
        >
          {/* Background Grid Effect */}
          <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-12">
            <div className="flex-1">
              <h3 className="text-2xl font-display font-bold text-white mb-6 flex items-center gap-3">
                <Shield className="text-success" size={24} />
                Trustless Architecture
              </h3>
              
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Code size={14} /> Client-Side Encryption
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Files are encrypted in your browser using AES-GCM before upload. We never see your unencrypted documents. Keys are distributed only to designated wallet addresses.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Server size={14} /> Decentralized Storage
                  </h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Encrypted blobs are stored via Walrus, ensuring high availability and redundancy without a central point of failure.
                  </p>
                </div>
              </div>
            </div>

            {/* Code/Terminal Visual */}
            <div className="flex-1 bg-black/50 rounded-xl border border-white/5 p-4 font-mono text-xs text-slate-400 overflow-hidden flex flex-col">
              <div className="flex gap-1.5 mb-4 opacity-50">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="space-y-2">
                <p><span className="text-blue-400">const</span> <span className="text-yellow-300">docHash</span> = <span className="text-green-400">await</span> crypto.subtle.digest(</p>
                <p className="pl-4">'SHA-256', fileBuffer</p>
                <p>);</p>
                <p className="text-slate-600">// Sign hash on Sui</p>
                <p><span className="text-blue-400">const</span> <span className="text-yellow-300">tx</span> = <span className="text-blue-400">new</span> TransactionBlock();</p>
                <p>tx.moveCall({'{'}</p>
                <p className="pl-4">target: <span className="text-green-300">'0x...::sign::attest'</span>,</p>
                <p className="pl-4">arguments: [docHash]</p>
                <p>{'}'});</p>
                <p className="animate-pulse text-accent mt-4">_ Cursor active...</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};