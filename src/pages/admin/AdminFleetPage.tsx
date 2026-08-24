import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi, zonesApi } from '../../services/api';
import { AgentStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search, Filter, RotateCcw, Truck, UserCheck, Activity, Users } from 'lucide-react';

export const AdminFleetPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['admin-fleet-roster', selectedStatus],
    queryFn: () =>
      agentsApi.getAllAgents({
        status: selectedStatus === 'ALL' ? undefined : (selectedStatus as AgentStatus),
      }),
    refetchInterval: 4000,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['admin-zones-list'],
    queryFn: () => zonesApi.getZones(),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AgentStatus }) =>
      agentsApi.adminUpdateAvailability(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-fleet-roster'] }),
  });

  // Calculate live stats across all agents
  const stats = useMemo(() => {
    const total = agents.length;
    const available = agents.filter((a) => a.availabilityStatus === 'AVAILABLE').length;
    const busy = agents.filter((a) => a.availabilityStatus === 'BUSY').length;
    const offline = agents.filter((a) => a.availabilityStatus === 'OFFLINE').length;
    return { total, available, busy, offline };
  }, [agents]);

  // Multi-dimensional filtering
  const filteredAgents = useMemo(() => {
    return agents.filter((a) => {
      // 1. Vehicle filter
      if (selectedVehicle !== 'ALL' && a.vehicleType.toUpperCase() !== selectedVehicle.toUpperCase()) {
        return false;
      }
      // 2. Zone filter
      if (selectedZone !== 'ALL' && a.currentZoneId !== selectedZone) {
        return false;
      }
      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = a.user?.name?.toLowerCase().includes(q) || false;
        const emailMatch = a.user?.email?.toLowerCase().includes(q) || false;
        const phoneMatch = a.user?.phone?.toLowerCase().includes(q) || false;
        const vehicleMatch = a.vehicleType.toLowerCase().includes(q) || false;
        const plateMatch = a.vehicleNumber?.toLowerCase().includes(q) || false;
        const zoneMatch = a.currentZone?.name?.toLowerCase().includes(q) || false;
        if (!nameMatch && !emailMatch && !phoneMatch && !vehicleMatch && !plateMatch && !zoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [agents, selectedVehicle, selectedZone, search]);

  const hasActiveFilters =
    selectedStatus !== 'ALL' || selectedVehicle !== 'ALL' || selectedZone !== 'ALL' || search.trim().length > 0;

  const resetFilters = () => {
    setSelectedStatus('ALL');
    setSelectedVehicle('ALL');
    setSelectedZone('ALL');
    setSearch('');
  };

  const statusBtnCls = (active: boolean) =>
    `px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
      active ? 'opacity-30 cursor-not-allowed' : ''
    }`;

  const vehicleTypes = ['ALL', 'BIKE', 'SCOOTER', 'VAN', 'TRUCK', 'EV'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Fleet Roster & Agent Management</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Real-time driver availability, vehicle assignments, GPS coordinates, and manual status override
        </p>
      </div>

      {/* Quick Stats Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-md bg-gray-100 text-gray-700">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-medium">Total Fleet</div>
            <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-medium">Available (Online)</div>
            <div className="text-lg font-semibold text-emerald-600">{stats.available}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-md bg-amber-50 text-amber-700">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-medium">On Delivery (Busy)</div>
            <div className="text-lg font-semibold text-amber-600">{stats.busy}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-md bg-gray-100 text-gray-500">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-gray-500 font-medium">Offline</div>
            <div className="text-lg font-semibold text-gray-600">{stats.offline}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by driver name, email, phone, plate, or zone…"
              className="w-full border border-gray-200 bg-gray-50 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Quick Status Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
            {(
              [
                { key: 'ALL', label: 'All', count: stats.total },
                { key: 'AVAILABLE', label: 'Online', count: stats.available },
                { key: 'BUSY', label: 'Busy', count: stats.busy },
                { key: 'OFFLINE', label: 'Offline', count: stats.offline },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedStatus(s.key)}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  selectedStatus === s.key
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 bg-gray-50 border border-gray-200/60'
                }`}
              >
                <span>{s.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedStatus === s.key ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-gray-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Vehicle Type Filter */}
            <div className="flex items-center gap-1">
              <label className="text-gray-500">Vehicle:</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="border border-gray-200 bg-gray-50 rounded-md px-2 py-1 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {vehicleTypes.map((v) => (
                  <option key={v} value={v}>
                    {v === 'ALL' ? 'All Vehicles' : v}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            <div className="flex items-center gap-1">
              <label className="text-gray-500">Operating Zone:</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="border border-gray-200 bg-gray-50 rounded-md px-2 py-1 text-[12px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="ALL">All Hub Zones</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Driver</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Vehicle</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Zone</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">GPS Signal</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Active Load</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Availability</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Manual Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    Loading fleet roster…
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No delivery agents matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-medium text-[13px]">
                          {agent.user?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{agent.user?.name}</div>
                          <div className="text-[11px] text-gray-400">{agent.user?.email}</div>
                          {agent.user?.phone && (
                            <div className="text-[10px] text-gray-400 font-mono">{agent.user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 font-medium">{agent.vehicleType}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{agent.vehicleNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">
                      {agent.currentZone ? (
                        <span className="font-medium text-gray-800">{agent.currentZone.name}</span>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {agent.currentLat && agent.currentLng ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {agent.currentLat.toFixed(4)}°, {agent.currentLng.toFixed(4)}°
                        </span>
                      ) : (
                        <span className="text-gray-400">No signal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-700">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          (agent._count?.assignedOrders ?? 0) > 0
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {agent._count?.assignedOrders ?? 0} active
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={agent.availabilityStatus} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ userId: agent.userId, status: 'AVAILABLE' })
                          }
                          disabled={agent.availabilityStatus === 'AVAILABLE'}
                          className={`${statusBtnCls(
                            agent.availabilityStatus === 'AVAILABLE',
                          )} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                        >
                          Online
                        </button>
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ userId: agent.userId, status: 'BUSY' })
                          }
                          disabled={agent.availabilityStatus === 'BUSY'}
                          className={`${statusBtnCls(
                            agent.availabilityStatus === 'BUSY',
                          )} bg-amber-50 text-amber-700 hover:bg-amber-100`}
                        >
                          Busy
                        </button>
                        <button
                          onClick={() =>
                            updateStatusMutation.mutate({ userId: agent.userId, status: 'OFFLINE' })
                          }
                          disabled={agent.availabilityStatus === 'OFFLINE'}
                          className={`${statusBtnCls(
                            agent.availabilityStatus === 'OFFLINE',
                          )} bg-gray-100 text-gray-600 hover:bg-gray-200`}
                        >
                          Offline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

