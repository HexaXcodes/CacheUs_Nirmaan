import { useState } from 'react'

export default function UpcomingCheckups() {
  const [reminders, setReminders] = useState([])

  const addSimulatedCheckup = () => {
    const newCheckup = {
      id: Date.now(),
      title: 'Routine NCD Screening Review',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      location: 'Local PHC Health Center',
      status: 'PENDING_SYNC',
    }
    setReminders([...reminders, newCheckup])
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-hud-ink flex items-center gap-2 uppercase tracking-widest">
          Appointments Queue
        </h1>
        <p className="text-hud-ink3 text-xs mt-1 uppercase tracking-wider">
          Village outreach campaigns & doctor reviews
        </p>
      </div>

      {/* Appointment List Card */}
      <div className="bg-[#FFFFFF] border border-hud-line/80 p-5 relative">
        <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-hud-cyan" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hud-cyan" />

        <h2 className="text-[10px] text-hud-cyan font-black tracking-widest uppercase mb-4 select-none">
          [ UPCOMING CLINICAL QUEUE ]
        </h2>

        {reminders.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <div>
              <p className="font-bold text-hud-ink text-sm uppercase tracking-wider">
                No upcoming appointments
              </p>
              <p className="text-[11px] text-hud-ink3 mt-1.5 leading-relaxed font-mono uppercase">
                Your primary health center or assigning ASHA worker has not scheduled any upcoming visits for this node.
              </p>
            </div>

            <div className="pt-3">
              <button
                onClick={addSimulatedCheckup}
                className="border border-hud-cyan text-hud-cyan font-mono text-[10px] px-4 py-2 hover:bg-hud-cyan/15 hover:shadow-glow transition-all tracking-wider font-bold uppercase rounded-none bg-transparent"
              >
                + Request Checkup Session
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {reminders.map(c => (
              <div key={c.id} className="border border-hud-cyan/40 bg-[#F5F9FF] p-4 relative group">
                {/* corner brackets */}
                <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-hud-cyan" />
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-hud-cyan" />

                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="mono text-[8px] bg-hud-cyan/15 text-hud-cyan px-2 py-0.5 border border-hud-cyan/30 tracking-widest uppercase font-bold">
                      {c.status}
                    </span>
                    <h3 className="font-bold text-hud-ink text-xs uppercase tracking-wider mt-2.5">
                      {c.title}
                    </h3>
                    <p className="text-[10px] text-hud-ink3 mt-1 uppercase font-mono">
                      Location: {c.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono text-[11px] text-hud-cyan font-bold leading-none">
                      {c.date}
                    </span>
                    <span className="block font-mono text-[8px] text-hud-ink3 uppercase mt-1">
                      10:00 AM IST
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-hud-line/45 flex justify-end">
                  <button
                    onClick={() => setReminders(reminders.filter(r => r.id !== c.id))}
                    className="border border-tier-red text-tier-red font-mono text-[8px] px-2.5 py-1 hover:bg-tier-red hover:text-white transition-all tracking-widest uppercase font-bold"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Advisory Node */}
      <div className="bg-[#FFFFFF]/60 border border-hud-line/45 p-4 rounded-none space-y-2">
        <h4 className="font-bold text-hud-ink text-xs uppercase tracking-wider">
          Automatic Follow-Up Alerts
        </h4>
        <p className="text-[10px] text-hud-ink2 leading-relaxed font-mono uppercase">
          For RED risk level patients, follow-ups are due immediately. AMBER category screenings default to 21-day cycles. Secure SMS reminders are sent automatically by ASHA cloud notifications.
        </p>
      </div>
    </div>
  )
}
