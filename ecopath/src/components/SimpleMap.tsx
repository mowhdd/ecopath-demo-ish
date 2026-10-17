import { useState } from 'react';
import { LANDMARKS, EDUCATIONAL_PINS, SHADE_CANOPY_PATH, SAFENIGHT_LIT_PATH, BARRIER_FREE_PATH } from '../data/mockData';
import type { LatLngPoint, Landmark, EducationalPin } from '../types';

const LAT = [3.1725, 3.19], LNG = [101.5105, 101.53], W = 900, H = 800, P = 60;
const pt = (p: LatLngPoint) => ({
  x: P + ((p.lng - LNG[0]) / (LNG[1] - LNG[0])) * (W - 2 * P),
  y: P + ((LAT[1] - p.lat) / (LAT[1] - LAT[0])) * (H - 2 * P),
});
const km = (a: LatLngPoint[]) => a.slice(1).reduce((s, p, i) => {
  const q = a[i], dy = (p.lat - q.lat) * 111, dx = (p.lng - q.lng) * 111 * Math.cos((p.lat * Math.PI) / 180);
  return s + Math.hypot(dx, dy);
}, 0);
const MODES = {
  shade: { label: 'Shade', path: SHADE_CANOPY_PATH, color: '#00855d', icon: 'park' },
  night: { label: 'Night', path: SAFENIGHT_LIT_PATH, color: '#f5a524', icon: 'dark_mode' },
  access: { label: 'Accessible', path: BARRIER_FREE_PATH, color: '#2f6fed', icon: 'accessible' },
} as const;
type Mode = keyof typeof MODES;

export function SimpleMap({ onOpenEduModal, onOpenReportModal, onBack }: {
  onBack: () => void;
  onOpenEduModal: (p: EducationalPin) => void;
  onOpenReportModal: () => void;
}) {
  const [mode, setMode] = useState<Mode>('shade');
  const [sel, setSel] = useState<Landmark | null>(null);
  const m = MODES[mode], dark = mode === 'night';
  const d = m.path.map((p, i) => `${i ? 'L' : 'M'}${pt(p).x.toFixed(1)} ${pt(p).y.toFixed(1)}`).join(' ');
  const dist = km(m.path);
  const c = dark ? { bg: '#17213a', water: '#26405f', park: '#1f3d37', road: '#34415f', text: '#e6ecff' }
                 : { bg: '#eef5ea', water: '#bfe3f0', park: '#cfe8c6', road: '#d9e2d3', text: '#1c2b24' };

  return (
    <div className="relative w-full h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-4rem)] overflow-hidden transition-colors duration-500" style={{ background: c.bg }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" onClick={() => setSel(null)}>
        <path d="M250 300C300 230 470 250 520 330 570 410 500 500 400 500 300 500 200 400 250 300Z" fill={c.water} />
        <circle cx="790" cy="120" r="110" fill={c.park} />
        <ellipse cx="470" cy="610" rx="170" ry="80" fill={c.park} />
        {[BARRIER_FREE_PATH, SHADE_CANOPY_PATH, SAFENIGHT_LIT_PATH].map((a, i) => (
          <path key={i} d={a.map((p, j) => `${j ? 'L' : 'M'}${pt(p).x} ${pt(p).y}`).join(' ')} fill="none" stroke={c.road} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <path d={d} fill="none" stroke={m.color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 18" className="opacity-40" />
        <path d={d} fill="none" stroke={m.color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <circle r="11" fill="#fff" stroke={m.color} strokeWidth="5">
          <animateMotion dur="16s" repeatCount="indefinite" path={d} />
        </circle>
        {EDUCATIONAL_PINS.map((e) => (
          <circle key={e.id} cx={pt(e.position).x} cy={pt(e.position).y - 26} r="9" fill="#6cf8bb" stroke="#006948" strokeWidth="3" className="cursor-pointer" onClick={(ev) => { ev.stopPropagation(); onOpenEduModal(e); }} />
        ))}
        {LANDMARKS.map((l) => {
          const { x, y } = pt(l.position), on = sel?.id === l.id;
          return (
            <g key={l.id} className="cursor-pointer" onClick={(ev) => { ev.stopPropagation(); setSel(l); }}>
              <circle cx={x} cy={y} r="28" fill="transparent" />
              <circle cx={x} cy={y} r={on ? 15 : 10} fill={on ? '#006948' : '#fff'} stroke="#006948" strokeWidth="4" />
              <text x={x} y={y + 32} textAnchor="middle" fontSize="19" fontWeight="600" fill={c.text} stroke={c.bg} strokeWidth="5" paintOrder="stroke" fontFamily="Inter, sans-serif">{l.name}</text>
            </g>
          );
        })}
      </svg>

      <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
        <div className="flex p-1 rounded-full bg-white/95 shadow-lg border border-black/5">
          {(Object.keys(MODES) as Mode[]).map((k) => (
            <button key={k} onClick={() => { setMode(k); setSel(null); }}
              className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${mode === k ? 'text-white' : 'text-slate-600'}`}
              style={mode === k ? { background: MODES[k].color } : undefined}>
              <span className="material-symbols-outlined text-[16px]">{MODES[k].icon}</span>{MODES[k].label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onOpenReportModal} aria-label="Report an issue" className="w-11 h-11 rounded-full bg-white/95 shadow-lg border border-black/5 flex items-center justify-center text-[#006948]">
            <span className="material-symbols-outlined">flag</span>
          </button>
          <button onClick={onBack} aria-label="Back to Selangor map" className="w-11 h-11 rounded-full bg-white/95 shadow-lg border border-black/5 flex items-center justify-center text-[#006948]">
            <span className="material-symbols-outlined">public</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 mx-auto max-w-md rounded-3xl bg-white shadow-2xl border border-black/5 p-4 text-[#131b2e]">
        {sel ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-bold text-base leading-tight">{sel.name}</div><div className="text-xs text-slate-500">{sel.subtitle}</div></div>
              <button onClick={() => setSel(null)} aria-label="Close" className="text-slate-400"><span className="material-symbols-outlined">close</span></button>
            </div>
            {sel.description && <p className="mt-2 text-sm text-slate-600 line-clamp-3">{sel.description}</p>}
            <div className="mt-2 flex gap-2 text-[11px] font-bold">
              {sel.shadeScore != null && <span className="px-2 py-1 rounded-full bg-[#e6f6ee] text-[#006948]">Shade {sel.shadeScore}</span>}
              {sel.lightScore != null && <span className="px-2 py-1 rounded-full bg-[#fff3d9] text-[#8a5a00]">Light {sel.lightScore}</span>}
              {sel.barrierFreeScore != null && <span className="px-2 py-1 rounded-full bg-[#e6eeff] text-[#2450b5]">Access {sel.barrierFreeScore}</span>}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ background: m.color }}><span className="material-symbols-outlined">{m.icon}</span></span>
            <div><div className="font-bold text-sm">{m.label} route</div><div className="text-xs text-slate-500">{dist.toFixed(1)} km · about {Math.round((dist / 5) * 60)} min walk · tap a place for details</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
