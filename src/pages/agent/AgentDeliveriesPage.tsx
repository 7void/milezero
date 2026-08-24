import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { agentsApi } from '../../services/api';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, ArrowRight, Truck } from 'lucide-react';

export const AgentDeliveriesPage: React.FC = () => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DELIVERED' | 'FAILED'>('ALL');
  const [search, setSearch] = useState('');

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['agent-all-deliveries'],
    queryFn: () => agentsApi.getMyDeliveries(),
    refetchInterval: 5000,
  });

  const filteredDeliveries = deliveries.filter((d) => {
    if (filter === 'ACTIVE') {
      if (!['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(d.status))
        return false;
    } else if (filter === 'DELIVERED') {
      if (d.status !== 'DELIVERED') return false;
    } else if (filter === 'FAILED') {
      if (d.status !== 'FAILED') return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.trackingNumber.toLowerCase().includes(q) ||
        d.packageDescription.toLowerCase().includes(q) ||
        d.pickupAddress.contactName.toLowerCase().includes(q) ||
        d.dropAddress.contactName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Delivery Queue</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Assigned deliveries and historical task logs</p>
        </div>

        <Link
          to="/agent"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium transition-colors"
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Active Console</span>
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking #, address…"
            className="w-full border border-gray-200 bg-gray-50 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1">
          {(['ALL', 'ACTIVE', 'DELIVERED', 'FAILED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-[13px] text-gray-400">
            Loading assigned deliveries…
          </div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center space-y-2">
            <p className="text-[14px] font-medium text-gray-700">No deliveries found</p>
            <p className="text-[13px] text-gray-400">No assigned tasks match your active filters.</p>
          </div>
        ) : (
          filteredDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-gray-300 transition-colors"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold text-gray-900">
                    #{delivery.trackingNumber}
                  </span>
                  <StatusBadge status={delivery.status} size="sm" />
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {delivery.paymentMode}: ₹{delivery.totalPrice.toFixed(0)}
                  </span>
                  <span className="text-[12px] text-gray-400 ml-auto sm:ml-0">
                    {new Date(delivery.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <p className="text-[13px] font-medium text-gray-800">{delivery.packageDescription}</p>
                  {delivery.specialInstructions && (
                    <p className="text-[12px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mt-0.5">
                      Note: {delivery.specialInstructions}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] text-gray-500 pt-1">
                  <div>
                    <span className="font-medium text-gray-700">Pickup:</span> {delivery.pickupAddress.contactName} ({delivery.pickupAddress.city})
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Drop:</span> {delivery.dropAddress.contactName} ({delivery.dropAddress.city})
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                <Link
                  to={`/orders/${delivery.id}`}
                  className="px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 text-[12px] font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Timeline</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'].includes(delivery.status) && (
                  <Link
                    to="/agent"
                    className="px-3 py-1.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-medium flex items-center gap-1 transition-colors"
                  >
                    <span>Console</span>
                    <Truck className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
