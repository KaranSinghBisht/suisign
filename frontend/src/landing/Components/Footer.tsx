// frontend/src/landing/Components/Footer.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Github, Twitter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  return (
    <footer className="relative pt-24 pb-12 border-t border-white/5 bg-background">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-display font-bold text-white mb-8 tracking-tight">
            Ready to sign?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-xl mx-auto">
            Built for DAOs and teams who want their agreements fully on-chain.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => navigate("/app")}
              className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-full font-bold hover:bg-blue-600 transition-all hover:scale-105 shadow-[0_0_40px_rgba(59,130,246,0.4)]"
            >
              Launch SuiSign
            </button>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-white/5 gap-6">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-white">SuiSign</span>
            <span className="text-slate-600">© 2025</span>
          </div>
          
          <div className="flex gap-6 text-slate-500">
            <a
              href="https://x.com/Karan_Bisht09"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              <Twitter size={20} />
            </a>
            <a
              href="https://github.com/KaranSinghBisht/suisign"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              <Github size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
