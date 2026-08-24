import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, ordersApi } from '../../services/api';
import { AgentStatus, OrderStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MapboxMap, MarkerPoint } from '../../components/maps/MapboxMap';
import { Modal } from '../../components/common/Modal';
import {
  Navigation,
  Phone,
  Package,
  CheckCircle2,
  AlertTriangle,
  Play,
} from 'lucide-react';

const FAILURE_REASONS = [
  'Customer Unavailable (Door locked, phone unreachable)',
  'Incorrect / Incomplete Delivery Address',
  'Customer Refused Package',
  'Cash on Delivery (COD) Payment Not Ready',
  'Package Damaged during Transit',
  'Gated Community / Security Access Restricted',
  'Customer Requested Reschedule',
];

export const AgentDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [failureModalOrder, setFailureModalOrder] = useState<any | null>(null);
  const [selectedFailureReason, setSelectedFailureReason] = useState(FAILURE_REASONS[0]);
  const [failureNotes, setFailureNotes] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['agent-profile'],
    queryFn: () => agentsApi.getMyProfile(),
    refetchInterval: 5000,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ['agent-deliveries'],
    queryFn: () => agentsApi.getMyDeliveries(),
    refetchInterval: 3000,
  });

  const activeDelivery = deliveries.find(
    (d) => ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status),
  );

  const updateAvailabilityMutation = useMutation({
    mutationFn: (status: AgentStatus) => agentsApi.updateMyAvailability(status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent-profile'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
      notes,
      failureReason,
    }: {
      orderId: string;
      status: OrderStatus;
      notes?: string;
      failureReason?: string;
    }) =>
      ordersApi.updateStatus(orderId, {
        status,
        notes,
        failureReason,
        lat: profile?.currentLat || undefined,
        lng: profile?.currentLng || undefined,
      }),
    onSuccess: () => {
      setFailureModalOrder(null);
      setFailureNotes('');
      queryClient.invalidateQueries({ queryKey: ['agent-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] });
    },
  });

  const simulateStepMutation = useMutation({
    mutationFn: (target: { targetLat: number; targetLng: number }) =>
      agentsApi.simulateStep({ ...target, stepFraction: 0.35 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] });
      queryClient.invalidateQueries({ queryKey: ['agent-deliveries'] });
    },
  });

  const handleSimulateGPS = () => {
    if (!activeDelivery) return;
    let targetLat = activeDelivery.dropAddress.lat || 12.9352;
    let targetLng = activeDelivery.dropAddress.lng || 77.6245;

    if (activeDelivery.status === 'ASSIGNED') {
      targetLat = activeDelivery.pickupAddress.lat || 12.9716;
      targetLng = activeDelivery.pickupAddress.lng || 77.5946;
    }
    simulateStepMutation.mutate({ targetLat, targetLng });
  };

  const markers: MarkerPoint[] = [];
  const routeCoords: [number, number][] = [];

  if (profile?.currentLat && profile?.currentLng) {
    markers.push({
      id: 'agent',
      lat: profile.currentLat,
      lng: profile.currentLng,
      type: 'agent',
      title: 'My Location',
      subtitle: `${profile.vehicleType} (${profile.vehicleNumber || 'Assigned'})`,
      status: profile.availabilityStatus,
    });
    routeCoords.push([profile.currentLng, profile.currentLat]);
  }

  if (activeDelivery) {
    if (activeDelivery.pickupAddress.lat && activeDelivery.pickupAddress.lng) {
      markers.push({
        id: 'pickup',
        lat: activeDelivery.pickupAddress.lat,
        lng: activeDelivery.pickupAddress.lng,
        type: 'pickup',
        title: 'Pickup',
        subtitle: `${activeDelivery.pickupAddress.street}, ${activeDelivery.pickupAddress.city}`,
      });
      routeCoords.push([activeDelivery.pickupAddress.lng, activeDelivery.pickupAddress.lat]);
    }

    if (activeDelivery.dropAddress.lat && activeDelivery.dropAddress.lng) {
      markers.push({
        id: 'drop',
        lat: activeDelivery.dropAddress.lat,
        lng: activeDelivery.dropAddress.lng,
        type: 'drop',
        title: 'Destination',
        subtitle: `${activeDelivery.dropAddress.street}, ${activeDelivery.dropAddress.city}`,
      });
      routeCoords.push([activeDelivery.dropAddress.lng, activeDelivery.dropAddress.lat]);
    }
  }

  const handleStatusProgress = (nextStatus: OrderStatus, notes?: string) => {
    if (!activeDelivery) return;
    updateStatusMutation.mutate({ orderId: activeDelivery.id, status: nextStatus, notes });
  };

  const handleFailureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureModalOrder) return;
    updateStatusMutation.mutate({
      orderId: failureModalOrder.id,
      status: 'FAILED',
      failureReason: selectedFailureReason,
      notes: failureNotes,
    });
  };

  const statusTabCls = (isActive: boolean) =>
    `px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
      isActive ? 'bg-gray-900 text-white font-semibold' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Shift & Availability Status Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center font-semibold text-[14px]">
            {profile?.user?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-semibold text-gray-900">
                {profile?.user?.name || 'Agent Console'}
              </h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {profile?.vehicleType || 'BIKE'} · {profile?.vehicleNumber || 'KA-01-EA-1001'}
              </span>
            </div>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Zone: <strong className="text-gray-700">{profile?.currentZone?.name || 'Central Hub'}</strong> · GPS:{' '}
              {profile?.currentLat?.toFixed(4) || '12.9716'}°, {profile?.currentLng?.toFixed(4) || '77.5946'}°
            </p>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => updateAvailabilityMutation.mutate('AVAILABLE')}
            className={statusTabCls(profile?.availabilityStatus === 'AVAILABLE')}
          >
            Available
          </button>
          <button
            onClick={() => updateAvailabilityMutation.mutate('BUSY')}
            className={statusTabCls(profile?.availabilityStatus === 'BUSY')}
          >
            Busy
          </button>
          <button
            onClick={() => updateAvailabilityMutation.mutate('OFFLINE')}
            className={statusTabCls(profile?.availabilityStatus === 'OFFLINE')}
          >
            Offline
          </button>
        </div>
      </div>

      {/* Main Grid: Active Task & GPS Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Active Delivery Action Sheet */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-gray-900">Current Task</h2>
            {activeDelivery && (
              <span className="text-[12px] text-gray-500 font-mono">
                #{activeDelivery.trackingNumber}
              </span>
            )}
          </div>

          {!activeDelivery ? (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center space-y-2">
              <Package className="w-8 h-8 mx-auto text-gray-400" />
              <h3 className="text-[14px] font-medium text-gray-700">No active assignment</h3>
              <p className="text-[13px] text-gray-400 max-w-sm mx-auto">
                Set status to Available to receive auto-dispatched deliveries.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-gray-900 font-mono">
                      #{activeDelivery.trackingNumber}
                    </span>
                    <StatusBadge status={activeDelivery.status} size="sm" />
                  </div>
                  <p className="text-[13px] text-gray-700 font-medium">{activeDelivery.packageDescription}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {activeDelivery.serviceType} · Billable: {activeDelivery.billableWeightKg} kg
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block font-medium">Payment</span>
                  <span className="text-[13px] font-mono font-medium text-gray-900">
                    {activeDelivery.paymentMode} · ₹{activeDelivery.totalPrice.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Waypoints */}
              <div className="space-y-2.5 text-[13px]">
                <div className="p-3 rounded-md bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between text-emerald-700 font-medium text-[12px]">
                    <span>1. PICKUP</span>
                    <a href={`tel:${activeDelivery.pickupAddress.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                      <Phone className="w-3 h-3 text-emerald-600" /> {activeDelivery.pickupAddress.phone}
                    </a>
                  </div>
                  <p className="font-medium text-gray-800">{activeDelivery.pickupAddress.contactName}</p>
                  <p className="text-[12px] text-gray-500">
                    {activeDelivery.pickupAddress.street}, {activeDelivery.pickupAddress.city} - {activeDelivery.pickupAddress.pincode}
                  </p>
                </div>

                <div className="p-3 rounded-md bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between text-red-700 font-medium text-[12px]">
                    <span>2. DESTINATION</span>
                    <a href={`tel:${activeDelivery.dropAddress.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
                      <Phone className="w-3 h-3 text-red-600" /> {activeDelivery.dropAddress.phone}
                    </a>
                  </div>
                  <p className="font-medium text-gray-800">{activeDelivery.dropAddress.contactName}</p>
                  <p className="text-[12px] text-gray-500">
                    {activeDelivery.dropAddress.street}, {activeDelivery.dropAddress.city} - {activeDelivery.dropAddress.pincode}
                  </p>
                  {activeDelivery.specialInstructions && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1">
                      Note: {activeDelivery.specialInstructions}
                    </p>
                  )}
                </div>
              </div>

              {/* State Transition Actions */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {activeDelivery.status === 'ASSIGNED' && (
                  <button
                    onClick={() => handleStatusProgress('PICKED_UP', 'Package picked up from sender')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[13px] transition-colors cursor-pointer"
                  >
                    Confirm Package Picked Up
                  </button>
                )}

                {activeDelivery.status === 'PICKED_UP' && (
                  <button
                    onClick={() => handleStatusProgress('IN_TRANSIT', 'In transit towards destination')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[13px] transition-colors cursor-pointer"
                  >
                    Start Transit to Destination
                  </button>
                )}

                {activeDelivery.status === 'IN_TRANSIT' && (
                  <button
                    onClick={() => handleStatusProgress('OUT_FOR_DELIVERY', 'Driver arrived in delivery area')}
                    disabled={updateStatusMutation.isPending}
                    className="w-full py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[13px] transition-colors cursor-pointer"
                  >
                    Mark Out for Delivery
                  </button>
                )}

                {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() =>
                      handleStatusProgress(
                        'DELIVERED',
                        activeDelivery.paymentMode === 'COD'
                          ? `Delivered. Collected ₹${activeDelivery.totalPrice.toFixed(2)} COD cash.`
                          : 'Handed directly to recipient.',
                      )
                    }
                    disabled={updateStatusMutation.isPending}
                    className="w-full py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[13px] transition-colors cursor-pointer"
                  >
                    {activeDelivery.paymentMode === 'COD'
                      ? `Collect ₹${activeDelivery.totalPrice.toFixed(0)} & Mark Delivered`
                      : 'Confirm Successful Delivery'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setFailureModalOrder(activeDelivery)}
                  className="w-full py-2 rounded-md bg-white border border-gray-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-gray-600 font-medium text-[12px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report Delivery Failure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Map & GPS Simulation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-gray-900">Route & Navigation</h2>
            {activeDelivery && (
              <button
                type="button"
                onClick={handleSimulateGPS}
                disabled={simulateStepMutation.isPending}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium text-[12px] transition-colors cursor-pointer"
                title="Simulates moving the agent's GPS coordinates along the actual route"
              >
                <Play className="w-3 h-3 text-brand-600" />
                <span>Simulate GPS step</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <MapboxMap
              markers={markers}
              routeCoordinates={routeCoords}
              className="h-80 w-full"
              mode="agent"
            />
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-[12px] text-gray-500">
              Click <strong>Simulate GPS step</strong> to advance your position towards the destination and update customer/admin tracking views.
            </div>
          </div>
        </div>
      </div>

      {/* Failure Reason Modal */}
      <Modal
        isOpen={!!failureModalOrder}
        onClose={() => setFailureModalOrder(null)}
        title="Report Delivery Failure"
        subtitle={`Select reason for order #${failureModalOrder?.trackingNumber}`}
      >
        <form onSubmit={handleFailureSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Primary Failure Reason
            </label>
            <select
              value={selectedFailureReason}
              onChange={(e) => setSelectedFailureReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              {FAILURE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">
              Agent Notes / Observations
            </label>
            <textarea
              rows={3}
              value={failureNotes}
              onChange={(e) => setFailureNotes(e.target.value)}
              placeholder="e.g. Waited 10 mins. Phone was not answered."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setFailureModalOrder(null)}
              className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateStatusMutation.isPending}
              className="flex-1 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50"
            >
              {updateStatusMutation.isPending ? 'Logging…' : 'Log Failure'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
