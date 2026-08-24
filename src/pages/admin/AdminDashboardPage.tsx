import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminApi, assignmentApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MapboxMap, MarkerPoint } from '../../components/maps/MapboxMap';
import { ArrowRight, Zap } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => adminApi.getMetrics(),
    refetchInterval: 4000,
  });

  const { data: fleetData } = useQuery({
    queryKey: ['admin-fleet-live'],
    queryFn: () => adminApi.getFleetOverview(),
    refetchInterval: 3000,
  });

  const autoAssignAllMutation = useMutation({
    mutationFn: () => assignmentApi.autoAssignAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['admin-fleet-live'] });
    },
  });

  const markers: MarkerPoint[] = [];
  const routeCoords: [number, number][] = [];

  if (fleetData?.agents) {
    fleetData.agents.forEach((agent: any) => {
      if (agent.location?.lat && agent.location?.lng) {
        markers.push({
          id: `agent-${agent.id}`,
          lat: agent.location.lat,
          lng: agent.location.lng,
          type: 'agent',
          title: agent.name,
          subtitle: `${agent.vehicleType} · ${agent.activeOrdersCount} active`,
          status: agent.status,
        });
      }
    });
  }

  if (fleetData?.activeOrders) {
    fleetData.activeOrders.forEach((o: any) => {
      if (o.pickup?.lat && o.pickup?.lng) {
        markers.push({ id: `p-${o.id}`, lat: o.pickup.lat, lng: o.pickup.lng, type: 'pickup', title: `#${o.trackingNumber}`, subtitle: o.pickup.zone });
        routeCoords.push([o.pickup.lng, o.pickup.lat]);
      }
      if (o.destination?.lat && o.destination?.lng) {
        markers.push({ id: `d-${o.id}`, lat: o.destination.lat, lng: o.destination.lng, type: 'drop', title: `#${o.trackingNumber}`, subtitle: o.destination.zone });
        routeCoords.push([o.destination.lng, o.destination.lat]);
      }
    });
  }

  const overview = metrics?.overview;
  const agentCapacity = metrics?.agentCapacity;

  const stats = [
    { label: 'Total Orders', value: overview?.totalOrders ?? '–', sub: 'all time' },
    { label: 'Active', value: overview?.activeDeliveries ?? '–', sub: 'in transit', accent: true },
    { label: 'Success Rate', value: overview ? `${overview.successRate}%` : '–', sub: `${overview?.deliveredCount ?? 0} delivered` },
    { label: 'Fleet', value: `${agentCapacity?.available ?? 0}/${agentCapacity?.total ?? 0}`, sub: `${agentCapacity?.busy ?? 0} busy` },
    { label: 'Revenue', value: `₹${overview?.totalRevenue?.toLocaleString('en-IN') ?? '0'}`, sub: 'billed', mono: true },
  ];

  const navCards = [
    { label: 'Order Management', desc: 'Dispatch & assignment', to: '/admin/orders' },
    { label: 'Fleet Roster', desc: 'Driver availability', to: '/admin/fleet' },
    { label: 'Zones & Pincodes', desc: 'Coverage matrix', to: '/admin/zones' },
    { label: 'Pricing', desc: 'Rate cards & COD', to: '/admin/pricing' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operations Overview</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Bengaluru hub · real-time fleet and delivery status</p>
        </div>
        <button
          type="button"
          onClick={() => autoAssignAllMutation.mutate()}
          disabled={autoAssignAllMutation.isPending}
          className="px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5" />
          {autoAssignAllMutation.isPending ? 'Dispatching…' : 'Auto-assign all'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3.5">
            <div className="text-[12px] text-gray-500 font-medium">{s.label}</div>
            <div className={`text-2xl font-semibold mt-1 ${s.accent ? 'text-brand-600' : 'text-gray-900'} ${s.mono ? 'font-mono text-xl' : ''}`}>
              {s.value}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Fleet Map */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-gray-900">Fleet & Active Deliveries</h2>
          <div className="flex items-center gap-4 text-[12px] text-gray-400">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Busy</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Drop</span>
          </div>
        </div>
        <MapboxMap markers={markers} routeCoordinates={routeCoords} className="h-80 w-full" mode="fleet" />
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {navCards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="bg-white rounded-lg border border-gray-200 px-4 py-3.5 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div>
              <div className="text-[13px] font-medium text-gray-800 group-hover:text-gray-900">{c.label}</div>
              <div className="text-[12px] text-gray-400 mt-0.5">{c.desc}</div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
};
