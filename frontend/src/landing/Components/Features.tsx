// frontend/src/landing/Components/Features.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Database, Zap, Fingerprint } from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

const features = [
  {
    icon: Lock,
    title: "End-to-End Encrypted",
    desc: "Documents are AES-GCM encrypted client-side before they ever leave your device. Only invited wallets can decrypt via Seal-gated keys."
  },
  {
    icon: Database,
    title: "Walrus Storage",
    desc: "Encrypted blobs are stored via Walrus, giving you decentralized, redundant storage for your agreements."
  },
  {
    icon: Fingerprint,
    title: "Wallet Identity",
    desc: "Forget emails. Sign with your Sui address or SuiNS name. Verification is mathematical, not just a click."
  },
  {
    icon: Zap,
    title: "Sui Speed",
    desc: "Finalize agreements in sub-seconds. Low gas fees mean you can sign everything on-chain without breaking the bank."
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-32 bg-background relative">
      {/* Radial Gradient Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-display font-bold text-white mb-6"
          >
            Why SuiSign?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl mx-auto text-lg"
          >
            Designed for the specific needs of decentralized organizations and high-stakes Web3 agreements.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <SpotlightCard className="h-full p-8 group hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300 border border-blue-500/10 group-hover:border-blue-500/30">
                  <feature.icon size={28} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-accent transition-colors">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
                  {feature.desc}
                </p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
