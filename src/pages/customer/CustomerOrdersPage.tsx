import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../services/api';
import { OrderStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, ArrowRight, Plus, RotateCcw } from 'lucide-react';

const STATUS_FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Transit', value: 'IN_TRANSIT' },
  { label: 'Out for Delivery', value: 'OUT_FOR_DELIVERY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Rescheduled', value: 'RESCHEDULED' },
];

export const CustomerOrdersPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', selectedStatus, searchQuery],
    queryFn: () =>
      ordersApi.getOrders({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: searchQuery || undefined,
      }),
    refetchInterval: 5000,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">View status, routes, and pricing for all shipments</p>
        </div>
        <Link to="/book" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Book delivery
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracking # or description…"
            className="w-full border border-gray-200 bg-gray-50 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedStatus(f.value)}
              className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                selectedStatus === f.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-[13px] text-gray-400">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center space-y-2">
          <p className="text-[14px] font-medium text-gray-700">No orders found</p>
          <p className="text-[13px] text-gray-400">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Tracking</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Description</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Route</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Weight</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Price</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[12px] text-gray-600">#{order.trackingNumber}</span>
                      <div className="text-[11px] text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 truncate max-w-[200px]">{order.packageDescription}</p>
                      <p className="text-[11px] text-gray-400">{order.serviceType} · {order.paymentMode}</p>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {order.pickupZone.name} → {order.dropZone.name}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600 font-mono">
                      {order.billableWeightKg}kg
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} size="sm" /></td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">₹{order.totalPrice.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/orders/${order.id}`} className="text-brand-600 hover:text-brand-700 font-medium text-[12px]">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-100">
            {orders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
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
                <div className="shrink-0 text-right ml-3">
                  <div className="text-[13px] font-medium text-gray-900 font-mono">₹{order.totalPrice.toFixed(0)}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
