import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ordersApi, assignmentApi, agentsApi, zonesApi } from '../../services/api';
import { OrderStatus, Order, AgentProfile } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Search, Zap, UserCheck, ArrowRight } from 'lucide-react';

const STATUS_LIST: OrderStatus[] = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RESCHEDULED', 'CANCELLED'];

export const AdminOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [manualAssignOrder, setManualAssignOrder] = useState<Order | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [overrideOrder, setOverrideOrder] = useState<Order | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<OrderStatus>('DELIVERED');
  const [auditReason, setAuditReason] = useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', selectedStatus, selectedZone, search],
    queryFn: () => ordersApi.getOrders({ status: selectedStatus === 'ALL' ? undefined : (selectedStatus as OrderStatus), zoneId: selectedZone === 'ALL' ? undefined : selectedZone, search: search || undefined }),
    refetchInterval: 4000,
  });

  const { data: agents = [] } = useQuery({ queryKey: ['admin-agents-available'], queryFn: () => agentsApi.getAllAgents() });
  const { data: zones = [] } = useQuery({ queryKey: ['zones'], queryFn: () => zonesApi.getZones() });

  const manualAssignMutation = useMutation({
    mutationFn: (dto: { orderId: string; agentId: string; notes?: string }) => assignmentApi.manualAssign(dto),
    onSuccess: () => { setManualAssignOrder(null); setAssignNotes(''); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  const autoAssignMutation = useMutation({
    mutationFn: (orderId: string) => assignmentApi.autoAssign(orderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const overrideMutation = useMutation({
    mutationFn: (dto: { orderId: string; newStatus: OrderStatus; auditReason: string }) => ordersApi.adminOverride(dto.orderId, { newStatus: dto.newStatus, auditReason: dto.auditReason }),
    onSuccess: () => { setOverrideOrder(null); setAuditReason(''); queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); },
  });

  const handleManualAssignSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!manualAssignOrder || !selectedAgentId) return; manualAssignMutation.mutate({ orderId: manualAssignOrder.id, agentId: selectedAgentId, notes: assignNotes }); };
  const handleOverrideSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!overrideOrder || !auditReason.trim()) return; overrideMutation.mutate({ orderId: overrideOrder.id, newStatus: overrideStatus, auditReason }); };

  const selectCls = "border border-gray-200 bg-white rounded-md px-3 py-1.5 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500";
  const modalInputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Order Management</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Dispatch, assign agents, and manage lifecycle transitions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="relative flex-1 max-w-sm">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tracking # or customer…"
            className="w-full border border-gray-200 bg-gray-50 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={selectCls}>
          <option value="ALL">All statuses</option>
          {STATUS_LIST.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)} className={selectCls}>
          <option value="ALL">All zones</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Tracking</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Route</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Price</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Agent</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No orders found</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${order.id}`} className="font-mono text-[12px] text-brand-600 hover:text-brand-700 font-medium">#{order.trackingNumber}</Link>
                      <div className="text-[11px] text-gray-400 mt-0.5">{order.serviceType} · {order.paymentMode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{order.customer.name}</div>
                      <div className="text-[11px] text-gray-400">{order.customer.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {order.pickupZone.name} → {order.dropZone.name}
                      <div className="text-[11px] text-gray-400">{order.isInterZone ? 'Inter-zone' : 'Intra-zone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-medium text-gray-900">₹{order.totalPrice.toFixed(0)}</div>
                      <div className="text-[11px] text-gray-400">{order.billableWeightKg}kg</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} size="sm" /></td>
                    <td className="px-4 py-3 text-[12px]">
                      {order.agent ? (
                        <div><div className="text-gray-700 font-medium">{order.agent.user?.name}</div><div className="text-[11px] text-gray-400">{order.agent.vehicleType}</div></div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {['PENDING', 'RESCHEDULED'].includes(order.status) && (
                          <button onClick={() => autoAssignMutation.mutate(order.id)} disabled={autoAssignMutation.isPending} title="Auto-assign"
                            className="px-2 py-1 rounded-md text-[11px] font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 cursor-pointer transition-colors inline-flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> Auto
                          </button>
                        )}
                        {['PENDING', 'RESCHEDULED', 'ASSIGNED'].includes(order.status) && (
                          <button onClick={() => { setManualAssignOrder(order); setSelectedAgentId(order.agentId || agents[0]?.id || ''); }} title="Manual assign"
                            className="px-2 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors inline-flex items-center gap-0.5">
                            <UserCheck className="w-3 h-3" /> Assign
                          </button>
                        )}
                        <button onClick={() => { setOverrideOrder(order); setOverrideStatus(order.status); }} title="Admin override"
                          className="px-2 py-1 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition-colors">
                          Override
                        </button>
                        <Link to={`/orders/${order.id}`} className="px-2 py-1 rounded-md text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Assignment Modal */}
      <Modal isOpen={!!manualAssignOrder} onClose={() => setManualAssignOrder(null)} title="Assign Agent" subtitle={`Order #${manualAssignOrder?.trackingNumber}`}>
        <form onSubmit={handleManualAssignSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Select agent</label>
            <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className={modalInputCls}>
              {agents.map((agent: AgentProfile) => (
                <option key={agent.id} value={agent.id}>{agent.user?.name} – {agent.vehicleType} ({agent.availabilityStatus})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input type="text" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="e.g. Express rush delivery" className={modalInputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setManualAssignOrder(null)} className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer">Cancel</button>
            <button type="submit" disabled={manualAssignMutation.isPending} className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50">
              {manualAssignMutation.isPending ? 'Assigning…' : 'Confirm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Admin Override Modal */}
      <Modal isOpen={!!overrideOrder} onClose={() => setOverrideOrder(null)} title="Admin Status Override" subtitle={`Order #${overrideOrder?.trackingNumber} — audit logged`}>
        <form onSubmit={handleOverrideSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Target status</label>
            <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value as OrderStatus)} className={modalInputCls}>
              {STATUS_LIST.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Audit reason (required)</label>
            <textarea required rows={3} value={auditReason} onChange={(e) => setAuditReason(e.target.value)}
              placeholder="e.g. Customer picked up from hub directly" className={modalInputCls + " placeholder-gray-400"} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setOverrideOrder(null)} className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer">Cancel</button>
            <button type="submit" disabled={overrideMutation.isPending || !auditReason.trim()} className="flex-1 py-2 rounded-md bg-gray-900 hover:bg-gray-800 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50">
              {overrideMutation.isPending ? 'Applying…' : 'Apply Override'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
