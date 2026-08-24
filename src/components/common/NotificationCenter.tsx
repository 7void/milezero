import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../services/api';
import { Bell, Check, X } from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getMyNotifications(),
    refetchInterval: 5000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 5000,
  });

  const unreadCount = unreadData?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleNotificationClick = (item: any) => {
    if (!item.isRead) markOneMutation.mutate(item.id);
    if (item.orderId) {
      setIsOpen(false);
      navigate(`/orders/${item.orderId}`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden flex flex-col max-h-96">
            <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 text-[13px]">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllMutation.mutate()}
                    className="text-[12px] text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-[13px]">
                  No notifications yet
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`px-3.5 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer flex gap-2.5 items-start ${
                      !item.isRead ? 'bg-brand-50/30' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[13px] font-medium text-gray-800 truncate">
                          {item.title}
                        </p>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed mt-0.5">
                        {item.message}
                      </p>
                    </div>
                    {!item.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
