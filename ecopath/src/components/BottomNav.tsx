import type { NavigationTab } from '../types';
const items: [NavigationTab, string, string][] = [
  ['township-map', 'map', 'Map'], ['climate-sensors', 'thermostat', 'Climate'],
  ['canopy-planner', 'route', 'Routes'], ['rewards', 'redeem', 'Rewards'], ['accessibility', 'accessible', 'Access'],
];
export const BottomNav = ({ currentTab, onSelectTab }: { currentTab: NavigationTab; onSelectTab: (t: NavigationTab) => void }) => (
  <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 h-[4.5rem] pb-[env(safe-area-inset-bottom)] bg-white/95 backdrop-blur-xl border-t border-[#eaedff] flex">
    {items.map(([id, icon, label]) => (
      <button key={id} onClick={() => onSelectTab(id)} className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${currentTab === id ? 'text-[#006948]' : 'text-slate-400'}`}>
        <span className={`material-symbols-outlined ${currentTab === id ? 'bg-[#e6f6ee] rounded-full px-4 py-0.5' : 'px-4 py-0.5'}`}>{icon}</span>{label}
      </button>
    ))}
  </nav>
);
