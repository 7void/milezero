import {
  User,
  Order,
  OrderStatus,
  Zone,
  RateCard,
  CodConfig,
  PriceBreakdown,
  AgentProfile,
  AgentStatus,
  NotificationItem,
  ServiceType,
  PaymentMode,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('milezero_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : errorData.message;
        }
      } catch {
        // Fallback to status text
      }
      throw new Error(errorMessage);
    }
    if (response.status === 204) {
      return {} as T;
    }
    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async put<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async delete<T>(path: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<T>(response);
  }
}

export const client = new ApiClient();

export const authApi = {
  login: (dto: { email: string; password: string }) =>
    client.post<{ accessToken: string; user: User }>('/auth/login', dto),
  register: (dto: any) =>
    client.post<{ accessToken: string; user: User }>('/auth/register', dto),
  getMe: () => client.get<User>('/auth/me'),
};

export const ordersApi = {
  createOrder: (dto: any) => client.post<Order>('/orders', dto),
  getOrders: (params?: {
    status?: OrderStatus;
    zoneId?: string;
    customerId?: string;
    agentId?: string;
    search?: string;
    serviceType?: string;
    paymentMode?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val) query.append(key, val);
      });
    }
    const qs = query.toString();
    return client.get<Order[]>(`/orders${qs ? `?${qs}` : ''}`);
  },
  getOrderById: (id: string) => client.get<Order>(`/orders/${id}`),
  updateStatus: (
    id: string,
    dto: {
      status: OrderStatus;
      notes?: string;
      failureReason?: string;
      lat?: number;
      lng?: number;
    },
  ) => client.patch<Order>(`/orders/${id}/status`, dto),
  rescheduleOrder: (
    id: string,
    dto: { newDeliveryDate: string; notes?: string; autoReassign?: boolean },
  ) => client.post<Order>(`/orders/${id}/reschedule`, dto),
  adminOverride: (
    id: string,
    dto: { newStatus: OrderStatus; auditReason: string; newAgentId?: string },
  ) => client.post<Order>(`/orders/${id}/admin-override`, dto),
  cancelOrder: (id: string, reason?: string) =>
    client.post<Order>(`/orders/${id}/cancel`, { reason }),
};

export const pricingApi = {
  calculateQuote: (dto: {
    pickupPincode: string;
    dropPincode: string;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    actualWeightKg: number;
    serviceType?: ServiceType;
    paymentMode?: PaymentMode;
    orderValue?: number;
  }) => client.post<PriceBreakdown>('/pricing/quote', dto),
  getRateCards: (includeInactive = false) =>
    client.get<RateCard[]>(`/pricing/rate-cards?includeInactive=${includeInactive}`),
  getRateCardById: (id: string) => client.get<RateCard>(`/pricing/rate-cards/${id}`),
  createRateCard: (dto: any) => client.post<RateCard>('/pricing/rate-cards', dto),
  updateRateCard: (id: string, dto: any) =>
    client.put<RateCard>(`/pricing/rate-cards/${id}`, dto),
  deleteRateCard: (id: string) => client.delete(`/pricing/rate-cards/${id}`),
  getCodConfig: () => client.get<CodConfig>('/pricing/cod-config'),
  updateCodConfig: (id: string, dto: any) =>
    client.put<CodConfig>(`/pricing/cod-config/${id}`, dto),
};

export const zonesApi = {
  getZones: (includeInactive = false) =>
    client.get<Zone[]>(`/zones?includeInactive=${includeInactive}`),
  getZoneById: (id: string) => client.get<Zone>(`/zones/${id}`),
  createZone: (dto: any) => client.post<Zone>('/zones', dto),
  updateZone: (id: string, dto: any) => client.put<Zone>(`/zones/${id}`, dto),
  deleteZone: (id: string) => client.delete(`/zones/${id}`),
  addPincode: (zoneId: string, dto: any) =>
    client.post(`/zones/${zoneId}/pincodes`, dto),
  removePincode: (pincodeId: string) => client.delete(`/zones/pincodes/${pincodeId}`),
  resolveZone: (pincode: string) =>
    client.get<{ zone: Zone; pincodeInfo: any; isFallback: boolean }>(
      `/zones/resolve?pincode=${pincode}`,
    ),
};

export const agentsApi = {
  getMyProfile: () => client.get<AgentProfile>('/agents/me'),
  updateMyAvailability: (status: AgentStatus) =>
    client.patch<AgentProfile>('/agents/me/availability', { status }),
  updateMyLocation: (dto: { lat: number; lng: number; zoneId?: string }) =>
    client.patch<AgentProfile>('/agents/me/location', dto),
  simulateStep: (dto: { targetLat: number; targetLng: number; stepFraction?: number }) =>
    client.post<AgentProfile>('/agents/me/simulate-step', dto),
  getMyDeliveries: () => client.get<Order[]>('/agents/me/deliveries'),
  getAllAgents: (params?: { status?: AgentStatus; zoneId?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.zoneId) query.append('zoneId', params.zoneId);
    const qs = query.toString();
    return client.get<AgentProfile[]>(`/agents${qs ? `?${qs}` : ''}`);
  },
  adminUpdateAvailability: (userId: string, status: AgentStatus) =>
    client.patch<AgentProfile>(`/agents/${userId}/availability`, { status }),
};

export const assignmentApi = {
  manualAssign: (dto: { orderId: string; agentId: string; notes?: string }) =>
    client.post<Order>('/assignment/manual', dto),
  autoAssign: (orderId: string) =>
    client.post<{ assigned: boolean; message?: string; agent?: any; order?: Order }>(
      '/assignment/auto',
      { orderId },
    ),
  autoAssignAll: () =>
    client.post<{ totalProcessed: number; assignedCount: number; results: any[] }>(
      '/assignment/auto-all',
    ),
};

export const trackingApi = {
  getTracking: (trackingNumber: string) =>
    client.get<any>(`/tracking/${trackingNumber}`),
};

export const notificationsApi = {
  getMyNotifications: (unreadOnly = false) =>
    client.get<NotificationItem[]>(`/notifications?unreadOnly=${unreadOnly}`),
  getUnreadCount: () =>
    client.get<{ unreadCount: number }>('/notifications/unread-count'),
  markAsRead: (id: string) => client.patch(`/notifications/${id}/read`),
  markAllAsRead: () => client.patch('/notifications/read-all'),
};

export const adminApi = {
  getMetrics: () =>
    client.get<{
      overview: {
        totalOrders: number;
        activeDeliveries: number;
        deliveredCount: number;
        failedCount: number;
        successRate: number;
        totalRevenue: number;
        currency: string;
      };
      statusBreakdown: Record<string, number>;
      agentCapacity: {
        total: number;
        available: number;
        busy: number;
        offline: number;
      };
      serviceTypeDistribution: Record<string, number>;
      recentActivity: Order[];
    }>('/admin/metrics'),
  getFleetOverview: () =>
    client.get<{
      timestamp: string;
      agents: any[];
      activeOrders: any[];
    }>('/admin/fleet-overview'),
};
