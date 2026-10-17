import { SEGMENTS, PLACES } from '../data/elmina';
export type Mode = 'shade' | 'night' | 'access';
type Edge = { to: number; len: number; s: number };
const ids = new Map<string, number>(), pts: number[][] = [], adj: Edge[][] = [];
const node = (la: number, ln: number) => { const k = la + ',' + ln; let i = ids.get(k); if (i === undefined) { i = pts.length; ids.set(k, i); pts.push([la, ln]); adj.push([]); } return i; };
const hav = (a: number[], b: number[]) => { const r = Math.PI / 180, x = Math.sin(((b[0] - a[0]) * r) / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(((b[1] - a[1]) * r) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(x)); };
SEGMENTS.forEach((g, s) => { let pv = -1; for (let i = 0; i < g.c.length; i += 2) { const n = node(g.c[i], g.c[i + 1]); if (pv >= 0 && pv !== n) { const len = hav(pts[pv], pts[n]); adj[pv].push({ to: n, len, s }); adj[n].push({ to: pv, len, s }); } pv = n; } });
const comp = new Int32Array(pts.length).fill(-1); let best = 0, bestN = 0, cc = 0;
for (let i = 0; i < pts.length; i++) { if (comp[i] >= 0) continue; let n = 0; const st = [i]; comp[i] = cc; while (st.length) { const u = st.pop()!; n++; for (const e of adj[u]) if (comp[e.to] < 0) { comp[e.to] = cc; st.push(e.to); } } if (n > bestN) { bestN = n; best = cc; } cc++; }
const snap = (p: { lat: number; lng: number }) => { let b = -1, bd = 1e18; for (let i = 0; i < pts.length; i++) { if (comp[i] !== best) continue; const d = (pts[i][0] - p.lat) ** 2 + (pts[i][1] - p.lng) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
const cost = (m: Mode, e: Edge) => { const g = SEGMENTS[e.s]; if (m === 'shade') return e.len * (1 + 2 * (1 - g.sh / 100)); if (m === 'night') return e.len * (1 + 2 * (1 - g.li / 100)); if (g.t === 'u' || g.t === 'g') return Infinity; return e.len * (g.w ? 1 : 2.5); };
export function route(m: Mode, fromId: string, toId: string) {
  const A = PLACES.find((p) => p.id === fromId), B = PLACES.find((p) => p.id === toId);
  if (!A || !B || fromId === toId) return null;
  const s = snap(A), t = snap(B), dist = new Float64Array(pts.length).fill(Infinity), pe: (Edge & { from: number } | undefined)[] = [];
  const h: [number, number][] = [[0, s]]; dist[s] = 0;
  const push = (x: [number, number]) => { h.push(x); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
  const pop = () => { const top = h[0], last = h.pop()!; if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let k = i; if (l < h.length && h[l][0] < h[k][0]) k = l; if (r < h.length && h[r][0] < h[k][0]) k = r; if (k === i) break; [h[k], h[i]] = [h[i], h[k]]; i = k; } } return top; };
  while (h.length) { const [d, u] = pop(); if (d > dist[u]) continue; if (u === t) break; for (const e of adj[u]) { const nd = d + cost(m, e); if (nd < dist[e.to]) { dist[e.to] = nd; pe[e.to] = { ...e, from: u }; push([nd, e.to]); } } }
  if (dist[t] === Infinity) return null;
  const path: { lat: number; lng: number }[] = [{ lat: pts[t][0], lng: pts[t][1] }]; let len = 0, sh = 0, li = 0, ac = 0;
  for (let u = t; u !== s;) { const e = pe[u]!, g = SEGMENTS[e.s]; len += e.len; sh += e.len * g.sh; li += e.len * g.li; if (g.w) ac += e.len; u = e.from; path.push({ lat: pts[u][0], lng: pts[u][1] }); }
  return { path: path.reverse(), km: len / 1000, mins: Math.max(1, Math.round(len / (m === 'access' ? 67 : 83))), shade: Math.round(sh / len), lit: Math.round(li / len), access: Math.round((ac / len) * 100) };
}
