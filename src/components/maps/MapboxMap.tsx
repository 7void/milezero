import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Navigation, Truck, MapPin, Radio } from 'lucide-react';

export interface MarkerPoint {
  id: string;
  lat: number;
  lng: number;
  type: 'pickup' | 'drop' | 'agent' | 'hub';
  title: string;
  subtitle?: string;
  status?: string;
  vehicleType?: string;
}

interface MapboxMapProps {
  markers?: MarkerPoint[];
  routeCoordinates?: [number, number][]; // [lng, lat]
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  interactive?: boolean;
  className?: string;
  mode?: 'track' | 'agent' | 'fleet';
  showControls?: boolean;
}

export const MapboxMap: React.FC<MapboxMapProps> = ({
  markers = [],
  routeCoordinates = [],
  center = [77.5946, 12.9716],
  zoom = 12,
  interactive = true,
  className = 'h-80 w-full overflow-hidden',
  mode = 'track',
  showControls = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [tokenAvailable, setTokenAvailable] = useState<boolean>(true);
  const [activeMarker, setActiveMarker] = useState<MarkerPoint | null>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || '';

  useEffect(() => {
    if (!mapboxToken || mapboxToken.trim() === '' || mapboxToken === 'YOUR_MAPBOX_TOKEN_HERE') {
      setTokenAvailable(false);
      return;
    }

    if (!mapContainer.current) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: zoom,
        interactive: interactive,
      });

      if (showControls) {
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'top-right');
      }

      map.on('load', () => {
        mapRef.current = map;
        renderMapContent(map);
      });

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (err) {
      console.warn('Mapbox initialization error, switching to visualizer:', err);
      setTokenAvailable(false);
    }
  }, [mapboxToken]);

  useEffect(() => {
    if (mapRef.current) {
      renderMapContent(mapRef.current);
    }
  }, [markers, routeCoordinates]);

  const renderMapContent = (map: mapboxgl.Map) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    markers.forEach((pt) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';

      let iconHtml = '';
      if (pt.type === 'pickup') {
        iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white shadow-md border-2 border-white">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
        `;
      } else if (pt.type === 'drop') {
        iconHtml = `
          <div class="flex items-center justify-center w-7 h-7 rounded-full bg-red-600 text-white shadow-md border-2 border-white">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
        `;
      } else if (pt.type === 'agent') {
        const bg = pt.status === 'AVAILABLE' ? 'bg-emerald-600' : pt.status === 'BUSY' ? 'bg-amber-600' : 'bg-gray-600';
        iconHtml = `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${bg} text-white shadow-md border-2 border-white">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        `;
      }

      el.innerHTML = iconHtml;

      const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
        <div class="p-1 font-sans">
          <div class="font-semibold text-xs text-gray-900">${pt.title}</div>
          ${pt.subtitle ? `<div class="text-[11px] text-gray-500 mt-0.5">${pt.subtitle}</div>` : ''}
          ${pt.status ? `<div class="text-[10px] font-medium text-brand-600 mt-0.5 uppercase">${pt.status}</div>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([pt.lng, pt.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (routeCoordinates.length > 1) {
      const geojson: any = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates,
        },
      };

      if (map.getSource('route')) {
        (map.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson);
      } else {
        map.addSource('route', {
          type: 'geojson',
          data: geojson,
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#4f46e5',
            'line-width': 3.5,
            'line-opacity': 0.85,
          },
        });
      }

      const bounds = new mapboxgl.LngLatBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    }
  };

  if (!tokenAvailable) {
    return (
      <div className={`relative bg-gray-50 border-t border-b border-gray-100 flex flex-col items-center justify-center p-6 ${className}`}>
        {/* Clean subtle dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-60 pointer-events-none" />

        {/* Live Markers Simulation Canvas */}
        <div className="relative w-full h-full min-h-[14rem] flex items-center justify-around z-10 px-6">
          {markers.length === 0 ? (
            <div className="text-center text-gray-400 space-y-1.5">
              <Radio className="w-6 h-6 mx-auto text-gray-400" />
              <p className="text-[13px] font-medium text-gray-600">Operations Map</p>
              <p className="text-[11px] text-gray-400">Add VITE_MAPBOX_TOKEN in .env for full street map layer</p>
            </div>
          ) : (
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 relative">
              {/* Route connecting line */}
              <div className="hidden md:block absolute top-1/2 left-12 right-12 h-0.5 bg-gray-300 -translate-y-1/2" />

              {markers.map((marker) => {
                const isSelected = activeMarker?.id === marker.id;
                return (
                  <div
                    key={marker.id}
                    onClick={() => setActiveMarker(marker)}
                    className="relative z-10 flex flex-col items-center cursor-pointer group transition-transform duration-150 hover:scale-105"
                  >
                    {/* Marker Icon Pin */}
                    <div
                      className={`p-2.5 rounded-full shadow-sm flex items-center justify-center border-2 border-white transition-all ${
                        marker.type === 'pickup'
                          ? 'bg-emerald-600 text-white'
                          : marker.type === 'drop'
                          ? 'bg-red-600 text-white'
                          : marker.status === 'AVAILABLE'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-brand-600 text-white'
                      }`}
                    >
                      {marker.type === 'pickup' && <MapPin className="w-4 h-4" />}
                      {marker.type === 'drop' && <Navigation className="w-4 h-4" />}
                      {marker.type === 'agent' && <Truck className="w-4 h-4" />}
                    </div>

                    {/* Marker Label */}
                    <div className="mt-2 text-center bg-white border border-gray-200 rounded-md px-2.5 py-1 shadow-xs">
                      <p className="text-[12px] font-medium text-gray-800">{marker.title}</p>
                      {marker.subtitle && (
                        <p className="text-[11px] text-gray-500">{marker.subtitle}</p>
                      )}
                      {marker.status && (
                        <span className="text-[10px] font-medium uppercase text-brand-600">
                          {marker.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Coordinate Status Bar */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-gray-400 bg-white/90 border border-gray-200 px-2.5 py-1 rounded-md">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              Center: {center[1].toFixed(4)}° N, {center[0].toFixed(4)}° E
            </span>
          </div>
          <span className="text-gray-400 text-[11px]">Live Logistics Map</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
