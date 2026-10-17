// Source: Google Maps Platform Code Assist
import React, { useState, useEffect, useMemo } from 'react';
import {
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { EducationalPin, RouteMode, Landmark, ScannedTownshipPlace, LatLngPoint } from '../types';
import {
  LANDMARKS,
  EDUCATIONAL_PINS,
  BARRIER_FREE_NODES,
  SCANNED_ELMINA_PLACES,
  DEVELOPER_ESG_BENCHMARKS,
  ELMINA_CENTER
} from '../data/mockData';
import { computeElminaRoutes } from '../utils/elminaRouting';
import { MapOverlays } from './map/MapOverlays';
import { NavigationRouteLayer } from './map/NavigationRouteLayer';
import { TownshipScannerDrawer } from './map/TownshipScannerDrawer';
import { DraggableCard } from './common/DraggableCard';

interface TownshipMapProps {
  onOpenEduModal: (pin: EducationalPin) => void;
  onOpenReportModal: () => void;
  onOpenRewardsModal: () => void;
  userPoints: number;
  showToast: (msg: string) => void;
}

// Controller component inside Map that has access to useMap()
const MapCameraController: React.FC<{
  targetCenter: LatLngPoint | null;
  targetZoom: number | null;
  isNightMode: boolean;
  mapType: 'roadmap' | 'satellite' | 'hybrid';
  boundsPoints?: LatLngPoint[];
}> = ({ targetCenter, targetZoom, isNightMode, mapType, boundsPoints }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (boundsPoints && boundsPoints.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      boundsPoints.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 120, bottom: 120, left: 120, right: 120 });
      return;
    }
    if (targetCenter) {
      map.panTo(targetCenter);
    }
    if (targetZoom) {
      map.setZoom(targetZoom);
    }
  }, [map, targetCenter, targetZoom, boundsPoints]);

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapType);
  }, [map, mapType]);

  // Night vs Day biophilic map styling
  useEffect(() => {
    if (!map) return;

    if (mapType === 'satellite') {
      map.setOptions({ styles: [] });
      return;
    }

    if (isNightMode) {
      map.setOptions({
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#131b2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#131b2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#85f8c4' }] },
          { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#68dba9' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#68dba9' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#003824' }] },
          { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#85f8c4' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c2541' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#283044' }] },
          { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#dae2fd' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d4a42' }] },
          { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#131b2e' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#283044' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#002114' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#00855d' }] }
        ]
      });
    } else {
      map.setOptions({
        styles: [
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e0f5ea' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c4e8dd' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#feeac9' }] }
        ]
      });
    }
  }, [map, isNightMode, mapType]);

  return null;
};

export const TownshipMap: React.FC<TownshipMapProps> = ({
  onOpenEduModal,
  onOpenReportModal,
  onOpenRewardsModal,
  userPoints,
  showToast
}) => {
  // =========================================================================
  // DISPLAY / DONT DISPLAY VISIBILITY TOGGLES
  // =========================================================================
  const [displayLayers, setDisplayLayers] = useState({
    canopy: true,
    nightLighting: true,
    barrierFree: true,
    townshipMesh: true,
    routes: true,
    landmarks: true,
    eduPins: true
  });

  // Master Clean View (Zen Mode: Hides all UI panels for a clean full-map view)
  const [isCleanMapMode, setIsCleanMapMode] = useState(false);

  // Panel Minimization States (Fold into compact pills)
  const [isRouteCardMinimized, setIsRouteCardMinimized] = useState(false);
  const [isRouteCardVisible, setIsRouteCardVisible] = useState(true);
  const [showDisplayOptionsModal, setShowDisplayOptionsModal] = useState(false);

  // Selected Active Navigation Path Focus
  const [selectedRoutePreference, setSelectedRoutePreference] = useState<'shade' | 'night' | 'barrier' | 'all'>('all');

  const [isNightMode, setIsNightMode] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Camera navigation triggers
  const [cameraCenter, setCameraCenter] = useState<LatLngPoint | null>(null);
  const [cameraZoom, setCameraZoom] = useState<number | null>(null);
  const [cameraBounds, setCameraBounds] = useState<LatLngPoint[] | undefined>(undefined);

  // Selected Landmark / Pin for InfoWindow
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  // Dynamic Route Origin & Destination (Can be ANY landmark in City of Elmina!)
  const [originId, setOriginId] = useState('elmina-sports-park');
  const [destId, setDestId] = useState('rainbow-bridge');
  const [showWaypointPicker, setShowWaypointPicker] = useState<'origin' | 'dest' | null>(null);

  // Custom Origin / Destination Pin overrides (when user drags markers on the map)
  const [customOriginPos, setCustomOriginPos] = useState<LatLngPoint | null>(null);
  const [customDestPos, setCustomDestPos] = useState<LatLngPoint | null>(null);

  // Live Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navProgress, setNavProgress] = useState(0);

  // Developer ESG Telemetry Drawer
  const [showDeveloperHud, setShowDeveloperHud] = useState(false);

  // Township Eco-Scanner Drawer State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPlaces, setScannedPlaces] = useState<ScannedTownshipPlace[]>(SCANNED_ELMINA_PLACES);

  // 1. DYNAMICALLY COMPUTE ALL ROUTES FOR THE CURRENT ORIGIN AND DESTINATION
  const calculatedRoutes = useMemo(() => {
    return computeElminaRoutes(originId, destId);
  }, [originId, destId]);

  const originLandmark = LANDMARKS.find((l) => l.id === originId) || LANDMARKS[0];
  const destLandmark = LANDMARKS.find((l) => l.id === destId) || LANDMARKS[1];

  const currentOriginPos = customOriginPos || originLandmark.position;
  const currentDestPos = customDestPos || destLandmark.position;

  // Active path to traverse during walk navigation
  const activeNavigationPath = useMemo(() => {
    if (selectedRoutePreference === 'night') return calculatedRoutes.nightPath;
    if (selectedRoutePreference === 'barrier') return calculatedRoutes.barrierPath;
    return calculatedRoutes.shadePath;
  }, [selectedRoutePreference, calculatedRoutes]);

  // Navigation Simulation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isNavigating) {
      interval = setInterval(() => {
        setNavProgress((prev) => {
          if (prev >= 100) {
            showToast(`Destination Reached: ${destLandmark.name}! +${Math.round(calculatedRoutes.distanceKm * 80)} Eco-Steps awarded!`);
            setIsNavigating(false);
            return 0;
          }
          return prev + 2;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isNavigating, destLandmark.name, calculatedRoutes.distanceKm, showToast]);

  // Fit camera when origin or destination changes
  useEffect(() => {
    if (currentOriginPos && currentDestPos && !isNavigating) {
      setCameraBounds([currentOriginPos, currentDestPos]);
    }
  }, [originId, destId, customOriginPos, customDestPos]);

  const handleReverseRoute = () => {
    setOriginId(destId);
    setDestId(originId);
    setCustomOriginPos(null);
    setCustomDestPos(null);
    setNavProgress(0);
    showToast(`Route reversed: ${destLandmark.name} ↔ ${originLandmark.name}`);
  };

  const handleRecenter = () => {
    setCameraBounds(undefined);
    setCameraCenter({ ...ELMINA_CENTER });
    setCameraZoom(15);
    showToast('Centered on City of Elmina Central Park & Rainbow Bridge.');
  };

  const handleZoomIn = () => {
    setCameraBounds(undefined);
    setCameraZoom((prev) => (prev ? prev + 1 : 16));
  };

  const handleZoomOut = () => {
    setCameraBounds(undefined);
    setCameraZoom((prev) => (prev ? prev - 1 : 14));
  };

  const handleStartNav = () => {
    if (isNavigating) {
      setIsNavigating(false);
      setNavProgress(0);
      showToast('Walk navigation stopped.');
    } else {
      setIsNavigating(true);
      setNavProgress(0);
      showToast(`Navigation active: ${originLandmark.name} → ${destLandmark.name} (${calculatedRoutes.distanceKm} km, ~${calculatedRoutes.walkingMinutes} mins)!`);
    }
  };

  // Run Township Scanner Simulation
  const handleTriggerScan = () => {
    setIsScanning(true);
    setIsScannerOpen(true);
    showToast('Scanning all City of Elmina precincts for canopies, solar smart lights & step-free paths...');

    setTimeout(() => {
      setIsScanning(false);
      showToast(`Scan complete: Found ${SCANNED_ELMINA_PLACES.length} certified locations across Elmina!`);
    }, 1000);
  };

  const handleFlyToScannedPlace = (place: ScannedTownshipPlace) => {
    setCameraBounds(undefined);
    setCameraCenter(place.position);
    setCameraZoom(17);
    showToast(`Viewing: ${place.name} (${place.canopyCoverage}% Canopy, ${place.luxLevel} Lux, ${place.slopeGrade}% Slope)`);
  };

  const handleRouteToScannedPlace = (place: ScannedTownshipPlace) => {
    const matched = LANDMARKS.find((l) => l.name.toLowerCase().includes(place.name.toLowerCase().slice(0, 8)));
    if (matched) {
      setDestId(matched.id);
    } else {
      setDestId('rainbow-bridge');
    }
    setCustomDestPos(place.position);
    setIsScannerOpen(false);
    setIsNavigating(true);
    setNavProgress(0);
    showToast(`Routing to ${place.name} via optimal shaded & barrier-free corridor!`);
  };

  return (
    <div
      className={`relative w-full h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-4rem)] overflow-hidden select-none transition-colors duration-700 ${
        isNightMode ? 'bg-[#131b2e]' : 'bg-[#faf8ff]'
      }`}
      id="township-viewport"
    >
      {/* ========================================================================= */}
      {/* REAL GOOGLE MAP CONTAINER WITH SYNCHRONIZED VECTOR OVERLAYS                */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0">
        <Map
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          mapId="DEMO_MAP_ID"
          defaultCenter={ELMINA_CENTER}
          defaultZoom={15}
          gestureHandling="greedy"
          disableDefaultUI={true}
          className="w-full h-full"
        >
          {/* Synchronized Camera & Theme Controller */}
          <MapCameraController
            targetCenter={cameraCenter}
            targetZoom={cameraZoom}
            isNightMode={isNightMode}
            mapType={mapType}
            boundsPoints={cameraBounds}
          />

          {/* Synchronized Vector Layers with Fine-Grained Display/Don't Display Toggles */}
          <MapOverlays
            showShade={displayLayers.canopy}
            showNight={displayLayers.nightLighting}
            showBarrierFree={displayLayers.barrierFree}
            showTownshipMesh={displayLayers.townshipMesh}
            showRoutes={displayLayers.routes}
            isNightTheme={isNightMode}
            activeShadePath={calculatedRoutes.shadePath}
            activeNightPath={calculatedRoutes.nightPath}
            activeBarrierPath={calculatedRoutes.barrierPath}
            selectedMode={selectedRoutePreference}
            onSelectNode={(title, info) => showToast(`${title}: ${info}`)}
          />

          {/* Real-time GPS Navigation Route & Moving Walker Marker */}
          {displayLayers.routes && (
            <NavigationRouteLayer
              isNavigating={isNavigating}
              navProgress={navProgress}
              routePath={activeNavigationPath}
            />
          )}

          {/* REAL ADVANCED MARKERS: ALL ELMINA TOWNSHIP LANDMARKS (DRAGGABLE WAYPOINTS) */}
          {displayLayers.landmarks &&
            LANDMARKS.map((lm) => {
              const isOrigin = lm.id === originId;
              const isDest = lm.id === destId;
              const markerPos = isOrigin ? currentOriginPos : isDest ? currentDestPos : lm.position;

              return (
                <AdvancedMarker
                  key={lm.id}
                  position={markerPos}
                  title={isOrigin ? 'Origin (Drag to relocate)' : isDest ? 'Destination (Drag to relocate)' : lm.name}
                  onClick={() => setSelectedLandmark(lm)}
                >
                  <div className="group cursor-pointer transform hover:scale-115 transition-all flex flex-col items-center">
                    <div
                      className={`px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-1.5 border backdrop-blur-md transition-all ${
                        isOrigin
                          ? 'bg-[#006948] text-white border-[#85f8c4] ring-2 ring-[#85f8c4]'
                          : isDest
                          ? 'bg-[#a36700] text-white border-[#ffddb8] ring-2 ring-[#ffddb8]'
                          : lm.id === 'rainbow-bridge'
                          ? 'bg-gradient-to-r from-red-500 via-amber-400 to-blue-500 text-white font-extrabold border-white'
                          : lm.id === 'erkc-rainforest'
                          ? 'bg-[#005137] text-white border-[#85f8c4]'
                          : 'bg-white/95 text-[#131b2e] border-[#dae2fd]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isOrigin ? 'trip_origin' : isDest ? 'sports_score' : lm.icon}
                      </span>
                      <span className="text-xs font-bold whitespace-nowrap">
                        {isOrigin ? `[Origin] ${lm.name}` : isDest ? `[Dest] ${lm.name}` : lm.name}
                      </span>
                    </div>
                    <div
                      className={`w-2.5 h-2.5 rotate-45 -mt-1 shadow-xs ${
                        isOrigin ? 'bg-[#006948]' : isDest ? 'bg-[#a36700]' : 'bg-white'
                      }`}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}

          {/* REAL ADVANCED MARKERS: EDUCATIONAL MECHANISM PINS */}
          {displayLayers.eduPins &&
            EDUCATIONAL_PINS.map((pin) => (
              <AdvancedMarker
                key={pin.id}
                position={pin.position}
                title={pin.name}
                onClick={() => onOpenEduModal(pin)}
              >
                <div className="cursor-pointer group flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white shadow-lg border-2 border-[#006948] flex items-center justify-center text-[#006948] group-hover:scale-125 transition-transform">
                      <span className="material-symbols-outlined text-[16px]">{pin.icon}</span>
                    </div>
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#6cf8bb] animate-ping" />
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold whitespace-nowrap shadow-md">
                    {pin.name}
                  </span>
                </div>
              </AdvancedMarker>
            ))}

          {/* REAL ADVANCED MARKERS: BARRIER-FREE RAMPS & HUBS */}
          {displayLayers.barrierFree &&
            BARRIER_FREE_NODES.map((node) => (
              <AdvancedMarker
                key={node.id}
                position={node.position}
                title={node.title}
                onClick={() => showToast(`${node.title}: ${node.desc}`)}
              >
                <div className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded-xl bg-[#005137] text-white text-[10px] font-bold shadow-lg border border-[#85f8c4] hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-[13px]">accessible</span>
                  <span>{node.grade}</span>
                </div>
              </AdvancedMarker>
            ))}

          {/* INFOWINDOW FOR SELECTED LANDMARK */}
          {selectedLandmark && (
            <InfoWindow
              position={selectedLandmark.position}
              onCloseClick={() => setSelectedLandmark(null)}
            >
              <div className="p-2 max-w-xs text-[#131b2e] font-sans">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#006948] text-[20px]">
                    {selectedLandmark.icon}
                  </span>
                  <h4 className="font-bold text-sm text-[#131b2e]">{selectedLandmark.name}</h4>
                </div>
                <p className="text-[11px] text-[#3d4a42] mb-2">{selectedLandmark.subtitle}</p>

                {selectedLandmark.description && (
                  <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
                    {selectedLandmark.description}
                  </p>
                )}

                {/* Microclimate telemetry scores */}
                <div className="grid grid-cols-3 gap-1 mb-2.5 text-center text-[10px]">
                  <div className="bg-[#f5fff7] p-1 rounded-lg border border-[#85f8c4]">
                    <span className="text-slate-500 block">Canopy</span>
                    <strong className="text-[#006948] font-bold">{selectedLandmark.shadeScore}%</strong>
                  </div>
                  <div className="bg-[#fffbff] p-1 rounded-lg border border-[#ffddb8]">
                    <span className="text-slate-500 block">Lighting</span>
                    <strong className="text-[#a36700] font-bold">{selectedLandmark.lightScore}%</strong>
                  </div>
                  <div className="bg-[#f2f3ff] p-1 rounded-lg border border-[#dae2fd]">
                    <span className="text-slate-500 block">Step-Free</span>
                    <strong className="text-[#005137] font-bold">{selectedLandmark.barrierFreeScore}%</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOriginId(selectedLandmark.id);
                      setCustomOriginPos(null);
                      setSelectedLandmark(null);
                      showToast(`Origin set to ${selectedLandmark.name}`);
                    }}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl transition-colors ${
                      originId === selectedLandmark.id
                        ? 'bg-[#006948] text-white'
                        : 'bg-[#eaedff] hover:bg-[#dae2fd] text-[#131b2e]'
                    }`}
                  >
                    Set Origin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDestId(selectedLandmark.id);
                      setCustomDestPos(null);
                      setSelectedLandmark(null);
                      showToast(`Destination set to ${selectedLandmark.name}`);
                    }}
                    className={`flex-1 py-1.5 px-2 text-[11px] font-bold rounded-xl transition-colors ${
                      destId === selectedLandmark.id
                        ? 'bg-[#a36700] text-white'
                        : 'bg-[#006948] hover:bg-[#00855d] text-white shadow-xs'
                    }`}
                  >
                    Set Destination
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>

      {/* ========================================================================= */}
      {/* FLOATING TOP BAR (VISIBLE UNLESS IN CLEAN MAP MODE)                        */}
      {/* ========================================================================= */}
      {!isCleanMapMode && (
        <div className="absolute top-4 left-4 sm:left-6 right-4 sm:right-6 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none animate-in fade-in duration-200">
          {/* Dynamic Route Waypoint Selector for ANY Elmina Landmark */}
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-xl px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg border border-[#dae2fd]/70">
            {/* Origin Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWaypointPicker(showWaypointPicker === 'origin' ? null : 'origin')}
                className="flex items-center gap-2 pr-2 hover:opacity-80 transition-opacity text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#006948] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold leading-none">
                    Origin
                  </span>
                  <span className="font-sans text-xs text-[#131b2e] font-bold truncate max-w-[120px] sm:max-w-none">
                    {originLandmark.name}
                  </span>
                </div>
              </button>

              {showWaypointPicker === 'origin' && (
                <div className="absolute left-0 mt-3 w-80 bg-white rounded-3xl p-3 shadow-2xl border border-[#dae2fd] z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1">
                      Select Origin Landmark
                    </span>
                    <span className="text-[10px] text-[#006948] font-bold">8 Elmina Hubs</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {LANDMARKS.filter((l) => l.id !== destId).map((lm) => (
                      <button
                        key={lm.id}
                        onClick={() => {
                          setOriginId(lm.id);
                          setCustomOriginPos(null);
                          setShowWaypointPicker(null);
                          showToast(`Origin changed: ${lm.name}`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-2xl text-xs hover:bg-[#eaedff] flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#006948] group-hover:scale-110 transition-transform">
                            {lm.icon}
                          </span>
                          <div>
                            <div className="font-semibold text-[#131b2e]">{lm.name}</div>
                            <div className="text-[10px] text-slate-400">{lm.subtitle}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#006948] bg-[#f5fff7] px-2 py-0.5 rounded-full">
                          {lm.shadeScore}% Shade
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleReverseRoute}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#eaedff] hover:bg-[#dae2fd] text-[#131b2e] transition-transform active:scale-90"
              title="Swap Origin and Destination"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
            </button>

            {/* Destination Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowWaypointPicker(showWaypointPicker === 'dest' ? null : 'dest')}
                className="flex items-center gap-2 pl-1 pr-2 hover:opacity-80 transition-opacity text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#a36700] shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold leading-none">
                    Destination
                  </span>
                  <span className="font-sans text-xs text-[#a36700] font-bold truncate max-w-[120px] sm:max-w-none">
                    {destLandmark.name}
                  </span>
                </div>
              </button>

              {showWaypointPicker === 'dest' && (
                <div className="absolute left-0 mt-3 w-80 bg-white rounded-3xl p-3 shadow-2xl border border-[#dae2fd] z-50 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-1">
                      Select Destination Landmark
                    </span>
                    <span className="text-[10px] text-[#006948] font-bold">8 Elmina Hubs</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {LANDMARKS.filter((l) => l.id !== originId).map((lm) => (
                      <button
                        key={lm.id}
                        onClick={() => {
                          setDestId(lm.id);
                          setCustomDestPos(null);
                          setShowWaypointPicker(null);
                          showToast(`Destination changed: ${lm.name}`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-2xl text-xs hover:bg-[#eaedff] flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[18px] text-[#006948] group-hover:scale-110 transition-transform">
                            {lm.icon}
                          </span>
                          <div>
                            <div className="font-semibold text-[#131b2e]">{lm.name}</div>
                            <div className="text-[10px] text-slate-400">{lm.subtitle}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-[#a36700] bg-[#fffbff] px-2 py-0.5 rounded-full">
                          {lm.lightScore}% Lux
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Floating Actions: Scan Township Radar & Eco-Steps Badge */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* SCAN TOWNSHIP ACTION BUTTON */}
            <button
              type="button"
              onClick={handleTriggerScan}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#006948] to-[#00855d] text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.03] active:scale-[0.98] border border-[#85f8c4]/40 font-bold text-xs"
              title="Scan Elmina for real shaded canopies, light poles, and accessible paths"
            >
              <span className="material-symbols-outlined text-[18px] text-[#85f8c4] animate-pulse">
                radar
              </span>
              <span className="hidden sm:inline">Scan Elmina Area</span>
            </button>

            {/* DISPLAY / DONT DISPLAY OPTIONS BUTTON */}
            <button
              type="button"
              onClick={() => setShowDisplayOptionsModal(!showDisplayOptionsModal)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-sans text-xs font-bold shadow-md transition-all ${
                showDisplayOptionsModal
                  ? 'bg-[#006948] text-white'
                  : 'bg-white/95 text-[#3d4a42] hover:bg-[#eaedff] border border-[#dae2fd]/70'
              }`}
              title="Layer Visibility & Display Filters"
            >
              <span className="material-symbols-outlined text-[18px]">layers</span>
              <span className="hidden md:inline">Display Layers</span>
            </button>

            {/* ECO-STEPS BALANCE */}
            <button
              type="button"
              onClick={onOpenRewardsModal}
              className="flex items-center gap-2 bg-white/95 hover:bg-white px-3.5 py-2 rounded-full text-[#131b2e] shadow-lg border border-[#dae2fd] transition-all transform hover:scale-[1.02]"
              title="Open Eco-Steps Rewards"
            >
              <span className="material-symbols-outlined text-[18px] text-[#006948]">eco</span>
              <div className="flex flex-col text-left">
                <span className="font-sans text-[9px] text-[#006948] leading-none uppercase tracking-wider font-extrabold">
                  Eco-Steps
                </span>
                <span className="font-sans text-xs font-bold text-[#131b2e]">
                  {userPoints.toLocaleString()} pts
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DRAGGABLE & MINIMIZABLE MULTI-PATH ROUTING CARD                            */}
      {/* ========================================================================= */}
      {!isCleanMapMode && isRouteCardVisible && (
        <div className="absolute top-20 left-4 sm:left-6 z-30 max-w-[calc(100vw-2rem)] sm:w-[410px]">
          <DraggableCard
            title="Connected Multi-Corridor Routing"
            icon="hub"
            badge={`${calculatedRoutes.distanceKm} km`}
            isMinimized={isRouteCardMinimized}
            onToggleMinimize={() => setIsRouteCardMinimized(!isRouteCardMinimized)}
            onClose={() => setIsRouteCardVisible(false)}
            minimizedContent={
              <div className="flex items-center justify-between px-2 py-1">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#006948] shrink-0" />
                  <span className="font-bold text-[#131b2e] truncate">
                    {originLandmark.name} → {destLandmark.name}
                  </span>
                  <span className="text-slate-400 shrink-0">({calculatedRoutes.distanceKm} km)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRouteCardMinimized(false)}
                  className="text-[11px] font-bold text-[#006948] underline shrink-0 ml-2"
                >
                  Expand
                </button>
              </div>
            }
          >
            <div className="p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#3d4a42] font-semibold">
                  Walking ETA: ~{calculatedRoutes.walkingMinutes} mins
                </span>
                <button
                  type="button"
                  onClick={() => setDisplayLayers((prev) => ({ ...prev, routes: !prev.routes }))}
                  className={`text-[11px] font-bold flex items-center gap-1 ${
                    displayLayers.routes ? 'text-[#006948]' : 'text-slate-400'
                  }`}
                  title="Toggle display of route lines on map"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {displayLayers.routes ? 'visibility' : 'visibility_off'}
                  </span>
                  <span>{displayLayers.routes ? 'Displaying Routes' : 'Routes Hidden'}</span>
                </button>
              </div>

              {/* 3 Simultaneous Path Cards */}
              <div className="grid grid-cols-3 gap-1.5">
                {/* 1. Shade Route */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoutePreference('shade');
                    setDisplayLayers((prev) => ({ ...prev, canopy: true, routes: true }));
                    showToast(`Focused on Shade Canopy Route (${calculatedRoutes.shadePercent}% Shaded, ${calculatedRoutes.temperatureRelief})`);
                  }}
                  className={`p-2 rounded-2xl flex flex-col text-left transition-all border ${
                    selectedRoutePreference === 'shade'
                      ? 'bg-[#f5fff7] border-[#006948] ring-2 ring-[#006948]/20 shadow-xs'
                      : 'bg-[#faf8ff] border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[#006948] font-bold text-xs mb-0.5">
                    <span className="material-symbols-outlined text-[15px]">forest</span>
                    <span>Canopy</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#131b2e]">
                    {calculatedRoutes.shadePercent}% Shade
                  </span>
                  <span className="text-[9px] text-[#00855d] font-semibold">
                    {calculatedRoutes.temperatureRelief} cooling
                  </span>
                </button>

                {/* 2. SafeNight Route */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoutePreference('night');
                    setDisplayLayers((prev) => ({ ...prev, nightLighting: true, routes: true }));
                    if (!isNightMode) setIsNightMode(true);
                    showToast(`Focused on SafeNight Corridor (${calculatedRoutes.nightLux} Lux, 100% solar LED lighting)`);
                  }}
                  className={`p-2 rounded-2xl flex flex-col text-left transition-all border ${
                    selectedRoutePreference === 'night'
                      ? 'bg-[#fffbff] border-[#a36700] ring-2 ring-[#a36700]/20 shadow-xs'
                      : 'bg-[#faf8ff] border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[#a36700] font-bold text-xs mb-0.5">
                    <span className="material-symbols-outlined text-[15px]">light_mode</span>
                    <span>SafeNight</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#131b2e]">
                    {calculatedRoutes.nightLux} Lux
                  </span>
                  <span className="text-[9px] text-[#825100] font-semibold">
                    Continuous solar
                  </span>
                </button>

                {/* 3. Barrier-Free Route */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoutePreference('barrier');
                    setDisplayLayers((prev) => ({ ...prev, barrierFree: true, routes: true }));
                    showToast(`Focused on Barrier-Free Accessible Route (Max ${calculatedRoutes.maxGradePercent}% grade, zero stairs)`);
                  }}
                  className={`p-2 rounded-2xl flex flex-col text-left transition-all border ${
                    selectedRoutePreference === 'barrier'
                      ? 'bg-[#f2f3ff] border-[#005137] ring-2 ring-[#005137]/20 shadow-xs'
                      : 'bg-[#faf8ff] border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[#005137] font-bold text-xs mb-0.5">
                    <span className="material-symbols-outlined text-[15px]">accessible</span>
                    <span>Step-Free</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-[#131b2e]">
                    {calculatedRoutes.maxGradePercent}% Grade
                  </span>
                  <span className="text-[9px] text-[#006c49] font-semibold">
                    0 steps • tactile
                  </span>
                </button>
              </div>

              {/* Show All Paths Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoutePreference('all');
                    setDisplayLayers((prev) => ({
                      ...prev,
                      canopy: true,
                      nightLighting: true,
                      barrierFree: true,
                      routes: true
                    }));
                    showToast('Displaying all 3 routes concurrently on the map!');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    selectedRoutePreference === 'all'
                      ? 'bg-[#006948] text-white shadow-xs'
                      : 'bg-[#eaedff] text-[#131b2e] hover:bg-[#dae2fd]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">hub</span>
                  <span>Show All 3 Candidate Routes</span>
                </button>

                <span className="text-[10px] text-slate-400">
                  Drag card to reposition
                </span>
              </div>
            </div>
          </DraggableCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DISPLAY / DONT DISPLAY LAYER MANAGER MODAL                                 */}
      {/* ========================================================================= */}
      {showDisplayOptionsModal && (
        <div className="absolute top-20 right-4 sm:right-20 z-40 w-72 bg-white/98 backdrop-blur-2xl rounded-3xl p-4 shadow-2xl border border-[#dae2fd] animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
            <span className="font-headline font-bold text-xs text-[#131b2e] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#006948]">visibility</span>
              Display & Visibility Options
            </span>
            <button
              type="button"
              onClick={() => setShowDisplayOptionsModal(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          <div className="space-y-1.5 text-xs">
            {/* Toggle Canopy */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-[#131b2e] font-medium">
                <span>🌲</span> Tree Canopies & Forests
              </span>
              <input
                type="checkbox"
                checked={displayLayers.canopy}
                onChange={(e) => setDisplayLayers({ ...displayLayers, canopy: e.target.checked })}
                className="accent-[#006948] w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Toggle SafeNight */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-[#131b2e] font-medium">
                <span>💡</span> SafeNight Lighting Grid
              </span>
              <input
                type="checkbox"
                checked={displayLayers.nightLighting}
                onChange={(e) => setDisplayLayers({ ...displayLayers, nightLighting: e.target.checked })}
                className="accent-[#a36700] w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Toggle Barrier-Free */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-[#131b2e] font-medium">
                <span>♿</span> Barrier-Free Step-Free Paths
              </span>
              <input
                type="checkbox"
                checked={displayLayers.barrierFree}
                onChange={(e) => setDisplayLayers({ ...displayLayers, barrierFree: e.target.checked })}
                className="accent-[#005137] w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Toggle Background Mesh */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-[#131b2e] font-medium">
                <span>🌐</span> Background Township Mesh
              </span>
              <input
                type="checkbox"
                checked={displayLayers.townshipMesh}
                onChange={(e) => setDisplayLayers({ ...displayLayers, townshipMesh: e.target.checked })}
                className="accent-[#006948] w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Toggle Route Polylines */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-[#131b2e] font-medium">
                <span>🛣️</span> Active Navigation Routes
              </span>
              <input
                type="checkbox"
                checked={displayLayers.routes}
                onChange={(e) => setDisplayLayers({ ...displayLayers, routes: e.target.checked })}
                className="accent-[#006948] w-4 h-4 cursor-pointer"
              />
            </label>

            {/* Toggle Landmarks */}
            <label className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-[#131b2e] font-medium">
                <span>📍</span> Landmark Pins
              </span>
              <input
                type="checkbox"
                checked={displayLayers.landmarks}
                onChange={(e) => setDisplayLayers({ ...displayLayers, landmarks: e.target.checked })}
                className="accent-[#006948] w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-slate-100 mt-2 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setDisplayLayers({
                  canopy: true,
                  nightLighting: true,
                  barrierFree: true,
                  townshipMesh: true,
                  routes: true,
                  landmarks: true,
                  eduPins: true
                });
                showToast('All map display layers enabled.');
              }}
              className="text-[#006948] font-bold hover:underline"
            >
              Show All
            </button>
            <button
              type="button"
              onClick={() => {
                setDisplayLayers({
                  canopy: false,
                  nightLighting: false,
                  barrierFree: false,
                  townshipMesh: false,
                  routes: false,
                  landmarks: false,
                  eduPins: false
                });
                showToast('All map display layers hidden.');
              }}
              className="text-slate-500 font-bold hover:underline"
            >
              Hide All
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING MAP TOOLS & CLEAN VIEW TOGGLE (RIGHT SIDE)                       */}
      {/* ========================================================================= */}
      <div className="absolute right-4 sm:right-6 top-20 flex flex-col gap-2 z-30 pointer-events-auto">
        {/* Master Clean View (Zen Mode) Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsCleanMapMode(!isCleanMapMode);
            showToast(isCleanMapMode ? 'Full UI Mode Restored' : 'Clean Map Mode Enabled (Panels Hidden)');
          }}
          className={`w-11 h-11 rounded-2xl shadow-xl border flex items-center justify-center transition-transform active:scale-90 ${
            isCleanMapMode
              ? 'bg-[#006948] text-white border-[#85f8c4] ring-2 ring-[#85f8c4]'
              : 'bg-white/95 text-[#131b2e] border-[#dae2fd] hover:bg-[#eaedff]'
          }`}
          title={isCleanMapMode ? 'Exit Clean Map Mode' : 'Clean View (Hide UI Panels)'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isCleanMapMode ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>

        {/* Recenter */}
        <button
          type="button"
          onClick={handleRecenter}
          className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-[#dae2fd] flex items-center justify-center text-[#131b2e] hover:bg-[#eaedff] transition-transform active:scale-90"
          title="Recenter on Elmina Central Park"
        >
          <span className="material-symbols-outlined text-[20px]">my_location</span>
        </button>

        {/* Zoom In */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-[#dae2fd] flex items-center justify-center text-[#131b2e] hover:bg-[#eaedff] transition-transform active:scale-90"
          title="Zoom In"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>

        {/* Zoom Out */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="w-11 h-11 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-[#dae2fd] flex items-center justify-center text-[#131b2e] hover:bg-[#eaedff] transition-transform active:scale-90"
          title="Zoom Out"
        >
          <span className="material-symbols-outlined text-[20px]">remove</span>
        </button>

        {/* Satellite / Roadmap Toggle */}
        <button
          type="button"
          onClick={() => {
            const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
            setMapType(nextType);
            showToast(`Map mode: ${nextType === 'satellite' ? 'Aerial Satellite Imagery' : 'Eco-Roadmap'}`);
          }}
          className={`w-11 h-11 rounded-2xl shadow-lg border flex items-center justify-center transition-transform active:scale-90 ${
            mapType === 'satellite'
              ? 'bg-[#006948] text-white border-[#85f8c4]'
              : 'bg-white/95 text-[#131b2e] border-[#dae2fd] hover:bg-[#eaedff]'
          }`}
          title="Toggle Satellite Aerial Imagery"
        >
          <span className="material-symbols-outlined text-[20px]">satellite_alt</span>
        </button>

        {/* Night / Day Styling Toggle */}
        <button
          type="button"
          onClick={() => {
            setIsNightMode(!isNightMode);
            showToast(isNightMode ? 'Day Biophilic Mode' : 'Night SafeNight Vision');
          }}
          className={`w-11 h-11 rounded-2xl shadow-lg border flex items-center justify-center transition-transform active:scale-90 ${
            isNightMode
              ? 'bg-[#1c2541] text-[#ffb95f] border-[#ffb95f]'
              : 'bg-white/95 text-[#131b2e] border-[#dae2fd] hover:bg-[#eaedff]'
          }`}
          title="Toggle Night Vision Mode"
        >
          <span className="material-symbols-outlined text-[20px]">
            {isNightMode ? 'dark_mode' : 'light_mode'}
          </span>
        </button>

        {/* Re-open Route Card if closed */}
        {!isRouteCardVisible && !isCleanMapMode && (
          <button
            type="button"
            onClick={() => setIsRouteCardVisible(true)}
            className="w-11 h-11 rounded-2xl bg-[#006948] text-white shadow-lg flex items-center justify-center hover:bg-[#00855d] transition-transform active:scale-90"
            title="Display Route Panel"
          >
            <span className="material-symbols-outlined text-[20px]">route</span>
          </button>
        )}

        {/* Report Civic Defect Trigger */}
        <button
          type="button"
          onClick={onOpenReportModal}
          className="w-11 h-11 rounded-2xl bg-[#fffbff] border border-[#ffddb8] shadow-lg flex items-center justify-center text-[#825100] hover:bg-[#ffddb8]/40 transition-transform active:scale-90"
          title="Report Broken Streetlight or Path Defect"
        >
          <span className="material-symbols-outlined text-[20px]">report_problem</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE NAVIGATION LIVE HUD BANNER                                          */}
      {/* ========================================================================= */}
      {isNavigating && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-xl bg-[#006948] text-white px-5 py-3.5 rounded-3xl shadow-2xl flex items-center justify-between border border-[#85f8c4]/40 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#85f8c4] text-[#002114] flex items-center justify-center font-bold shadow-md">
              <span className="material-symbols-outlined text-[22px]">turn_slight_right</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">
                {originLandmark.name} → {destLandmark.name}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-[#85f8c4] mt-0.5">
                <span>ETA: {Math.max(1, Math.round(calculatedRoutes.walkingMinutes * (1 - navProgress / 100)))} mins</span>
                <span>•</span>
                <span>{((calculatedRoutes.distanceKm * (100 - navProgress)) / 100).toFixed(2)} km left</span>
                <span>•</span>
                <span className="bg-[#6cf8bb]/30 px-1.5 py-0.2 rounded text-white font-bold">
                  {calculatedRoutes.shadePercent}% Shaded • 0 Steps
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsNavigating(false)}
            className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold text-white transition-colors"
          >
            End
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* START NAVIGATION FLOATING ACTION BUTTON (WHEN NOT NAVIGATING)             */}
      {/* ========================================================================= */}
      {!isNavigating && !isCleanMapMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={handleStartNav}
            className="px-6 py-3 rounded-full bg-[#006948] hover:bg-[#00855d] text-white font-bold text-sm shadow-2xl flex items-center gap-2.5 border border-[#85f8c4]/50 transform hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[20px] text-[#85f8c4]">
              directions_walk
            </span>
            <span>Navigate: {originLandmark.name} → {destLandmark.name}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerScan}
            className="px-4 py-3 rounded-full bg-white/95 hover:bg-white text-[#131b2e] font-bold text-xs shadow-xl flex items-center gap-1.5 border border-[#dae2fd] transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-[#006948]">
              radar
            </span>
            <span>View Scanner</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOWNSHIP ECO-SCANNER RESULTS DRAWER (DRAGGABLE & MINIMIZABLE)              */}
      {/* ========================================================================= */}
      <TownshipScannerDrawer
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        isScanning={isScanning}
        onTriggerScan={handleTriggerScan}
        scannedPlaces={scannedPlaces}
        onFlyToPlace={handleFlyToScannedPlace}
        onRouteToPlace={handleRouteToScannedPlace}
      />

      {/* ========================================================================= */}
      {/* DEVELOPER ESG TELEMETRY DRAWER (DRAGGABLE & COLLAPSIBLE)                  */}
      {/* ========================================================================= */}
      {showDeveloperHud && (
        <div className="absolute top-20 right-6 z-40 max-w-[90vw] sm:w-96 pointer-events-auto">
          <DraggableCard
            title="Developer ESG Planning Toolkit"
            icon="architecture"
            badge="GBI Platinum"
            onClose={() => setShowDeveloperHud(false)}
          >
            <div className="p-4 flex flex-col gap-2.5 text-xs">
              <div className="p-2.5 bg-[#f5fff7] rounded-xl border border-[#85f8c4]/60 flex items-center justify-between">
                <span className="text-[#3d4a42]">Master Developer:</span>
                <strong className="text-[#006948]">{DEVELOPER_ESG_BENCHMARKS.masterDeveloper}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#f2f3ff] rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Total Township Footprint</span>
                  <span className="font-bold text-[#131b2e] text-sm">{DEVELOPER_ESG_BENCHMARKS.totalArea}</span>
                </div>
                <div className="p-2.5 bg-[#f2f3ff] rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Central Park Wetland</span>
                  <span className="font-bold text-[#006948] text-sm">{DEVELOPER_ESG_BENCHMARKS.centralParkSize}</span>
                </div>
                <div className="p-2.5 bg-[#f2f3ff] rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Connected Cycle Track</span>
                  <span className="font-bold text-[#131b2e] text-sm">{DEVELOPER_ESG_BENCHMARKS.joggingCyclingTrack}</span>
                </div>
                <div className="p-2.5 bg-[#f2f3ff] rounded-xl">
                  <span className="text-[10px] text-slate-500 block">Native Tree Target</span>
                  <span className="font-bold text-[#006948] text-sm">{DEVELOPER_ESG_BENCHMARKS.nativeTreesTarget}</span>
                </div>
              </div>

              <div className="p-2.5 bg-[#faf8ff] rounded-xl border border-[#dae2fd] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#131b2e]">Green Building Index (GBI):</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#6cf8bb] text-[#00714d] text-[10px] font-bold">Platinum</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#3d4a42]">
                  <span>Annual Carbon Sequestration:</span>
                  <strong className="text-[#006948]">{DEVELOPER_ESG_BENCHMARKS.annualCarbonOffset}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#3d4a42]">
                  <span>Mean Radiant Temp Cooling:</span>
                  <strong className="text-[#006c49]">{DEVELOPER_ESG_BENCHMARKS.meanRadiantTempReduction}</strong>
                </div>
              </div>
            </div>
          </DraggableCard>
        </div>
      )}
    </div>
  );
};
