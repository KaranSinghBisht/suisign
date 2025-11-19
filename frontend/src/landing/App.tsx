// frontend/src/landing/App.tsx
import React from "react";
import { Navbar } from "./Components/Navbar";
import { Hero } from "./Components/Hero";
import { Features } from "./Components/Features";
import { HowItWorks } from "./Components/HowItWorks";
import { SecuritySection } from "./Components/SecuritySection";
import { TeamSection } from "./Components/TeamSection";
import { Footer } from "./Components/Footer";
import { NoiseOverlay } from "./Components/NoiseOverlay";

const LandingApp: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-black via-transparent to-[#020617]" />
      <NoiseOverlay />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Features />
        <HowItWorks />
        <SecuritySection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingApp;
