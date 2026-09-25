import React from 'react';
import { useNavigate } from 'react-router-dom';
import Spline from '@splinetool/react-spline';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartPulse, Camera, ScanEye, ArrowRight, Pill } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen bg-black overflow-x-hidden font-body text-bone">
      {/* SPLINE BACKGROUND (z-0) */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        <Spline scene="https://prod.spline.design/jDiXwEdyhrRjAJ14/scene.splinecode" />
      </div>

      {/* UI OVERLAYS (z-10) */}
      <div className="relative z-10 pointer-events-none flex flex-col min-h-screen">

        {/* Navbar */}
        <nav className="w-full flex justify-between items-center p-6 md:px-12 bg-gradient-to-b from-black/80 to-transparent">
          <div className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            NovaCare
          </div>
          <button
            onClick={() => navigate('/login')}
            className="pointer-events-auto px-6 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all font-medium"
          >
            Login
          </button>
        </nav>

        {/* 1. HERO SECTION */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-12 mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent">
                Guidance between
              </span>
              <br />
              the prescription and you.
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-light">
              NovaCare helps you use prescribed treatments and medical devices correctly, through
              guided, visual assistance — medication reminders, camera-verified technique, and
              step-by-step AR coaching.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pointer-events-auto">
              <button
                onClick={() => navigate('/workflow')}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-gray-950 text-primary-300 font-bold text-lg border-2 border-primary transition-all hover:shadow-[8px_8px_0px_0px_#55B0DD] hover:-translate-y-2"
              >
                <ScanEye className="w-6 h-6" />
                See Care Workflows
              </button>

              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-white text-gray-950 font-medium text-lg border-2 border-white transition-all hover:bg-gray-100 hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.4)] hover:-translate-y-2"
              >
                Login to Dashboard
              </button>
            </div>

            <p className="mt-8 text-xs font-mono uppercase tracking-[0.2em] text-white/40">
              Not a diagnosis. Not a prescription. A guidance layer for care you've already been given.
            </p>
          </motion.div>
        </section>

        {/* 2. FEATURES GRID */}
        <section className="py-24 px-4 md:px-12 bg-black/40 backdrop-blur-sm border-y border-white/5">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ScanEye className="w-8 h-8 text-primary" />}
              title="Camera-Verified Technique"
              description="Markerless visual checking of how you use your prescribed inhaler, monitor, or injection device — anchored to the device itself, not a fixed spot on screen."
            />
            <FeatureCard
              icon={<Pill className="w-8 h-8 text-accent" />}
              title="Medication Reminders"
              description="Structured reminders and adherence tracking built from your own prescription — NovaCare never generates or changes a dose."
            />
            <FeatureCard
              icon={<HeartPulse className="w-8 h-8 text-[#FF4D4D]" />}
              title="Step-by-Step Coaching"
              description="Plain-language, multilingual explanations for every step — what to do and why it matters, without ever replacing your clinician."
            />
          </div>
        </section>

        {/* 3. HOW IT WORKS */}
        <section className="py-32 px-4 md:px-12 max-w-6xl mx-auto w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">How It Works</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-transparent mx-auto rounded-full"></div>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-12 md:gap-8">
            <Step number="01" title="Open Camera" icon={<Camera className="w-10 h-10" />} />
            <div className="hidden md:block w-16 h-px bg-white/20"></div>
            <Step number="02" title="AR Recognizes Your Device" icon={<ScanEye className="w-10 h-10" />} />
            <div className="hidden md:block w-16 h-px bg-white/20"></div>
            <Step number="03" title="Follow Guided Steps" icon={<ShieldCheck className="w-10 h-10" />} />
          </div>
        </section>

        {/* 4. FINAL CTA FOOTER */}
        <footer className="mt-auto pt-32 pb-16 px-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-display font-bold mb-8">Ready to use your treatment correctly?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/workflow')}
                className="pointer-events-auto px-8 py-4 rounded-full bg-primary text-black font-bold text-lg hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(85,176,221,0.3)] flex items-center gap-2"
              >
                See Care Workflows <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="pointer-events-auto px-8 py-4 rounded-full bg-white/5 text-bone font-medium text-lg backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all"
              >
                Login to Dashboard
              </button>
            </div>
          </div>
          <div className="text-center mt-24 text-gray-500 text-sm">
            © 2026 NovaCare. Procedural guidance only — always follow your clinician's instructions.
          </div>
        </footer>

      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="pointer-events-auto group p-8 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 transition-all duration-300 hover:bg-white/10 hover:border-primary/30 hover:shadow-glass hover:-translate-y-2">
      <div className="mb-6 bg-black/40 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5 group-hover:border-primary/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-400 font-light leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, icon }) {
  return (
    <div className="flex flex-col items-center text-center max-w-[200px]">
      <div className="text-6xl font-display font-extrabold text-white/5 mb-4 select-none absolute -mt-10">{number}</div>
      <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-md border border-white/10 flex items-center justify-center mb-6 text-white shadow-glass">
        {icon}
      </div>
      <h4 className="text-xl font-display font-bold mb-2 text-white">{title}</h4>
      <p className="text-white font-bold font-mono text-sm tracking-widest uppercase">Step {number}</p>
    </div>
  );
}
