export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export type AgentStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export type ServiceType = 'B2B' | 'B2C';

export type PaymentMode = 'PREPAID' | 'COD';

export type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RESCHEDULED'
  | 'CANCELLED';

export type CodFeeType = 'FLAT' | 'PERCENTAGE';

export type AttemptStatus = 'SUCCESS' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: Role;
  customerProfile?: CustomerProfile | null;
  agentProfile?: AgentProfile | null;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  companyName?: string | null;
  gstNumber?: string | null;
  defaultServiceType?: ServiceType;
}

export interface AgentProfile {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  vehicleType: string;
  vehicleNumber?: string | null;
  licenseNumber?: string | null;
  availabilityStatus: AgentStatus;
  currentLat?: number | null;
  currentLng?: number | null;
  lastLocationUpdate?: string | null;
  currentZoneId?: string | null;
  currentZone?: Zone | null;
  assignedOrders?: Order[];
  _count?: {
    assignedOrders: number;
  };
}

export interface Address {
  id: string;
  contactName: string;
  phone: string;
  email?: string | null;
  street: string;
  apartment?: string | null;
  city: string;
  state: string;
  pincode: string;
  lat?: number | null;
  lng?: number | null;
  zoneId?: string | null;
  zone?: Zone | null;
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
  description?: string | null;
  isActive: boolean;
  pincodes?: ZonePincode[];
  _count?: {
    agents: number;
    pickupOrders: number;
    dropOrders: number;
  };
}

export interface ZonePincode {
  id: string;
  zoneId: string;
  pincode: string;
  areaName: string;
  lat?: number | null;
  lng?: number | null;
}

export interface RateCard {
  id: string;
  code: string;
  name: string;
  serviceType: ServiceType;
  baseWeightKg: number;
  basePriceIntra: number;
  basePriceInter: number;
  perKgRateIntra: number;
  perKgRateInter: number;
  minCharge: number;
  isActive: boolean;
  description?: string | null;
}

export interface CodConfig {
  id: string;
  name: string;
  serviceType?: ServiceType | null;
  feeType: CodFeeType;
  flatFee?: number | null;
  percentageFee?: number | null;
  minFee: number;
  maxFee?: number | null;
  isActive: boolean;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatus;
  actorId?: string | null;
  actor?: {
    id: string;
    name: string;
    role: Role;
  } | null;
  actorRole: string;
  actorName: string;
  notes?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  createdAt: string;
}

export interface DeliveryAttempt {
  id: string;
  orderId: string;
  attemptNumber: number;
  agentId?: string | null;
  agent?: AgentProfile | null;
  status: AttemptStatus;
  failureReason?: string | null;
  notes?: string | null;
  rescheduledFor?: string | null;
  attemptedAt: string;
}

export interface Order {
  id: string;
  trackingNumber: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  agentId?: string | null;
  agent?: AgentProfile | null;
  serviceType: ServiceType;
  paymentMode: PaymentMode;
  status: OrderStatus;
  packageDescription: string;
  packageCategory?: string | null;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  pickupAddressId: string;
  pickupAddress: Address;
  dropAddressId: string;
  dropAddress: Address;
  pickupZoneId: string;
  pickupZone: Zone;
  dropZoneId: string;
  dropZone: Zone;
  isInterZone: boolean;
  rateCardId?: string | null;
  rateCard?: RateCard | null;
  codConfigId?: string | null;
  codConfig?: CodConfig | null;
  baseCharge: number;
  weightCharge: number;
  zoneAdjustmentCharge: number;
  codSurcharge: number;
  totalPrice: number;
  specialInstructions?: string | null;
  scheduledDeliveryDate?: string | null;
  rescheduledDate?: string | null;
  deliveredAt?: string | null;
  statusHistory?: OrderStatusHistory[];
  deliveryAttempts?: DeliveryAttempt[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceBreakdown {
  pickupPincode: string;
  dropPincode: string;
  pickupZone: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
  dropZone: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
  isInterZone: boolean;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  billableWeightKg: number;
  rateCard: {
    id: string;
    code: string;
    name: string;
    serviceType: ServiceType;
    baseWeightKg: number;
    basePrice: number;
    perKgRate: number;
  };
  baseCharge: number;
  weightCharge: number;
  zoneAdjustmentCharge: number;
  codSurcharge: number;
  totalPrice: number;
  currency: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  orderId?: string | null;
  title: string;
  message: string;
  type: string;
  channel: string;
  isRead: boolean;
  metadata?: string | null;
  createdAt: string;
}
