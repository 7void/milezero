import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../../services/api';
import { AgentStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Search } from 'lucide-react';

export const AdminFleetPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['admin-fleet-roster', selectedStatus],
    queryFn: () => agentsApi.getAllAgents({ status: selectedStatus === 'ALL' ? undefined : (selectedStatus as AgentStatus) }),
    refetchInterval: 4000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AgentStatus }) => agentsApi.adminUpdateAvailability(userId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-fleet-roster'] }),
  });

  const filteredAgents = agents.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return a.user?.name.toLowerCase().includes(q) || a.user?.email.toLowerCase().includes(q) || a.vehicleType.toLowerCase().includes(q);
  });

  const statusBtnCls = (active: boolean) => `px-2 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${active ? 'opacity-30 cursor-not-allowed' : ''}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Fleet Roster</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Real-time driver availability and GPS coordinates</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers…"
            className="w-full border border-gray-200 bg-gray-50 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
        <div className="flex items-center gap-1">
          {(['ALL', 'AVAILABLE', 'BUSY', 'OFFLINE'] as const).map((s) => (
            <button key={s} onClick={() => setSelectedStatus(s)}
              className={`px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${selectedStatus === s ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
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
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">GPS</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Active</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Set Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : filteredAgents.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No agents found</td></tr>
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
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{agent.vehicleType}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{agent.vehicleNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-600">{agent.currentZone?.name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {agent.currentLat && agent.currentLng ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {agent.currentLat.toFixed(4)}°, {agent.currentLng.toFixed(4)}°
                        </span>
                      ) : <span className="text-gray-400">No signal</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[12px] text-gray-700">{agent._count?.assignedOrders ?? 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={agent.availabilityStatus} size="sm" /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => updateStatusMutation.mutate({ userId: agent.userId, status: 'AVAILABLE' })} disabled={agent.availabilityStatus === 'AVAILABLE'}
                          className={`${statusBtnCls(agent.availabilityStatus === 'AVAILABLE')} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>Online</button>
                        <button onClick={() => updateStatusMutation.mutate({ userId: agent.userId, status: 'BUSY' })} disabled={agent.availabilityStatus === 'BUSY'}
                          className={`${statusBtnCls(agent.availabilityStatus === 'BUSY')} bg-amber-50 text-amber-700 hover:bg-amber-100`}>Busy</button>
                        <button onClick={() => updateStatusMutation.mutate({ userId: agent.userId, status: 'OFFLINE' })} disabled={agent.availabilityStatus === 'OFFLINE'}
                          className={`${statusBtnCls(agent.availabilityStatus === 'OFFLINE')} bg-gray-100 text-gray-600 hover:bg-gray-200`}>Offline</button>
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
