import React, { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X } from "lucide-react";
import { ShinyButton } from "./ShinyButton";
import { useNavigate } from "react-router-dom";
import Logo from "../../assets/Logo.png";

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  const navLinks = [
    { name: "How it works", href: "#how-it-works" },
    { name: "Features", href: "#features" },
    { name: "For Teams", href: "#teams" },
    { name: "Security", href: "#security" },
  ];

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 border-b ${
        isScrolled
          ? "bg-background/70 backdrop-blur-xl border-white/5 py-4 shadow-lg"
          : "bg-transparent border-transparent py-6"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group">
          <img
            src={Logo}
            alt="SuiSign logo"
            className="w-9 h-9 rounded-xl object-contain group-hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-all duration-300 group-hover:scale-105"
          />
          <span className="text-xl font-display font-bold tracking-tight text-white">
            Sui<span className="text-accent">Sign</span>
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-accent transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <ShinyButton
              type="button"
              onClick={() => navigate("/app")}
              className="!px-6 !py-2 !text-sm"
            >
              Launch App
            </ShinyButton>
          </div>

          <button
            className="md:hidden text-slate-300 hover:text-white"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-background/95 backdrop-blur-xl border-b border-white/5 overflow-hidden"
        >
          <div className="flex flex-col p-6 gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-lg font-medium text-slate-300 hover:text-accent"
                onClick={() => setIsMobileOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <button
              type="button"
              className="mt-4 w-full px-5 py-3 text-center font-bold text-background bg-accent rounded-lg"
              onClick={() => {
                setIsMobileOpen(false);
                navigate("/app");
              }}
            >
              Launch App
            </button>
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};
