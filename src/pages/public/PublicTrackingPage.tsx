import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trackingApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MapboxMap, MarkerPoint } from '../../components/maps/MapboxMap';
import { Search, ArrowRight, AlertTriangle, Check } from 'lucide-react';

export const PublicTrackingPage: React.FC = () => {
  const { trackingNumber: paramTrackingNumber } = useParams<{ trackingNumber?: string }>();
  const navigate = useNavigate();

  const [inputNumber, setInputNumber] = useState(paramTrackingNumber || '');
  const [activeTrackingNumber, setActiveTrackingNumber] = useState(paramTrackingNumber || '');

  useEffect(() => {
    if (paramTrackingNumber) {
      setInputNumber(paramTrackingNumber);
      setActiveTrackingNumber(paramTrackingNumber);
    }
  }, [paramTrackingNumber]);

  const { data: tracking, isLoading, error } = useQuery({
    queryKey: ['public-tracking', activeTrackingNumber],
    queryFn: () => trackingApi.getTracking(activeTrackingNumber),
    enabled: !!activeTrackingNumber,
    refetchInterval: 3000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNumber.trim()) {
      navigate(`/track/${inputNumber.trim()}`);
      setActiveTrackingNumber(inputNumber.trim());
    }
  };

  const markers: MarkerPoint[] = [];
  const routeCoords: [number, number][] = [];

  if (tracking) {
    if (tracking.pickup?.lat && tracking.pickup?.lng) {
      markers.push({
        id: 'pickup',
        lat: tracking.pickup.lat,
        lng: tracking.pickup.lng,
        type: 'pickup',
        title: 'Pickup',
        subtitle: `${tracking.pickup.city} (${tracking.pickup.zone})`,
      });
      routeCoords.push([tracking.pickup.lng, tracking.pickup.lat]);
    }

    if (tracking.assignedAgent?.currentLat && tracking.assignedAgent?.currentLng) {
      markers.push({
        id: 'agent',
        lat: tracking.assignedAgent.currentLat,
        lng: tracking.assignedAgent.currentLng,
        type: 'agent',
        title: tracking.assignedAgent.name,
        subtitle: `${tracking.assignedAgent.vehicleType} (${tracking.assignedAgent.vehicleNumber || 'Assigned'})`,
        status: tracking.assignedAgent.availabilityStatus,
      });
      routeCoords.push([tracking.assignedAgent.currentLng, tracking.assignedAgent.currentLat]);
    }

    if (tracking.destination?.lat && tracking.destination?.lng) {
      markers.push({
        id: 'drop',
        lat: tracking.destination.lat,
        lng: tracking.destination.lng,
        type: 'drop',
        title: 'Destination',
        subtitle: `${tracking.destination.city} (${tracking.destination.zone})`,
      });
      routeCoords.push([tracking.destination.lng, tracking.destination.lat]);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Search Section */}
      <div className="text-center space-y-3 max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900">
          Track Your Delivery
        </h1>
        <p className="text-[13px] text-gray-500">
          Enter a tracking code to check real-time GPS location and status timeline
        </p>

        <form onSubmit={handleSearch} className="relative max-w-md mx-auto pt-2">
          <input
            type="text"
            required
            value={inputNumber}
            onChange={(e) => setInputNumber(e.target.value)}
            placeholder="Enter tracking code (e.g. MZ-2026-800101)…"
            className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-24 py-2.5 text-[14px] text-gray-900 placeholder-gray-400 font-mono shadow-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-5 pointer-events-none" />
          <button
            type="submit"
            className="absolute right-1.5 top-3.5 bottom-1.5 px-3 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[13px] transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Track</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Quick Demo Codes */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-gray-500 pt-1">
          <span>Demo codes:</span>
          {['MZ-2026-800101', 'MZ-2026-800102', 'MZ-2026-800106'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setInputNumber(code);
                setActiveTrackingNumber(code);
                navigate(`/track/${code}`);
              }}
              className="px-2 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-mono text-[11px] cursor-pointer"
            >
              #{code}
            </button>
          ))}
        </div>
      </div>

      {/* Tracking Result View */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400 text-[13px]">
          Fetching tracking updates…
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 max-w-md mx-auto text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="text-[15px] font-semibold text-gray-900">Shipment Not Found</h3>
          <p className="text-[13px] text-gray-500">
            No shipment matches tracking number <strong>#{activeTrackingNumber}</strong>.
          </p>
        </div>
      ) : tracking ? (
        <div className="space-y-5">
          {/* Main Info Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-gray-900 font-mono">
                  #{tracking.trackingNumber}
                </h2>
                <StatusBadge status={tracking.status} size="md" />
              </div>
              <p className="text-[13px] text-gray-500">
                {tracking.packageDescription} · Billable weight: <strong className="text-gray-700 font-mono">{tracking.billableWeightKg} kg</strong>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-gray-400 uppercase block font-medium">Delivery fee</span>
              <span className="text-[16px] font-semibold font-mono text-gray-900">
                ₹{tracking.totalPrice.toFixed(2)} ({tracking.paymentMode})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Map */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 text-[13px]">Live Location</h3>
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    GPS active
                  </span>
                </div>

                <MapboxMap
                  markers={markers}
                  routeCoordinates={routeCoords}
                  className="h-80 w-full"
                  mode="track"
                />

                {tracking.assignedAgent && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-[13px] flex items-center justify-between">
                    <div>
                      <span className="text-gray-500">Assigned Driver: </span>
                      <strong className="text-gray-800">{tracking.assignedAgent.name}</strong>
                      <span className="text-gray-400 text-[12px] ml-1">
                        ({tracking.assignedAgent.vehicleType})
                      </span>
                    </div>
                    <StatusBadge status={tracking.assignedAgent.availabilityStatus} size="sm" />
                  </div>
                )}
              </div>
            </div>

            {/* Right: Timeline */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 shadow-xs">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900 text-[13px]">Tracking History</h3>
                </div>

                <div className="p-5">
                  <div className="space-y-4 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                    {tracking.timeline?.map((event: any, idx: number) => (
                      <div key={event.id} className="relative pl-6 text-[13px]">
                        <span
                          className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white ${
                            idx === tracking.timeline.length - 1
                              ? 'bg-brand-500 ring-2 ring-brand-100'
                              : 'bg-gray-300'
                          }`}
                        />
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-800">{event.status.replace(/_/g, ' ')}</span>
                          <span className="text-[11px] font-mono text-gray-400">
                            {new Date(event.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-[12px] text-gray-500 mt-0.5">
                          By <span className="text-gray-700 font-medium">{event.actorName}</span>
                        </div>
                        {event.notes && (
                          <p className="text-gray-500 text-[12px] mt-0.5">{event.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
