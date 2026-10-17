import { useEffect, useMemo, useState } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { SEGMENTS, PLACES, CENTER, type Seg } from '../data/elmina';
import { route, type Mode } from '../utils/walkRouting';

const MODES = {
  shade: { label: 'Shade', icon: 'park', color: '#0b6b3a', note: 'Estimated from park proximity and path type' },
  night: { label: 'Night', icon: 'dark_mode', color: '#c98a00', note: 'Estimated from path type and nearby venues' },
  access: { label: 'Accessible', icon: 'accessible', color: '#2f6fed', note: 'Wheelchair-tagged paths from OpenStreetMap' },
} as const;
const KIND: Record<string, string> = { mall: 'storefront', park: 'park', water: 'water', sport: 'sports_soccer', rest: 'local_cafe', view: 'visibility', bridge: 'water_lux' };

const paint = (m: Mode, g: Seg) => {
  const road = g.t === 'r';
  if (m === 'shade') return { c: `hsl(130 60% ${82 - g.sh * 0.55}%)`, w: road ? 3 : 6 };
  if (m === 'night') return { c: `hsl(${225 - 1.83 * g.li} 70% ${35 + g.li * 0.2}%)`, w: road ? 3 : 6 };
  if (g.t === 'u') return { c: '#d93025', w: 6 };
  return g.w ? { c: '#2f6fed', w: 7 } : { c: '#9aa0a6', w: 4 };
};

function Layers({ mode, path }: { mode: Mode; path?: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const L = SEGMENTS.filter((g) => mode !== 'access' || g.t !== 'r').map((g) => {
      const { c, w } = paint(mode, g), p = [];
      for (let i = 0; i < g.c.length; i += 2) p.push({ lat: g.c[i], lng: g.c[i + 1] });
      return new google.maps.Polyline({ map, path: p, strokeColor: c, strokeWeight: w, strokeOpacity: 0.9, zIndex: 1, clickable: false });
    });
    return () => L.forEach((l) => l.setMap(null));
  }, [map, mode]);
  useEffect(() => {
    if (!map || !path) return;
    const o = new google.maps.Polyline({ map, path, strokeColor: '#fff', strokeWeight: 14, zIndex: 2, clickable: false });
    const l = new google.maps.Polyline({ map, path, strokeColor: MODES[mode].color, strokeWeight: 8, zIndex: 3, clickable: false });
    const b = new google.maps.LatLngBounds(); path.forEach((p) => b.extend(p));
    map.fitBounds(b, { top: 90, bottom: 230, left: 30, right: 30 });
    return () => { o.setMap(null); l.setMap(null); };
  }, [map, path, mode]);
  return null;
}

export function ElminaMap({ onOpenReportModal, onWalkComplete }: { onOpenReportModal: () => void; onWalkComplete: (km: number) => void }) {
  const [mode, setMode] = useState<Mode>('shade');
  const [from, setFrom] = useState('lakeside-mall'), [to, setTo] = useState('rainbow-bridge');
  const r = useMemo(() => route(mode, from, to), [mode, from, to]);
  const m = MODES[mode];
  const stat = !r ? '' : mode === 'shade' ? `${r.shade}% shaded (est.)` : mode === 'night' ? `${r.lit}% lit (est.)` : `${r.access}% confirmed accessible`;
  const sel = 'flex-1 min-w-0 rounded-xl bg-[#f2f3ff] px-3 py-2.5 text-sm font-semibold text-[#131b2e] outline-none';
  return (
    <div className="relative w-full h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-4rem)] overflow-hidden">
      <Map mapId="DEMO_MAP_ID" defaultCenter={CENTER} defaultZoom={15} gestureHandling="greedy" disableDefaultUI zoomControl clickableIcons={false} className="w-full h-full">
        <Layers mode={mode} path={r?.path} />
        {PLACES.map((p) => (
          <AdvancedMarker key={p.id} position={p} title={p.name} onClick={() => setTo(p.id === from ? to : p.id)}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full shadow-md border text-[11px] font-bold ${p.id === from ? 'bg-[#006948] text-white border-white' : p.id === to ? 'bg-[#a36700] text-white border-white' : 'bg-white text-[#131b2e] border-black/10'}`}>
              <span className="material-symbols-outlined text-[14px]">{KIND[p.kind]}</span>
              <span className="hidden sm:inline whitespace-nowrap">{p.name}</span>
            </div>
          </AdvancedMarker>
        ))}
      </Map>
      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
        <div className="flex p-1 rounded-full bg-white/95 shadow-lg border border-black/5 pointer-events-auto">
          {(Object.keys(MODES) as Mode[]).map((k) => (
            <button key={k} onClick={() => setMode(k)} className={`px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 ${mode === k ? 'text-white' : 'text-slate-600'}`} style={mode === k ? { background: MODES[k].color } : undefined}>
              <span className="material-symbols-outlined text-[16px]">{MODES[k].icon}</span>{MODES[k].label}
            </button>
          ))}
        </div>
        <button onClick={onOpenReportModal} aria-label="Report an issue" className="pointer-events-auto w-11 h-11 rounded-full bg-white/95 shadow-lg border border-black/5 flex items-center justify-center text-[#006948]">
          <span className="material-symbols-outlined">flag</span>
        </button>
      </div>
      <div className="absolute bottom-3 left-3 right-3 mx-auto max-w-lg rounded-3xl bg-white shadow-2xl border border-black/5 p-3.5 text-[#131b2e] space-y-2.5">
        <div className="flex items-center gap-2">
          <select aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className={sel}>{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button aria-label="Swap" onClick={() => { setFrom(to); setTo(from); }} className="text-slate-400"><span className="material-symbols-outlined">swap_horiz</span></button>
          <select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className={sel}>{PLACES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-bold text-sm">{r ? `${r.km.toFixed(1)} km · ${r.mins} min · ${stat}` : from === to ? 'Pick two different places' : 'No connected path found'}</div>
            <div className="text-[11px] text-slate-500 truncate">{m.note}</div>
          </div>
          {r && <button onClick={() => onWalkComplete(r.km)} className="shrink-0 px-4 py-2.5 rounded-full text-white text-xs font-bold" style={{ background: m.color }}>Start walk</button>}
        </div>
      </div>
    </div>
  );
}
