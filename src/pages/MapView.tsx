import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Truck,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Phone,
  Layers,
  Calendar,
  Compass,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Crosshair,
  Building2,
  ChevronRight,
  TrendingUp,
  Receipt,
  Sparkles,
  X
} from 'lucide-react';
import { MapService, CustomerService, RouteService } from '../services/api';
import { MapFleetData, MapFleetLorry, MapFleetCustomer, Route as RouteType, LorryLocationHistory, RouteOptimizationResult } from '../types';
import { useCurrency } from '../context/CurrencyContext';

// Default map center (Sri Lanka - Kandy/Kadugannawa region where Sunbakers is located)
const DEFAULT_CENTER: [number, number] = [7.2558, 80.5284];
const DEFAULT_ZOOM = 12;

interface MapViewProps {
  onNavigateToBillEntry?: (customerId?: string, lorryId?: string) => void;
  onNavigateToLorry?: (lorryId?: string) => void;
  isVisible?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  onNavigateToBillEntry,
  onNavigateToLorry,
  isVisible = true
}) => {
  const { formatMoney } = useCurrency();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups for clean updates without flickering
  const lorryLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const customerLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const routePolylineGroupRef = useRef<L.LayerGroup | null>(null);
  const trailPolylineGroupRef = useRef<L.LayerGroup | null>(null);

  // State
  const [data, setData] = useState<MapFleetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  // Filters & Selection
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLorry, setSelectedLorry] = useState<MapFleetLorry | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<MapFleetCustomer | null>(null);

  // Driver GPS Trail
  const [activeTrailLorryId, setActiveTrailLorryId] = useState<string | null>(null);
  const [trailLoading, setTrailLoading] = useState<boolean>(false);
  const [trailLogs, setTrailLogs] = useState<LorryLocationHistory[]>([]);
  const [trailDate, setTrailDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Layer Toggles
  const [showLorries, setShowLorries] = useState<boolean>(true);
  const [showCustomers, setShowCustomers] = useState<boolean>(true);
  const [showRouteSequence, setShowRouteSequence] = useState<boolean>(true);

  // AI Route Optimization
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimizationResult | null>(null);

  useEffect(() => {
    if (selectedRouteId && selectedRouteId !== 'ALL') {
      RouteService.getOptimizedRoute(selectedRouteId)
        .then(res => setRouteOptimization(res))
        .catch(err => console.warn('[MapView] Route optimization error:', err));
    } else {
      setRouteOptimization(null);
    }
  }, [selectedRouteId]);

  // Pinning Helper Mode (for unpinned stores)
  const [pinningCustomer, setPinningCustomer] = useState<MapFleetCustomer | null>(null);
  const [showUnpinnedDrawer, setShowUnpinnedDrawer] = useState<boolean>(false);

  // 1. Fetch Fleet Data
  const loadFleetData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const fleet = await MapService.getFleetData(selectedRouteId);
      setData(fleet);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err: any) {
      console.error('[MapView] Failed to load fleet map data:', err);
      if (!isSilent) setError('Failed to load fleet map data. Please check your connection.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [selectedRouteId]);

  useEffect(() => {
    loadFleetData();
  }, [loadFleetData]);

  // Auto-refresh interval (every 15s to catch live driver pings)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadFleetData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadFleetData]);

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false
    });

    // Add Tile Layer (Supports CARTO Basemap with API key, Mapbox, Custom Tile Provider, or OpenStreetMap fallback)
    const mapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN || '').trim();
    const customTileUrl = (import.meta.env.VITE_MAP_TILE_URL || '').trim();
    const cartoApiKey = (import.meta.env.VITE_MAP_API_KEY || import.meta.env.VITE_CARTO_API_KEY || 'cb1_4f4i_2_70f5f79149137e9bb04c459c').trim();

    // CARTO Basemaps API strictly requires '?key=YOUR_API_KEY'
    let tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoApiKey}`;
    let tileOptions: L.TileLayerOptions = {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '© OpenStreetMap, © CARTO'
    };

    if (customTileUrl) {
      tileUrl = customTileUrl;
      tileOptions = { maxZoom: 20, attribution: '© Map Provider' };
    } else if (mapboxToken.startsWith('pk.')) {
      // High-resolution Mapbox Streets v12 tiles
      tileUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`;
      tileOptions = {
        maxZoom: 20,
        tileSize: 512,
        zoomOffset: -1,
        attribution: '© Mapbox © OpenStreetMap'
      };
    } else if (!cartoApiKey) {
      // Direct OpenStreetMap tiles without watermark or key requirement
      tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      tileOptions = {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      };
    }

    const tileLayer = L.tileLayer(tileUrl, tileOptions).addTo(map);

    // Automatic seamless fallback to OpenStreetMap if tile error occurs
    tileLayer.on('tileerror', () => {
      if (!customTileUrl && !mapboxToken) {
        tileLayer.setUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
      }
    });

    // Zoom control at bottom right for ergonomic mobile & desktop access
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Attribution at bottom right
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('© OpenStreetMap')
      .addTo(map);

    // Initialize Layer Groups
    lorryLayerGroupRef.current = L.layerGroup().addTo(map);
    customerLayerGroupRef.current = L.layerGroup().addTo(map);
    routePolylineGroupRef.current = L.layerGroup().addTo(map);
    trailPolylineGroupRef.current = L.layerGroup().addTo(map);

    // Click handler for Pinning Mode
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (pinningCustomer) {
        const { lat, lng } = e.latlng;
        try {
          await CustomerService.update(pinningCustomer.id, {
            latitude: lat,
            longitude: lng
          });
          setPinningCustomer(null);
          loadFleetData(true);
        } catch (err) {
          console.error('[MapView] Error saving customer location:', err);
          alert('Failed to save customer coordinates.');
        }
      }
    });

    // Staggered size invalidation to fix Leaflet gray tiles on initial mount
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    // ResizeObserver ensures tile canvas expands immediately when tab or flexbox dimensions change
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    mapInstanceRef.current = map;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [pinningCustomer, loadFleetData]);

  // Trigger size invalidation whenever tab becomes visible
  useEffect(() => {
    if (isVisible && mapInstanceRef.current) {
      const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
      const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 200);
      const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isVisible]);

  // Handle Pinning Cursor on Map Container
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (pinningCustomer) {
      mapContainerRef.current.style.cursor = 'crosshair';
    } else {
      mapContainerRef.current.style.cursor = '';
    }
  }, [pinningCustomer]);

  // 3. Render Lorry Markers
  useEffect(() => {
    if (!lorryLayerGroupRef.current || !data) return;
    lorryLayerGroupRef.current.clearLayers();

    if (!showLorries) return;

    data.lorries.forEach(lorry => {
      if (lorry.currentLatitude == null || lorry.currentLongitude == null) return;

      const isOnline = lorry.isOnline;
      const isSelected = selectedLorry?.id === lorry.id;
      const headingDeg = lorry.heading || 0;

      // Custom high-contrast vehicle pin with status beacon
      const statusColor = isOnline ? '#10B981' : '#F59E0B';
      const statusBadge = isOnline ? 'Online' : 'Idle';

      const customIcon = L.divIcon({
        className: 'custom-lorry-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -50%);">
            <!-- Pulsing Halo if Online -->
            ${
              isOnline
                ? `<div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 44px; height: 44px; border-radius: 9999px; background: rgba(16, 185, 129, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
                : ''
            }
            
            <!-- Vehicle Main Badge -->
            <div style="position: relative; width: 40px; height: 40px; border-radius: 14px; background: ${
              isSelected ? '#0071E3' : '#1E293B'
            }; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2.5px solid white; transition: all 0.2s ease;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <!-- Heading arrow if moving -->
              ${
                lorry.speed && lorry.speed > 5
                  ? `<div style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; border-radius: 9999px; background: #0071E3; color: white; display: flex; align-items: center; justify-content: center; border: 1.5px solid white; transform: rotate(${headingDeg}deg);">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 19 21 12 17 5 21 12 2"></polygon></svg>
                    </div>`
                  : ''
              }
            </div>

            <!-- Vehicle Label Tag -->
            <div style="margin-top: 4px; padding: 2px 6px; border-radius: 6px; background: rgba(15, 23, 42, 0.9); color: white; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.2); display: flex; align-items: center; gap: 4px;">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${statusColor};"></span>
              <span>${lorry.vehicleNumber}</span>
            </div>
          </div>
        `,
        iconSize: [44, 56],
        iconAnchor: [22, 28]
      });

      const marker = L.marker([lorry.currentLatitude, lorry.currentLongitude], { icon: customIcon });

      marker.on('click', () => {
        setSelectedLorry(lorry);
        setSelectedCustomer(null);
      });

      lorryLayerGroupRef.current?.addLayer(marker);
    });
  }, [data, showLorries, selectedLorry]);

  // 4. Render Customer Markers & Filter by Search / Route
  useEffect(() => {
    if (!customerLayerGroupRef.current || !data) return;
    customerLayerGroupRef.current.clearLayers();

    if (!showCustomers) return;

    const query = searchQuery.trim().toLowerCase();

    data.customers.forEach(customer => {
      if (customer.latitude == null || customer.longitude == null) return;

      // Filter by search query if set
      if (query) {
        const matchesName = customer.name.toLowerCase().includes(query);
        const matchesCode = customer.code.toLowerCase().includes(query);
        const matchesPhone = customer.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesPhone) return;
      }

      const hasOverdueBalance = customer.outstandingBalance > 0;
      const isOverCreditLimit = customer.outstandingBalance > customer.creditLimit;
      const isSelected = selectedCustomer?.id === customer.id;

      // Check if customer has a sequence order in the AI optimized route
      const optStop = routeOptimization?.stops.find(s => s.customer.id === customer.id);
      const seqNumber = optStop?.sequence;
      const isVisited = optStop?.status === 'VISITED';

      // Color scheme:
      // Green: Visited today
      // Red: Over limit or high outstanding
      // Orange: Moderate outstanding
      // Blue standard
      let pinColor = '#0071E3'; // Blue standard
      if (isVisited) pinColor = '#10B981'; // Green (Visited today)
      else if (isOverCreditLimit) pinColor = '#EF4444'; // Red
      else if (hasOverdueBalance) pinColor = '#F59E0B'; // Amber

      const customIcon = L.divIcon({
        className: 'custom-customer-icon',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transform: translate(-50%, -100%);">
            <!-- Pin Head -->
            <div style="width: ${isSelected ? '34px' : '28px'}; height: ${
          isSelected ? '34px' : '28px'
        }; border-radius: 9999px 9999px 9999px 0; transform: rotate(-45deg); background: ${pinColor}; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">
              <div style="transform: rotate(45deg); color: white; display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? '12px' : '10px'}; font-weight: 800; font-family: monospace;">
                ${
                  seqNumber != null
                    ? isVisited ? '✓' : seqNumber
                    : `<svg width="${isSelected ? '14' : '12'}" height="${
                        isSelected ? '14' : '12'
                      }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                      </svg>`
                }
              </div>
            </div>

            <!-- Customer Name Label (visible on hover / selected) -->
            ${
              isSelected
                ? `<div style="margin-top: 3px; padding: 2px 6px; border-radius: 6px; background: white; color: #0F172A; font-size: 11px; font-weight: 700; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.2); border: 1px solid #E2E8F0;">
                    ${customer.name} ${seqNumber ? `(#${seqNumber})` : ''}
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40]
      });

      const marker = L.marker([customer.latitude, customer.longitude], { icon: customIcon });

      marker.on('click', () => {
        setSelectedCustomer(customer);
        setSelectedLorry(null);
      });

      // 50-meter Geofence radius circle around store
      const geofenceCircle = L.circle([customer.latitude, customer.longitude], {
        radius: 50,
        color: isVisited ? '#10B981' : isSelected ? '#0071E3' : '#64748B',
        fillColor: isVisited ? '#10B981' : isSelected ? '#0071E3' : '#94A3B8',
        fillOpacity: isSelected ? 0.2 : 0.08,
        weight: isSelected ? 2 : 1.2,
        dashArray: '3, 4'
      });

      customerLayerGroupRef.current?.addLayer(geofenceCircle);
      customerLayerGroupRef.current?.addLayer(marker);
    });
  }, [data, showCustomers, searchQuery, selectedCustomer, routeOptimization]);

  // 5. Draw Delivery Route Sequence Line
  useEffect(() => {
    if (!routePolylineGroupRef.current || !data) return;
    routePolylineGroupRef.current.clearLayers();

    if (!showRouteSequence || selectedRouteId === 'ALL') return;

    let latLngs: [number, number][] = [];

    // Prefer TSP AI Optimized Sequence coordinates if available
    if (routeOptimization && routeOptimization.stops.length >= 2) {
      latLngs = routeOptimization.stops
        .filter(s => s.customer.latitude != null && s.customer.longitude != null)
        .map(s => [s.customer.latitude!, s.customer.longitude!]);
    } else {
      // Fallback: Customers on selected route that have valid coordinates
      const routeCustomers = data.customers.filter(
        c => c.routeId === selectedRouteId && c.latitude != null && c.longitude != null
      );
      if (routeCustomers.length < 2) return;
      latLngs = routeCustomers.map(c => [c.latitude!, c.longitude!]);
    }

    if (latLngs.length < 2) return;

    // Decorative glow polyline
    const routeLine = L.polyline(latLngs, {
      color: '#0071E3',
      weight: 3.5,
      opacity: 0.85,
      dashArray: '6, 8',
      lineCap: 'round',
      lineJoin: 'round'
    });

    routePolylineGroupRef.current.addLayer(routeLine);
  }, [data, selectedRouteId, showRouteSequence, routeOptimization]);

  // 6. Draw Driver Historical GPS Trail
  useEffect(() => {
    if (!trailPolylineGroupRef.current) return;
    trailPolylineGroupRef.current.clearLayers();

    if (!activeTrailLorryId || trailLogs.length === 0) return;

    const trailLatLngs: [number, number][] = trailLogs.map(l => [l.latitude, l.longitude]);

    // Solid trail polyline
    const trailLine = L.polyline(trailLatLngs, {
      color: '#8B5CF6',
      weight: 4.5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    });

    trailPolylineGroupRef.current.addLayer(trailLine);

    // Add start and end point markers
    if (trailLatLngs.length > 0) {
      const startPoint = trailLatLngs[0];
      const endPoint = trailLatLngs[trailLatLngs.length - 1];

      const startIcon = L.divIcon({
        className: 'trail-endpoint-icon',
        html: `<div style="width: 14px; height: 14px; border-radius: 9999px; background: #10B981; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const endIcon = L.divIcon({
        className: 'trail-endpoint-icon',
        html: `<div style="width: 16px; height: 16px; border-radius: 9999px; background: #8B5CF6; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); animation: pulse 1.5s infinite;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      trailPolylineGroupRef.current.addLayer(L.marker(startPoint, { icon: startIcon }));
      trailPolylineGroupRef.current.addLayer(L.marker(endPoint, { icon: endIcon }));
    }
  }, [activeTrailLorryId, trailLogs]);

  // Load Driver Trail
  const handleToggleTrail = async (lorryId: string) => {
    if (activeTrailLorryId === lorryId) {
      setActiveTrailLorryId(null);
      setTrailLogs([]);
      return;
    }

    setTrailLoading(true);
    setActiveTrailLorryId(lorryId);
    try {
      const logs = await MapService.getDriverTrail(lorryId, trailDate);
      setTrailLogs(logs);

      // Fit map to trail bounds if points exist
      if (logs.length > 0 && mapInstanceRef.current) {
        const bounds = L.latLngBounds(logs.map(l => [l.latitude, l.longitude]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      console.error('[MapView] Error loading trail:', err);
      alert('Could not retrieve driver GPS trail for this date.');
    } finally {
      setTrailLoading(false);
    }
  };

  // Fly to target coordinate
  const handleFlyTo = (lat: number, lng: number, zoom = 15) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  // Center on entire fleet
  const handleFitFleet = () => {
    if (!mapInstanceRef.current || !data) return;
    const points: [number, number][] = [];

    data.lorries.forEach(l => {
      if (l.currentLatitude != null && l.currentLongitude != null) {
        points.push([l.currentLatitude, l.currentLongitude]);
      }
    });

    data.customers.forEach(c => {
      if (c.latitude != null && c.longitude != null) {
        points.push([c.latitude, c.longitude]);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    } else {
      mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  };

  const unpinnedCustomers = data?.customers.filter(c => c.latitude == null || c.longitude == null) || [];

  return (
    <div className="relative h-full flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-slate-900 select-none">
      {/* 1. TOP FLOATING CONTROL BAR */}
      <header className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Brand Badge & Route Filter */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200/80">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0071E3] to-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <Navigation className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                Live Fleet Map
              </h1>
              <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                GPS Active
              </span>
            </div>
          </div>

          {/* Route Filter Dropdown */}
          <select
            value={selectedRouteId}
            onChange={e => setSelectedRouteId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0071E3] transition"
          >
            <option value="ALL">All Routes ({data?.routes.length || 0})</option>
            {data?.routes.map(r => (
              <option key={r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Search Store or Lorry */}
        <div className="hidden md:flex items-center pointer-events-auto bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-slate-200/80 w-72">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search store, plate, driver..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-xl border border-slate-200/80">
          {/* Fit Fleet View */}
          <button
            onClick={handleFitFleet}
            title="Fit All Fleet & Stores into View"
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Layer toggles */}
          <button
            onClick={() => setShowCustomers(!showCustomers)}
            title="Toggle Customer Store Markers"
            className={`p-2 rounded-xl transition ${
              showCustomers
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowLorries(!showLorries)}
            title="Toggle Lorry Vehicle Markers"
            className={`p-2 rounded-xl transition ${
              showLorries
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
          </button>

          {/* Unpinned Stores Badge */}
          {unpinnedCustomers.length > 0 && (
            <button
              onClick={() => setShowUnpinnedDrawer(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition text-xs font-bold"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{unpinnedCustomers.length} Unpinned</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => loadFleetData(false)}
            disabled={loading}
            title={`Refresh GPS (Auto-refreshes every 15s)`}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0071E3]' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. PINNING HELPER BANNER (IF ACTIVE) */}
      {pinningCustomer && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl border border-indigo-400/40 flex items-center gap-3 animate-bounce">
          <MapPin className="w-4 h-4 text-white" />
          <div className="text-xs font-semibold">
            Click anywhere on the map to place <span className="underline font-bold">{pinningCustomer.name}</span>
          </div>
          <button
            onClick={() => setPinningCustomer(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {/* 2.1 AI TSP OPTIMIZED ROUTE BANNER */}
      {routeOptimization && !pinningCustomer && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-3 max-w-[90vw] overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Route: {routeOptimization.routeName || routeOptimization.routeCode}</span>
          </div>
          <span className="text-white/40">•</span>
          <span className="text-xs text-slate-200 font-mono shrink-0">
            {routeOptimization.totalDistanceKm} km ({routeOptimization.totalCount} stops)
          </span>
          <span className="text-white/40">•</span>
          <span className="text-xs text-emerald-400 font-bold shrink-0">
            {routeOptimization.visitedCount}/{routeOptimization.totalCount} Visited
          </span>
          {routeOptimization.savedDistanceKm > 0 && (
            <>
              <span className="text-white/40">•</span>
              <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30 shrink-0">
                Saved {routeOptimization.savedDistanceKm} km
              </span>
            </>
          )}
        </div>
      )}

      {/* 3. LEAFLET MAP CANVAS */}
      <style>{`
        .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          background: #e2e8f0 !important;
        }
      `}</style>
      <div
        ref={mapContainerRef}
        className="h-full w-full flex-1 min-h-0 z-0"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />

      {/* 4. BOTTOM FLOATING FLEET STATUS BAR */}
      {data && (
        <footer className="absolute bottom-3 left-3 z-[990] hidden sm:flex items-center gap-3 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">
              {data.stats.onlineLorriesCount} / {data.stats.totalActiveLorries} Lorries Online
            </span>
          </div>

          <div className="flex items-center gap-2 pr-3 border-r border-slate-200 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {data.stats.totalPinnedCustomers} Stores Mapped
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>Today's Sales: {formatMoney(data.stats.todayTotalSales)}</span>
          </div>
        </footer>
      )}

      {/* 5. FLOATING LORRY CARD (WHEN LORRY IS CLICKED) */}
      {selectedLorry && (
        <div className="absolute top-18 right-3 z-[1000] w-88 max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Truck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-base font-black tracking-tight flex items-center gap-2">
                  {selectedLorry.vehicleNumber}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      selectedLorry.isOnline
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    {selectedLorry.isOnline ? 'Online' : 'Idle'}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  {selectedLorry.driverName}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedLorry(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Metrics */}
          <div className="p-5 space-y-4">
            {/* Driver Contact & Route */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Route
                </span>
                <span className="font-bold text-slate-800">
                  {selectedLorry.route?.code || 'None'} — {selectedLorry.route?.name || 'Unassigned'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Last Ping
                </span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {selectedLorry.minutesSinceLastPing != null
                    ? `${selectedLorry.minutesSinceLastPing} min ago`
                    : 'No ping yet'}
                </span>
              </div>
            </div>

            {/* Sales Performance Today */}
            <div className="bg-blue-50/70 border border-blue-200/70 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-blue-700 block uppercase tracking-wider">
                  Today's Route Sales
                </span>
                <span className="text-xl font-black text-slate-900">
                  {formatMoney(selectedLorry.todaySales || 0)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-blue-800 bg-white px-2.5 py-1 rounded-xl border border-blue-200/70 shadow-2xs">
                  {selectedLorry.todayBillsCount || 0} Bills Issued
                </span>
              </div>
            </div>

            {/* Morning Loaded Stock Summary */}
            {selectedLorry.currentLoading && (
              <div className="text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Active Morning Load ({selectedLorry.currentLoading.loadingNumber})
                </span>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-slate-700 flex justify-between">
                  <span>Total Items Loaded:</span>
                  <span className="font-bold text-slate-900">
                    {selectedLorry.currentLoading.totalLoadedItems} units
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {/* GPS Trail Toggle */}
              <button
                onClick={() => handleToggleTrail(selectedLorry.id)}
                disabled={trailLoading}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeTrailLorryId === selectedLorry.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <Compass className="w-4 h-4" />
                {activeTrailLorryId === selectedLorry.id
                  ? 'Hide GPS Day Trail'
                  : 'Show GPS Day Trail (Breadcrumbs)'}
              </button>

              <div className="flex items-center gap-2">
                {selectedLorry.driverPhone && (
                  <a
                    href={`tel:${selectedLorry.driverPhone}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Driver
                  </a>
                )}

                {selectedLorry.currentLatitude && selectedLorry.currentLongitude && (
                  <button
                    onClick={() =>
                      handleFlyTo(selectedLorry.currentLatitude!, selectedLorry.currentLongitude!)
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    Locate
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. FLOATING CUSTOMER CARD (WHEN CUSTOMER PIN IS CLICKED) */}
      {selectedCustomer && (
        <div className="absolute top-18 right-3 z-[1000] w-88 max-w-[calc(100vw-24px)] bg-white/98 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                <Building2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-base font-black tracking-tight leading-snug">
                  {selectedCustomer.name}
                </div>
                <div className="text-xs text-slate-300 font-mono">
                  {selectedCustomer.code} • {selectedCustomer.city}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">
            {/* Financial Status Card */}
            <div
              className={`p-3.5 rounded-2xl border ${
                selectedCustomer.outstandingBalance > selectedCustomer.creditLimit
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : selectedCustomer.outstandingBalance > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider mb-1">
                <span>Outstanding Credit</span>
                <span className="text-[10px] font-semibold">
                  Limit: {formatMoney(selectedCustomer.creditLimit)}
                </span>
              </div>
              <div className="text-xl font-black">
                {formatMoney(selectedCustomer.outstandingBalance)}
              </div>
            </div>

            {/* Address & Route */}
            <div className="space-y-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Delivery Address
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedCustomer.deliveryAddress}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Route
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedCustomer.route?.code || 'None'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Tier
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedCustomer.pricingTier}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              {selectedCustomer.phone && (
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-100 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Call Shop
                </a>
              )}

              {onNavigateToBillEntry && (
                <button
                  onClick={() => onNavigateToBillEntry(selectedCustomer.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#0071E3] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-600 shadow-md shadow-blue-500/25 transition"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Take Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. UNPINNED STORES DRAWER (FOR QUICK GEOCODING) */}
      {showUnpinnedDrawer && (
        <div className="fixed inset-y-0 right-0 z-[1100] w-88 max-w-[90vw] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Unpinned Stores ({unpinnedCustomers.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Click "Pin" then tap location on map
              </p>
            </div>
            <button
              onClick={() => setShowUnpinnedDrawer(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {unpinnedCustomers.map(customer => (
              <div
                key={customer.id}
                className="p-3 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white transition flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {customer.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {customer.deliveryAddress}
                  </div>
                  <div className="text-[10px] text-blue-600 font-semibold mt-0.5">
                    {customer.route?.code || 'No route'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPinningCustomer(customer);
                    setShowUnpinnedDrawer(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs shrink-0 transition"
                >
                  Pin
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

