import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ShinyButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
}

export const ShinyButton: React.FC<ShinyButtonProps> = ({ children, className = "", ...props }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative rounded-lg px-8 py-3.5 font-medium text-slate-200 transition-colors overflow-hidden group ${className}`}
      {...props}
    >
      {/* Gradient Border Container */}
      <div className="absolute inset-0 -z-10 rounded-lg p-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover:opacity-100 blur-sm transition-opacity duration-500" />
      <div className="absolute inset-0 -z-10 rounded-lg p-[1px] bg-gradient-to-r from-white/10 via-white/30 to-white/10" />
      
      {/* Background */}
      <div className="absolute inset-[1px] -z-10 rounded-lg bg-surface/90 backdrop-blur-xl" />
      
      {/* Shine Effect */}
      <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12 translate-x-[-100%] group-hover:animate-shine transition-all" />

      <span className="relative flex items-center gap-2 z-10">{children}</span>
      
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .group:hover .group-hover\\:animate-shine {
          animation: shine 1.5s ease-in-out infinite;
        }
      `}</style>
    </motion.button>
  );
};