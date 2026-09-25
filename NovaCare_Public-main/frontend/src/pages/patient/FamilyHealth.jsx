import { useState } from 'react'

export default function FamilyHealth() {
  const [links, setLinks] = useState([])

  const addSimulatedMember = () => {
    const newMember = {
      id: Date.now(),
      relation: 'Spouse',
      name: 'Priya K.',
      risk: 'GREEN',
      lastScreened: '22 Apr 2026',
    }
    setLinks([...links, newMember])
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-hud-ink flex items-center gap-2 uppercase tracking-widest">
          Family Risk Overwatch
        </h1>
        <p className="text-hud-ink3 text-xs mt-1 uppercase tracking-wider">
          Monitor shared health risks & genetic factors
        </p>
      </div>

      {/* Primary Console Card */}
      <div className="bg-[#FFFFFF] border border-hud-line/80 p-5 relative">
        <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-hud-cyan" />
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-hud-cyan" />

        <h2 className="text-[10px] text-hud-cyan font-black tracking-widest uppercase mb-4 select-none">
          [ LINKED VILLAGE NODE PROFILES ]
        </h2>

        {links.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div>
              <p className="font-bold text-hud-ink text-sm uppercase tracking-wider">
                No linked family profiles
              </p>
              <p className="text-[11px] text-hud-ink3 mt-1.5 leading-relaxed font-mono uppercase">
                Monitor shared health risks
              </p>
            </div>
            <div className="pt-3">
              <button
                onClick={addSimulatedMember}
                className="border border-hud-cyan text-hud-cyan font-mono text-[10px] px-4 py-2 hover:bg-hud-cyan/15 hover:shadow-glow transition-all tracking-wider font-bold uppercase rounded-none bg-transparent"
              >
                + Link Family Profile
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map(member => (
              <div key={member.id} className="bg-[#F5F9FF] border border-hud-line/45 p-4 relative flex justify-between items-center">
                <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-hud-cyan" />
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-hud-cyan" />
                
                <div>
                  <span className="mono text-[8px] bg-hud-cyan/15 text-hud-cyan px-2.5 py-0.5 border border-hud-cyan/35 font-bold uppercase select-none">
                    {member.relation}
                  </span>
                  <h3 className="font-bold text-hud-ink text-xs uppercase mt-2.5">
                    {member.name}
                  </h3>
                  <p className="text-[9px] text-hud-ink3 mt-0.5 font-mono">
                    Last screened: {member.lastScreened}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <span className="border border-tier-green/35 bg-tier-green/5 text-tier-green font-mono text-[8px] px-2 py-0.5 font-bold uppercase tracking-widest">
                    {member.risk} STATUS
                  </span>
                  <button
                    onClick={() => setLinks([])}
                    className="text-[9px] text-tier-red hover:underline font-bold font-mono uppercase"
                  >
                    Unlink
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Genetic Risk Profile Guidance */}
      <div className="bg-[#FFFFFF]/60 border border-hud-line/45 p-4 rounded-none space-y-2">
        <h4 className="font-bold text-hud-ink text-xs uppercase tracking-wider">
          Genetic Risk Mapping Guidance
        </h4>
        <p className="text-[10px] text-hud-ink2 leading-relaxed font-mono uppercase">
          Prediabetes and diabetes have strong genetic components. A patient with immediate family members diagnosed with type-2 diabetes receives an automatic +15 addition to their prediabetic trajectory index. Linking nodes allows PHC doctors to trace local household health corridors.
        </p>
      </div>
    </div>
  )
}
