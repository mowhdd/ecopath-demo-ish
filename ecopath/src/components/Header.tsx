import logo from '../assets/logo.png';
export const Header = ({ points, onOpenProfile }: { points: number; onOpenProfile: () => void }) => (
  <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white/90 backdrop-blur-xl border-b border-[#eaedff] flex items-center justify-between px-4 lg:px-6">
    <div className="flex items-center gap-2.5">
      <img src={logo} alt="EcoPath logo" className="h-10 w-auto" />
      <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-[#1e5a3c] tracking-tight">ecopath</span>
    </div>
    <button onClick={onOpenProfile} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#e6f6ee] text-[#006948] text-sm font-bold">
      <span className="material-symbols-outlined text-[18px]">eco</span>{points.toLocaleString()}
    </button>
  </header>
);
