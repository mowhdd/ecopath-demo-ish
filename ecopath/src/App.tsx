import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { NavigationTab, EducationalPin } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ElminaMap } from './components/ElminaMap';
import { BottomNav } from './components/BottomNav';
import { ClimateSensorsView } from './components/ClimateSensorsView';
import { CanopyRoutePlannerView } from './components/CanopyRoutePlannerView';
import { RewardsView } from './components/RewardsView';
import { AccessibilityRadarView } from './components/AccessibilityRadarView';
import { EduModal } from './components/EduModal';
import { ReportDefectModal } from './components/ReportDefectModal';
import { RewardsModal } from './components/RewardsModal';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('township-map');
  const [userPoints, setUserPoints] = useState<number>(1420);
  const [activeEduPin, setActiveEduPin] = useState<EducationalPin | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleRedeem = (amount: number, voucherName: string) => {
    setUserPoints((prev) => Math.max(0, prev - amount));
    showToast(`Voucher redeemed: ${voucherName} (-${amount} pts)`);
  };

  const handleReportSubmit = (category: string, zone: string, notes: string) => {
    setUserPoints((prev) => prev + 20);
    showToast(`Issue reported: "${category}". Municipal team alerted! +20 Eco-Steps added.`);
  };

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col font-sans selection:bg-[#85f8c4] selection:text-[#002114]">
        {/* Google Maps Platform Quota Banner */}
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Fixed Top Header */}
        <Header points={userPoints} onOpenProfile={() => setIsRewardsModalOpen(true)} />

        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileNavOpen(false);
          }}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {/* Main Screen Content Viewport */}
        <div className="lg:pl-72 flex flex-col flex-1 min-h-screen">
          <main className="relative pt-16 pb-[4.5rem] lg:pb-0 w-full bg-[#faf8ff] flex-1">
            {currentTab === 'township-map' && (
              <ElminaMap onOpenReportModal={() => setIsReportModalOpen(true)} onWalkComplete={(km) => { const pts = Math.round(km * 80); setUserPoints((p) => p + pts); showToast(`Walk complete: ${km.toFixed(1)} km. +${pts} Eco-Steps!`); }} />
            )}

            {currentTab === 'climate-sensors' && (
              <ClimateSensorsView showToast={showToast} />
            )}

            {currentTab === 'canopy-planner' && (
              <CanopyRoutePlannerView
                onSelectRouteAndNavigate={() => {
                  setCurrentTab('township-map');
                  showToast('Canopy Greenway Spine loaded into live map navigation!');
                }}
                showToast={showToast}
              />
            )}

            {currentTab === 'rewards' && (
              <RewardsView
                userPoints={userPoints}
                onRedeem={handleRedeem}
                showToast={showToast}
              />
            )}

            {currentTab === 'accessibility' && (
              <AccessibilityRadarView showToast={showToast} />
            )}
          </main>
        </div>

        {/* Fixed Bottom Telemetry Footer */}
        <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Interactive Modals */}
        <EduModal
          pin={activeEduPin}
          onClose={() => setActiveEduPin(null)}
        />

        <ReportDefectModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
        />

        <RewardsModal
          isOpen={isRewardsModalOpen}
          onClose={() => setIsRewardsModalOpen(false)}
          userPoints={userPoints}
          onRedeem={handleRedeem}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          showToast={showToast}
        />

        {/* Toast Banner */}
        <Toast message={toastMessage} />
      </div>
    </APIProvider>
  );
}
