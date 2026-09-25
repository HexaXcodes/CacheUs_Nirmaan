import { useOutletContext, useNavigate } from 'react-router-dom'
import Skeleton from '../../components/ui/Skeleton'

export default function DigitalHealthCardPage() {
  const navigate = useNavigate()
  const { patient, loading } = useOutletContext()

  const abhaId = patient?.abha_id || '91-8834-1100-22'
  const patientName = patient?.name || 'Nova Care Patient'
  const bloodGroup = patient?.blood_group || 'O-POSITIVE'
  const villageCode = patient?.village_code || 'AW-DEFAULT'

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Title with Back button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-hud-ink flex items-center gap-2 uppercase tracking-widest">
            Health ID Shield
          </h1>
          <p className="text-hud-ink3 text-xs mt-1 uppercase tracking-wider">
            ABHA Clinical identity core
          </p>
        </div>
        
        <button
          onClick={() => navigate('/patient')}
          className="border border-hud-dim text-hud-muted hover:border-hud-cyan hover:text-hud-cyan hover:shadow-glow font-mono text-[9px] px-2.5 py-1.5 transition uppercase tracking-wider font-bold rounded-none"
        >
          &lt; Dashboard
        </button>
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full bg-hud-surface" />
      ) : (
        <div className="space-y-6">
          {/* Cybernetic Brutalist Digital Health Card */}
          <div className="border-2 border-hud-cyan bg-[#FFFFFF] p-6 relative overflow-hidden shadow-hud-lg rounded-none group select-none">
            {/* Corner brackets */}
            <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-hud-cyan" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-hud-cyan" />
            <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-hud-cyan" />
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-hud-cyan" />

            {/* Glowing Laser Scanline animation */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.04)_1.5px,transparent_1.5px)] bg-[size:100%_4px] opacity-30 pointer-events-none" />
            <div className="absolute left-0 right-0 top-0 h-1 bg-hud-cyan shadow-glow animate-scan z-10 pointer-events-none" />

            {/* Card Header */}
            <div className="flex justify-between items-start border-b border-hud-line pb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 border border-hud-cyan flex items-center justify-center relative">
                  <span className="absolute w-1 h-1 bg-hud-cyan top-0 left-0" />
                  <span className="absolute w-1 h-1 bg-hud-cyan bottom-0 right-0" />
                  <div className="w-3.5 h-3.5 bg-hud-cyan animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-hud-cyan text-sm tracking-[0.2em] leading-none uppercase">
                    NOVACARE
                  </h3>
                  <span className="text-[7.5px] text-hud-ink3 tracking-widest uppercase block mt-1">
                    NATIONAL HEALTH AUTHORITY // NCD_SHIELD
                  </span>
                </div>
              </div>

              <span className="border border-hud-cyan/40 bg-hud-cyan/5 text-hud-cyan font-mono text-[8px] px-2 py-0.5 font-bold tracking-widest uppercase">
                NODE CORE ID
              </span>
            </div>

            {/* Card Body (QR and details) */}
            <div className="flex flex-col sm:flex-row gap-5 items-center justify-between mt-5 py-2">
              {/* Left Detail Panel */}
              <div className="space-y-3 font-mono text-[10.5px] flex-1 w-full">
                <div>
                  <span className="text-hud-ink3 block text-[8px] uppercase font-bold tracking-widest">PATIENT IDENTIFIER</span>
                  <span className="text-hud-ink font-bold uppercase text-xs tracking-wider block">{patientName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-hud-ink3 block text-[8px] uppercase font-bold tracking-widest">ABHA ID</span>
                    <span className="text-hud-ink font-bold tracking-wider block mt-0.5">{abhaId}</span>
                  </div>
                  <div>
                    <span className="text-hud-ink3 block text-[8px] uppercase font-bold tracking-widest">BLOOD CORE</span>
                    <span className="text-hud-cyan font-bold tracking-wider block mt-0.5 uppercase">{bloodGroup}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-hud-ink3 block text-[8px] uppercase font-bold tracking-widest">EMERGENCY CONTACT</span>
                    <span className="text-hud-ink font-bold block mt-0.5 uppercase">PHC-EMERGENCY-NODE</span>
                  </div>
                  <div>
                    <span className="text-hud-ink3 block text-[8px] uppercase font-bold tracking-widest">LOCAL VLG</span>
                    <span className="text-hud-ink font-bold block mt-0.5 uppercase">{villageCode}</span>
                  </div>
                </div>
              </div>

              {/* QR Code Segment */}
              <div className="shrink-0 w-28 h-28 bg-[#F5F9FF] border-2 border-hud-cyan/50 p-2 flex items-center justify-center relative shadow-hud group-hover:border-hud-cyan transition-colors duration-300">
                <span className="absolute top-0 left-0 w-1.5 h-1.5 bg-hud-cyan" />
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-hud-cyan" />
                
                {/* SVG vector QR Code representation */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-hud-cyan">
                  <path d="M10,10 H35 V35 H10 Z M65,10 H90 V35 H65 Z M10,65 H35 V90 H10 Z" fill="currentColor" />
                  <path d="M16,16 H29 V29 H16 Z M71,16 H84 V29 H71 Z M16,71 H29 V84 H16 Z" fill="#F5F9FF" />
                  <path d="M21,21 H24 V24 H21 Z M76,21 H79 V24 H76 Z M21,76 H24 V79 H21 Z" fill="currentColor" />
                  {/* Random pixels for standard QR effect */}
                  <path d="M43,10 H50 V17 H43 Z M55,15 H60 V25 H55 Z M40,25 H52 V30 H40 Z M10,40 H20 V48 H10 Z M28,42 H35 V55 H28 Z M45,40 H65 V48 H45 Z M75,40 H88 V46 H75 Z" fill="currentColor" />
                  <path d="M42,55 H52 V68 H42 Z M58,52 H62 V90 H58 Z M10,54 H18 V60 H10 Z M68,68 H90 V73 H68 Z M78,78 H90 V85 H78 Z M84,84 H88 V90 H84 Z" fill="currentColor" />
                  <path d="M22,48 H25 V52 H22 Z M30,68 H38 V78 H30 Z M46,75 H52 V88 H46 Z M70,82 H74 V88 H70 Z" fill="currentColor" />
                </svg>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-5 pt-3.5 border-t border-hud-line flex justify-between items-center text-[8.5px] text-hud-ink3 uppercase tracking-widest font-mono">
              <span>CARD INDEX // NC_ABHA_398AF821B</span>
              <span className="text-hud-cyan font-bold">SECURE ENVELOPE ENCRYPTED</span>
            </div>
          </div>

          {/* Advisory Notice */}
          <div className="bg-[#FFFFFF] border border-hud-line/80 p-5 rounded-none space-y-2">
            <h4 className="font-bold text-hud-ink text-xs uppercase tracking-wider">
              ABHA Secure Ledger Integration
            </h4>
            <p className="text-[10px] text-hud-ink2 leading-relaxed font-mono uppercase">
              The Digital Health Card links directly to India's **Ayushman Bharat Digital Mission (ABDM)** grid. ASHA workers use the scan telemetry node on their ASHA portal to pull your biometric updates, verify profile parameters, and queue follow-up visits instantly.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
