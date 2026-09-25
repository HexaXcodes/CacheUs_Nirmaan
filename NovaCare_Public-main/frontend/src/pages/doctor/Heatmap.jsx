import { useState, useEffect, useCallback, useRef } from 'react'
import L from 'leaflet'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getMapsPoints, getTrends } from '../../api/heatmap'
import PortalShell from '../../components/layout/PortalShell'

const MAP_CENTER = [13.0068, 76.0996]


function tierColor(point) {
  const total = (point.red || 0) + (point.amber || 0) + (point.green || 0)
  if (!total) return '#6b7280'
  const redPct = (point.red || 0) / total
  if (redPct > 0.3) return '#ef4444'
  if (redPct > 0.1) return '#f59e0b'
  return '#22c55e'
}

function circleRadius(total) {
  if (!total) return 400
  return Math.min(3000, Math.max(500, Math.sqrt(total) * 200))
}

function TrendMini({ data }) {
  if (!data?.length) return <p className="text-xs text-gray-400 py-1">No trend data</p>
  const max = Math.max(...data.flatMap(d => [d.red || 0, d.amber || 0, d.green || 0]), 1)
  return (
    <div className="flex items-end gap-0.5 h-10 mt-1">
      {data.slice(-6).map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-px flex-1">
          <div className="w-full bg-red-400 rounded-sm"   style={{ height: `${(d.red   || 0) / max * 28}px` }} />
          <div className="w-full bg-amber-400 rounded-sm" style={{ height: `${(d.amber || 0) / max * 28}px` }} />
          <div className="w-full bg-green-400 rounded-sm" style={{ height: `${(d.green || 0) / max * 28}px` }} />
        </div>
      ))}
    </div>
  )
}

export default function Heatmap() {
  const { user } = useAuth()
  const { toast } = useToast()

  const mapRef      = useRef(null)  // DOM div
  const leafletRef  = useRef(null)  // L.map instance
  const circlesRef  = useRef([])    // L.circle instances

  const [district,      setDistrict]      = useState(user?.district || '')
  const [inputDistrict, setInputDistrict] = useState(user?.district || '')
  const [tierFilter,    setTierFilter]    = useState('all')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')
  const [view,          setView]          = useState('map')

  const [points,        setPoints]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,setError] = useState('')
  const loadVersion = useRef(0)
  const [myLocation,    setMyLocation]    = useState(null)
  const [selected,      setSelected]      = useState(null)
  const [trends,        setTrends]        = useState([])
  const [trendsLoading, setTrendsLoading] = useState(false)

  // ── Init Leaflet map once ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return

    const map = L.map(mapRef.current, { zoomControl: true }).setView(MAP_CENTER, 8)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    leafletRef.current = map

    return () => { map.remove(); leafletRef.current = null }
  }, [])

  // ── Draw circles whenever points/filter changes ────────────────────────────
  const filteredPoints = points.filter(p => {
    if (tierFilter === 'all') return true
    const total = (p.red || 0) + (p.amber || 0) + (p.green || 0)
    if (!total) return tierFilter === 'green'
    const redPct = (p.red || 0) / total
    if (tierFilter === 'red')   return redPct > 0.3
    if (tierFilter === 'amber') return redPct <= 0.3 && redPct > 0.1
    return redPct <= 0.1
  })

  useEffect(() => {
    const map = leafletRef.current
    if (!map) return

    circlesRef.current.forEach(c => c.remove())
    circlesRef.current = []

    filteredPoints.forEach(point => {
      const color  = tierColor(point)
      const circle = L.circle([point.lat, point.lng], {
        radius:      circleRadius(point.total || 0),
        color,
        fillColor:   color,
        fillOpacity: 0.4,
        weight:      2,
      }).addTo(map)

      circle.bindPopup(`
        <div style="min-width:140px;font-family:sans-serif;font-size:12px">
          <p style="font-weight:700;margin:0 0 4px">${point.name || point.village_code}</p>
          <p style="color:#6b7280;margin:0">Total: ${point.total || 0} screened</p>
          <div style="display:flex;gap:8px;margin-top:4px">
            <span style="color:#ef4444">R ${point.red || 0}</span>
            <span style="color:#f59e0b">A ${point.amber || 0}</span>
            <span style="color:#22c55e">G ${point.green || 0}</span>
          </div>
        </div>
      `)

      circle.on('click', () => {
        setSelected(point)
        setTrendsLoading(true)
        getTrends(point.village_code)
          .then(res => setTrends(res.data?.trends || []))
          .catch(() => setTrends([]))
          .finally(() => setTrendsLoading(false))
      })

      circlesRef.current.push(circle)
    })
  }, [filteredPoints.length, tierFilter, points])

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadPoints = useCallback(() => {
    const version=++loadVersion.current
    setLoading(true);setError('');setSelected(null);setTrends([])
    const params = {}
    if (district)  params.district  = district
    if (dateFrom)  params.from_date = dateFrom
    if (dateTo)    params.to_date   = dateTo
    getMapsPoints(params)
      .then(res => {
        const raw = Array.isArray(res.data) ? res.data : (res.data?.points || [])
        if(version!==loadVersion.current)return
        const data = raw.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180)
        setPoints(data)
        if (leafletRef.current && data.length) {
          leafletRef.current.flyTo([data[0].lat, data[0].lng], 9, { duration: 1 })
        }
      })
      .catch(() => {
        if(version!==loadVersion.current)return
        setPoints([]);setError('Unable to load screening data. Please retry.')

      })
      .finally(() => {if(version===loadVersion.current)setLoading(false)})
  }, [district, dateFrom, dateTo])

  useEffect(() => { loadPoints();return()=>{loadVersion.current++} }, [loadPoints])
  useEffect(()=>{if(view==='map')leafletRef.current?.invalidateSize()},[view])

  // ── My location ────────────────────────────────────────────────────────────
  const myCircleRef = useRef(null)
  const handleMyLocation = () => {
    if (!navigator.geolocation) { toast('Geolocation not supported', 'error'); return }
    navigator.geolocation.getCurrentPosition(pos => {
      const loc = [pos.coords.latitude, pos.coords.longitude]
      setMyLocation(loc)
      if (leafletRef.current) {
        myCircleRef.current?.remove()
        myCircleRef.current = L.circle(loc, {
          radius: 150, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 3,
        }).addTo(leafletRef.current).bindPopup('Your location')
        leafletRef.current.flyTo(loc, 12, { duration: 1 })
      }
    }, () => toast('Location access denied', 'error'))
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalRed   = filteredPoints.reduce((s, p) => s + (p.red   || 0), 0)
  const totalAmber = filteredPoints.reduce((s, p) => s + (p.amber || 0), 0)
  const totalGreen = filteredPoints.reduce((s, p) => s + (p.green || 0), 0)
  const totalPts   = totalRed + totalAmber + totalGreen

  return (
    <PortalShell><h1>Screening heatmap</h1><p>Legacy screening tiers by village · not BP or glucose prevalence.</p>{error&&<p role="alert" className="nc-alert">{error}</p>}{!loading&&!error&&!points.length&&<p role="status">No geolocated screening records for these filters.</p>}
    <div className="nc-heatmap-shell bg-gray-50 flex flex-col rounded-2xl overflow-hidden border border-gray-200 min-h-[80vh]">
      {/* Filter bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">District</label>
            <input
              value={inputDistrict}
              onChange={e => setInputDistrict(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && setDistrict(inputDistrict)}
              placeholder="All district"
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Tier</label>
            <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-32">
              <option value="all">All</option>
              <option value="red">High Risk</option>
              <option value="amber">Medium</option>
              <option value="green">Low Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button onClick={() => { if(district===inputDistrict)loadPoints();else setDistrict(inputDistrict) }}
            className="px-5 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 transition">
            Apply
          </button>
          <button onClick={handleMyLocation}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded hover:bg-gray-50 transition flex items-center gap-1.5">
            <span className="text-red-500">📍</span> My Location
          </button>

          <div className="ml-auto flex rounded overflow-hidden border border-gray-300">
            {['map', 'list'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-5 py-1.5 text-sm font-semibold transition flex items-center gap-1.5 ${
                  view === v ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}>
                {v === 'map' ? '🗺' : '📋'} {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white border-b border-gray-100 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-semibold text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {totalRed} RED
          </span>
          <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> {totalAmber} AMBER
          </span>
          <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-semibold text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {totalGreen} GREEN
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">{totalPts} screenings · {filteredPoints.length} villages</span>
          {myLocation && (
            <span className="text-red-500 font-mono text-[11px] ml-1">
              📍 {myLocation[0].toFixed(4)}, {myLocation[1].toFixed(4)}
            </span>
          )}
          {loading && <span className="text-blue-500 animate-pulse ml-auto text-xs">Loading…</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 flex gap-4">
        <div className="flex-1">
          {/* Map (always mounted, just hidden in list view) */}
          <div className={`nc-heatmap-maparea relative rounded overflow-hidden border border-gray-200 shadow-sm ${view === 'list' ? 'hidden' : ''}`}
            style={{ height: 560 }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

            {/* Legend */}
            <div className="absolute top-3 left-12 z-[1000] bg-white/95 border border-gray-200 rounded shadow-md px-3 py-2 text-xs space-y-1 pointer-events-none">
              <p className="font-bold text-gray-700 mb-1">Village Risk</p>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /><span className="text-gray-600">High (RED)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /><span className="text-gray-600">Medium (AMBER)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /><span className="text-gray-600">Low (GREEN)</span></div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /><span className="text-gray-600">Your location</span></div>
              <p className="text-gray-400 mt-1">Size ∝ screenings</p>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-[999]">
                <span className="text-blue-600 text-sm font-semibold animate-pulse">Loading map data…</span>
              </div>
            )}
          </div>

          {/* List view */}
          {view === 'list' && (
            <div className="bg-white border border-gray-200 rounded shadow-sm overflow-auto" style={{ maxHeight: 560 }}>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <span className="font-bold text-gray-800 text-sm">{district || 'All Districts'} — {filteredPoints.length} villages</span>
              </div>
              {filteredPoints.length === 0
                ? <p className="text-center text-gray-400 py-12 text-sm">No data for this filter</p>
                : filteredPoints.map((point, i) => {
                    const color   = tierColor(point)
                    const total   = point.total || 0
                    const redPct  = total ? Math.round((point.red   || 0) / total * 100) : 0
                    const amberPct= total ? Math.round((point.amber || 0) / total * 100) : 0
                    const greenPct= total ? Math.round((point.green || 0) / total * 100) : 0
                    return (
                      <div key={i} onClick={() => { setView('map'); setSelected(point) }}
                        className="px-5 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                            <span className="font-semibold text-sm text-gray-800">{point.name || point.village_code}</span>
                            <span className="text-[10px] font-mono text-gray-400">{point.village_code}</span>
                          </div>
                          <span className="text-xs text-gray-400">{total} screened</span>
                        </div>
                        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                          <div className="bg-red-400"   style={{ width: `${redPct}%`   }} />
                          <div className="bg-amber-400" style={{ width: `${amberPct}%` }} />
                          <div className="bg-green-400" style={{ width: `${greenPct}%` }} />
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                          <span className="text-red-500">{point.red || 0} red</span>
                          <span className="text-amber-500">{point.amber || 0} amber</span>
                          <span className="text-green-600">{point.green || 0} green</span>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )}
        </div>

        {/* Side panel */}
        {selected && view === 'map' && (
          <div className="w-64 shrink-0 bg-white border border-gray-200 rounded shadow-sm p-4 space-y-3 self-start">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm">{selected.name || selected.village_code}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <p className="text-[10px] font-mono text-gray-400">{selected.village_code}</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Total screened</span><span className="font-semibold">{selected.total || 0}</span></div>
              <div className="flex justify-between"><span className="text-red-500">High Risk</span>   <span className="font-semibold text-red-600">{selected.red || 0}</span></div>
              <div className="flex justify-between"><span className="text-amber-500">Medium Risk</span><span className="font-semibold text-amber-600">{selected.amber || 0}</span></div>
              <div className="flex justify-between"><span className="text-green-600">Low Risk</span>  <span className="font-semibold text-green-600">{selected.green || 0}</span></div>
            </div>
            {(selected.total || 0) > 0 && (
              <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden">
                <div className="bg-red-400"   style={{ width: `${Math.round((selected.red  ||0)/(selected.total||1)*100)}%` }} />
                <div className="bg-amber-400" style={{ width: `${Math.round((selected.amber||0)/(selected.total||1)*100)}%` }} />
                <div className="bg-green-400" style={{ width: `${Math.round((selected.green||0)/(selected.total||1)*100)}%` }} />
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">6-Month Trend</p>
              {trendsLoading
                ? <div className="animate-pulse h-10 bg-gray-100 rounded" />
                : <TrendMini data={trends} />}
            </div>
          </div>
        )}
      </div>
    </div>
    </PortalShell>
  )
}

