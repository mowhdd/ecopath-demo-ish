import { useEffect, useMemo, useRef, useState } from 'react';
import { STATES, NEIGHBORS } from '../data/geo';
import { SimpleMap } from './SimpleMap';
import type { EducationalPin } from '../types';

const X = (lng: number) => (lng - 99) * 1000, Y = (lat: number) => (7.8 - lat) * 1000;
const ELMINA = { x: X(101.5175), y: Y(3.1818) };
const CITIES: [string, number, number][] = [['Kuala Lumpur', 101.687, 3.139], ['Shah Alam', 101.518, 3.074], ['Klang', 101.446, 3.045]];
const VB = { my: [300, 0, 20200, 7800], sel: [1850, 3800, 1150, 1400] };

function useTween(target: number[]) {
  const [v, setV] = useState(target), ref = useRef(target);
  useEffect(() => {
    const from = ref.current, t0 = performance.now();
    let id = 0;
    const f = (t: number) => {
      const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 3);
      const n = from.map((a, i) => a + (target[i] - a) * e);
      ref.current = n; setV(n);
      if (k < 1) id = requestAnimationFrame(f);
    };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, [target.join()]);
  return v;
}

export function MalaysiaMap(props: { onOpenEduModal: (p: EducationalPin) => void; onOpenReportModal: () => void }) {
  const [level, setLevel] = useState<'my' | 'sel' | 'town'>('my');
  const v = useTween(level === 'my' ? VB.my : VB.sel);
  const u = v[2] * 0.03; // ~12px of screen text at current zoom
  const land = useMemo(() => (
    <>
      <path d={NEIGHBORS} fill="#dfe6dc" stroke="#cfd8cc" strokeWidth="6" fillRule="evenodd" />
      {STATES.map((s) => (
        <path key={s.n} d={s.d} fill={s.n === 'Selangor' ? '#9fd8b4' : '#cfe8c6'} stroke="#fff" strokeWidth="5" strokeLinejoin="round" fillRule="evenodd" />
      ))}
    </>
  ), []);

  if (level === 'town') return <SimpleMap {...props} onBack={() => setLevel('sel')} />;
  const zoomed = level === 'sel';
  const go = () => setLevel(zoomed ? 'town' : 'sel');
  return (
    <div className="relative w-full h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-4rem)] overflow-hidden bg-[#cfe6f2]">
      <svg viewBox={v.join(' ')} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        {land}
        {!zoomed && ['Peninsular Malaysia', 'Sabah', 'Sarawak'].map((n, i) => (
          <text key={n} x={[1550, 18500, 12300][i]} y={[6200, 3300, 4300][i]} fontSize={u * 0.9} fill="#355a45" opacity=".7" textAnchor="middle" fontWeight="700" fontFamily="Inter, sans-serif">{n === 'Peninsular Malaysia' ? '' : n}</text>
        ))}
        {zoomed && STATES.filter((s) => ['Selangor', 'Perak', 'Pahang', 'Negeri Sembilan'].includes(s.n)).map((s) => (
          <text key={s.n} x={s.x} y={s.y + (s.n === 'Selangor' ? 330 : 0)} fontSize={u * 0.9} fill="#355a45" opacity=".75" textAnchor="middle" fontWeight="700" fontFamily="Inter, sans-serif">{s.n}</text>
        ))}
        {zoomed && CITIES.map(([n, lng, lat]) => (
          <g key={n}><circle cx={X(lng)} cy={Y(lat)} r={u * 0.2} fill="#355a45" />
            <text x={X(lng) + u * 0.4} y={Y(lat) + u * 0.3} fontSize={u * 0.8} fill="#355a45" fontFamily="Inter, sans-serif">{n}</text></g>
        ))}
        <g className="cursor-pointer" onClick={go}>
          <circle cx={ELMINA.x} cy={ELMINA.y} r={u * 2} fill="transparent" />
          <circle cx={ELMINA.x} cy={ELMINA.y} r={u * 0.9} fill="#6cf8bb" opacity=".6"><animate attributeName="r" values={`${u * 0.5};${u * 1.4};${u * 0.5}`} dur="2s" repeatCount="indefinite" /></circle>
          <circle cx={ELMINA.x} cy={ELMINA.y} r={u * 0.45} fill="#006948" stroke="#fff" strokeWidth={u * 0.15} />
          <text x={ELMINA.x} y={ELMINA.y - u * 1.1} fontSize={u * 1.1} fontWeight="800" textAnchor="middle" fill="#00432d" stroke="#fff" strokeWidth={u * 0.3} paintOrder="stroke" fontFamily="Inter, sans-serif">Elmina</text>
        </g>
      </svg>
      {zoomed && (
        <button onClick={() => setLevel('my')} aria-label="Back to Malaysia" className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/95 shadow-lg flex items-center justify-center text-[#006948]">
          <span className="material-symbols-outlined">public</span>
        </button>
      )}
      <div className="absolute bottom-3 left-3 right-3 mx-auto max-w-md rounded-3xl bg-white shadow-2xl p-4 flex items-center gap-3 text-[#131b2e]">
        <span className="w-10 h-10 rounded-full bg-[#006948] text-white flex items-center justify-center"><span className="material-symbols-outlined">location_on</span></span>
        <div className="flex-1"><div className="font-bold text-sm">{zoomed ? 'Selangor, Malaysia' : 'Malaysia'}</div><div className="text-xs text-slate-500">Tap the Elmina pin to {zoomed ? 'open the township map' : 'zoom in'}</div></div>
        <button onClick={go} className="px-4 py-2 rounded-full bg-[#006948] text-white text-xs font-bold">{zoomed ? 'Open' : 'Zoom in'}</button>
      </div>
    </div>
  );
}
