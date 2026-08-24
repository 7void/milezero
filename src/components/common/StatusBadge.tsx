import React from 'react';
import { OrderStatus, AgentStatus } from '../../types';

interface StatusBadgeProps {
  status: OrderStatus | AgentStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  PENDING:           { label: 'Pending',           dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  ASSIGNED:          { label: 'Assigned',          dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700' },
  PICKED_UP:         { label: 'Picked Up',         dot: 'bg-indigo-400',  bg: 'bg-indigo-50',  text: 'text-indigo-700' },
  IN_TRANSIT:        { label: 'In Transit',        dot: 'bg-cyan-500',    bg: 'bg-cyan-50',    text: 'text-cyan-700' },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery',  dot: 'bg-violet-500',  bg: 'bg-violet-50',  text: 'text-violet-700' },
  DELIVERED:         { label: 'Delivered',          dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  FAILED:            { label: 'Failed',             dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700' },
  RESCHEDULED:       { label: 'Rescheduled',        dot: 'bg-orange-400',  bg: 'bg-orange-50',  text: 'text-orange-700' },
  CANCELLED:         { label: 'Cancelled',          dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-600' },
  AVAILABLE:         { label: 'Available',          dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  BUSY:              { label: 'Busy',               dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  OFFLINE:           { label: 'Offline',            dot: 'bg-gray-400',    bg: 'bg-gray-100',   text: 'text-gray-500' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const c = CONFIG[status] || { label: status, dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[11px] gap-1',
    md: 'px-2 py-0.5 text-[12px] gap-1.5',
    lg: 'px-2.5 py-1 text-[13px] gap-1.5',
  }[size];

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${c.bg} ${c.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};
