import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ordersApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MapboxMap, MarkerPoint } from '../../components/maps/MapboxMap';
import { ArrowRight, Plus } from 'lucide-react';

export const CustomerDashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => ordersApi.getOrders(),
    refetchInterval: 6000,
  });

  const activeOrders = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED');
  const totalSpent = orders.reduce((sum, o) => sum + (o.status !== 'CANCELLED' ? o.totalPrice : 0), 0);

  const latestActiveOrder = activeOrders[0] || orders[0];
  const mapMarkers: MarkerPoint[] = [];
  const routeCoords: [number, number][] = [];

  if (latestActiveOrder) {
    if (latestActiveOrder.pickupAddress.lat && latestActiveOrder.pickupAddress.lng) {
      mapMarkers.push({ id: 'pickup', lat: latestActiveOrder.pickupAddress.lat, lng: latestActiveOrder.pickupAddress.lng, type: 'pickup', title: 'Pickup', subtitle: latestActiveOrder.pickupAddress.street });
      routeCoords.push([latestActiveOrder.pickupAddress.lng, latestActiveOrder.pickupAddress.lat]);
    }
    if (latestActiveOrder.agent?.currentLat && latestActiveOrder.agent?.currentLng) {
      mapMarkers.push({ id: 'agent', lat: latestActiveOrder.agent.currentLat, lng: latestActiveOrder.agent.currentLng, type: 'agent', title: latestActiveOrder.agent.user?.name || 'Agent', status: latestActiveOrder.agent.availabilityStatus });
      routeCoords.push([latestActiveOrder.agent.currentLng, latestActiveOrder.agent.currentLat]);
    }
    if (latestActiveOrder.dropAddress.lat && latestActiveOrder.dropAddress.lng) {
      mapMarkers.push({ id: 'drop', lat: latestActiveOrder.dropAddress.lat, lng: latestActiveOrder.dropAddress.lng, type: 'drop', title: 'Destination', subtitle: latestActiveOrder.dropAddress.street });
      routeCoords.push([latestActiveOrder.dropAddress.lng, latestActiveOrder.dropAddress.lat]);
    }
  }

  const stats = [
    { label: 'Active', value: activeOrders.length, sub: 'in transit' },
    { label: 'Delivered', value: deliveredOrders.length, sub: 'completed' },
    { label: 'Total orders', value: orders.length, sub: 'all time' },
    { label: 'Total spent', value: `₹${totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`, sub: 'billed', mono: true },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {user?.customerProfile?.companyName || 'Your delivery dashboard'}
          </p>
        </div>
        <Link
          to="/book"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Book delivery
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3.5">
            <div className="text-[12px] text-gray-500 font-medium">{s.label}</div>
            <div className={`text-2xl font-semibold mt-1 text-gray-900 ${(s as any).mono ? 'font-mono text-xl' : ''}`}>{s.value}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orders */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-gray-900">Recent Orders</h2>
            <Link to="/orders" className="text-[13px] text-brand-600 hover:text-brand-700 font-medium flex items-center gap-0.5">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-[13px] text-gray-400">Loading…</div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-10 text-center space-y-2">
              <p className="text-[14px] font-medium text-gray-700">No orders yet</p>
              <p className="text-[13px] text-gray-400">Book your first delivery to get started.</p>
              <Link to="/book" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-brand-600 text-white text-[13px] font-medium mt-2">
                <Plus className="w-3.5 h-3.5" /> Book delivery
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {orders.slice(0, 6).map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[12px] text-gray-500">#{order.trackingNumber}</span>
                      <StatusBadge status={order.status} size="sm" />
                    </div>
                    <p className="text-[13px] text-gray-700 truncate">{order.packageDescription}</p>
                    <div className="text-[12px] text-gray-400 mt-0.5">
                      {order.pickupZone.name} → {order.dropZone.name} · {order.billableWeightKg}kg
                    </div>
                  </div>
                  <div className="shrink-0 text-right ml-4">
                    <div className="text-[14px] font-medium text-gray-900 font-mono">₹{order.totalPrice.toFixed(0)}</div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 ml-auto mt-0.5 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium text-gray-900">Live Tracking</h2>
            {latestActiveOrder && (
              <span className="text-[12px] text-gray-400 font-mono">#{latestActiveOrder.trackingNumber}</span>
            )}
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <MapboxMap markers={mapMarkers} routeCoordinates={routeCoords} className="h-72 w-full" mode="track" />
            {latestActiveOrder && (
              <div className="px-4 py-3 border-t border-gray-100 space-y-1.5 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-medium text-gray-800">{latestActiveOrder.agent?.user?.name || 'Awaiting dispatch'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={latestActiveOrder.status} size="sm" />
                </div>
                <Link
                  to={`/orders/${latestActiveOrder.id}`}
                  className="block text-center py-2 rounded-md bg-gray-50 hover:bg-gray-100 text-gray-700 text-[13px] font-medium mt-2 transition-colors"
                >
                  View full timeline →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
