import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MapboxMap, MarkerPoint } from '../../components/maps/MapboxMap';
import { Modal } from '../../components/common/Modal';
import { ArrowLeft, RotateCcw, AlertTriangle, Check } from 'lucide-react';

const LIFECYCLE_STEPS = [
  { status: 'PENDING', label: 'Placed' },
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'PICKED_UP', label: 'Picked Up' },
  { status: 'IN_TRANSIT', label: 'In Transit' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [rescheduleNotes, setRescheduleNotes] = useState('');

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => ordersApi.getOrderById(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const rescheduleMutation = useMutation({
    mutationFn: (dto: { newDeliveryDate: string; notes?: string }) => ordersApi.rescheduleOrder(id!, dto),
    onSuccess: () => { setIsRescheduleOpen(false); queryClient.invalidateQueries({ queryKey: ['order-detail', id] }); },
  });

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    rescheduleMutation.mutate({ newDeliveryDate: new Date(rescheduleDate).toISOString(), notes: rescheduleNotes });
  };

  if (isLoading) return <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400 text-[13px]">Loading…</div>;

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-[15px] font-medium text-gray-700">Order not found</p>
        <p className="text-[13px] text-gray-400">The tracking ID does not match any shipment.</p>
        <Link to="/orders" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-brand-600 text-white text-[13px] font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to orders
        </Link>
      </div>
    );
  }

  const markers: MarkerPoint[] = [];
  const routeCoords: [number, number][] = [];

  if (order.pickupAddress.lat && order.pickupAddress.lng) {
    markers.push({ id: 'pickup', lat: order.pickupAddress.lat, lng: order.pickupAddress.lng, type: 'pickup', title: 'Pickup', subtitle: `${order.pickupAddress.street}, ${order.pickupAddress.city}` });
    routeCoords.push([order.pickupAddress.lng, order.pickupAddress.lat]);
  }
  if (order.agent?.currentLat && order.agent?.currentLng) {
    markers.push({ id: 'agent', lat: order.agent.currentLat, lng: order.agent.currentLng, type: 'agent', title: order.agent.user?.name || 'Driver', subtitle: `${order.agent.vehicleType}`, status: order.agent.availabilityStatus });
    routeCoords.push([order.agent.currentLng, order.agent.currentLat]);
  }
  if (order.dropAddress.lat && order.dropAddress.lng) {
    markers.push({ id: 'drop', lat: order.dropAddress.lat, lng: order.dropAddress.lng, type: 'drop', title: 'Destination', subtitle: `${order.dropAddress.street}, ${order.dropAddress.city}` });
    routeCoords.push([order.dropAddress.lng, order.dropAddress.lat]);
  }

  const getCurrentStepIndex = () => {
    const map: Record<string, number> = { PENDING: 0, ASSIGNED: 1, PICKED_UP: 2, IN_TRANSIT: 3, OUT_FOR_DELIVERY: 4, DELIVERED: 5, FAILED: 4, RESCHEDULED: 1 };
    return map[order.status] ?? 0;
  };
  const currentStep = getCurrentStepIndex();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-gray-600 mb-1 cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900 font-mono">#{order.trackingNumber}</h1>
            <StatusBadge status={order.status} size="md" />
          </div>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString()} · {order.packageDescription}
          </p>
        </div>

        {order.status === 'FAILED' && (
          <button
            type="button"
            onClick={() => setIsRescheduleOpen(true)}
            className="px-3.5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-[13px] flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reschedule
          </button>
        )}
      </div>

      {/* Failure alert */}
      {order.status === 'FAILED' && (
        <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-medium text-red-800">Delivery attempt failed</p>
            <p className="text-[12px] text-red-600 mt-0.5">
              Reason: {order.deliveryAttempts?.[0]?.failureReason || 'Recipient unavailable'}. Select a new date to re-dispatch.
            </p>
          </div>
        </div>
      )}

      {/* Progress stepper */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[32rem] relative">
          <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-gray-200" />
          <div
            className="absolute top-3.5 left-4 h-0.5 bg-brand-500 transition-all duration-500"
            style={{ width: `${(currentStep / (LIFECYCLE_STEPS.length - 1)) * (100 - 3)}%` }}
          />
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStep && order.status !== 'FAILED';
            const isCurrent = idx === currentStep;
            const isFailed = order.status === 'FAILED' && idx === currentStep;
            return (
              <div key={step.status} className="relative z-10 flex flex-col items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium transition-all ${
                  isFailed ? 'bg-red-500 text-white' :
                  isCurrent ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                  isCompleted ? 'bg-brand-600 text-white' :
                  'bg-white text-gray-400 border-2 border-gray-200'
                }`}>
                  {isCompleted && !isCurrent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className={`text-[11px] text-center whitespace-nowrap ${isCurrent ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-medium text-gray-900">Live Location</h2>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                GPS active
              </span>
            </div>
            <MapboxMap markers={markers} routeCoordinates={routeCoords} className="h-80 w-full" mode="track" />
            {order.agent ? (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-semibold text-[13px]">
                    {order.agent.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{order.agent.user?.name}</div>
                    <div className="text-[12px] text-gray-400">{order.agent.vehicleType} · {order.agent.vehicleNumber || '—'}</div>
                  </div>
                </div>
                <StatusBadge status={order.agent.availabilityStatus} size="sm" />
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100 text-[13px] text-gray-400 text-center">
                Awaiting agent dispatch
              </div>
            )}
          </div>

          {/* Delivery attempts */}
          {order.deliveryAttempts && order.deliveryAttempts.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-[14px] font-medium text-gray-900">Delivery Attempts</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {order.deliveryAttempts.map((attempt) => (
                  <div key={attempt.id} className="px-4 py-3 flex items-start justify-between text-[13px]">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-gray-700">Attempt #{attempt.attemptNumber}</span>
                        <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${attempt.status === 'FAILED' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {attempt.status}
                        </span>
                      </div>
                      {attempt.failureReason && <p className="text-[12px] text-gray-500">{attempt.failureReason}</p>}
                      {attempt.notes && <p className="text-[12px] text-gray-400 mt-0.5">{attempt.notes}</p>}
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono whitespace-nowrap">
                      {new Date(attempt.attemptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Timeline & pricing */}
        <div className="lg:col-span-5 space-y-5">
          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-gray-900">Tracking Timeline</h3>
              <span className="text-[11px] text-gray-400 font-mono">Audit log</span>
            </div>
            <div className="px-4 py-4">
              <div className="space-y-4 relative before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                {order.statusHistory?.map((event, idx) => (
                  <div key={event.id} className="relative pl-6 text-[13px]">
                    <span className={`absolute left-0 top-1.5 w-[11px] h-[11px] rounded-full border-2 border-white ${
                      idx === order.statusHistory!.length - 1 ? 'bg-brand-500 ring-2 ring-brand-100' : 'bg-gray-300'
                    }`} />
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-800">{event.status.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5">
                      {event.actorName} <span className="text-gray-300">·</span> <span className="capitalize">{event.actorRole.toLowerCase()}</span>
                    </div>
                    {event.notes && <p className="text-[12px] text-gray-400 mt-0.5">{event.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-[14px] font-medium text-gray-900">Pricing Breakdown</h3>
            </div>
            <div className="px-4 py-4 space-y-2 text-[13px]">
              <div className="flex justify-between text-gray-500"><span>Service</span><span className="text-gray-700">{order.serviceType}</span></div>
              <div className="flex justify-between text-gray-500"><span>Payment</span><span className="text-gray-700">{order.paymentMode}</span></div>
              <div className="flex justify-between text-gray-500"><span>Dimensions</span><span className="text-gray-700 font-mono">{order.lengthCm}×{order.widthCm}×{order.heightCm} cm</span></div>
              <div className="flex justify-between text-gray-500"><span>Volumetric</span><span className="font-mono text-gray-700">{order.volumetricWeightKg} kg</span></div>
              <div className="flex justify-between text-gray-500"><span>Actual</span><span className="font-mono text-gray-700">{order.actualWeightKg} kg</span></div>
              <div className="flex justify-between font-medium text-gray-900 pt-1 border-t border-gray-100"><span>Billable weight</span><span className="font-mono">{order.billableWeightKg} kg</span></div>

              <div className="pt-2 border-t border-gray-100 space-y-1.5">
                <div className="flex justify-between text-gray-600"><span>Base charge</span><span className="font-mono">₹{order.baseCharge.toFixed(2)}</span></div>
                {order.weightCharge > 0 && <div className="flex justify-between text-gray-600"><span>Weight surcharge</span><span className="font-mono">₹{order.weightCharge.toFixed(2)}</span></div>}
                {order.codSurcharge > 0 && <div className="flex justify-between text-amber-700"><span>COD surcharge</span><span className="font-mono">+₹{order.codSurcharge.toFixed(2)}</span></div>}
              </div>

              <div className="flex justify-between pt-2 border-t border-gray-100 text-[15px] font-semibold text-gray-900">
                <span>Total</span>
                <span className="font-mono">₹{order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <Modal isOpen={isRescheduleOpen} onClose={() => setIsRescheduleOpen(false)} title="Reschedule Delivery" subtitle={`Order #${order.trackingNumber}`}>
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">New delivery date</label>
            <input type="date" required min={new Date().toISOString().split('T')[0]} value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea rows={3} value={rescheduleNotes} onChange={(e) => setRescheduleNotes(e.target.value)}
              placeholder="e.g. Please deliver after 3:00 PM"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setIsRescheduleOpen(false)} className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer transition-colors">Cancel</button>
            <button type="submit" disabled={rescheduleMutation.isPending} className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50 transition-colors">
              {rescheduleMutation.isPending ? 'Rescheduling…' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
