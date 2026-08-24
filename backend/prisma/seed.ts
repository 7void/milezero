import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from current directory or parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient, Role, AgentStatus, ServiceType, PaymentMode, OrderStatus, CodFeeType, AttemptStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.notification.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.deliveryAttempt.deleteMany();
  await prisma.order.deleteMany();
  await prisma.codConfig.deleteMany();
  await prisma.rateCard.deleteMany();
  await prisma.zonePincode.deleteMany();
  await prisma.address.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@milezero.io',
      name: 'Sarah Chen (Ops Director)',
      passwordHash,
      phone: '+919880011223',
      role: Role.ADMIN,
    },
  });

  const customerRahul = await prisma.user.create({
    data: {
      email: 'rahul.sharma@example.com',
      name: 'Rahul Sharma',
      passwordHash,
      phone: '+919876543210',
      role: Role.CUSTOMER,
      customerProfile: {
        create: {
          companyName: 'Sharma Household',
          defaultServiceType: ServiceType.B2C,
        },
      },
    },
  });

  const customerTechCorp = await prisma.user.create({
    data: {
      email: 'techcorp@example.com',
      name: 'TechCorp Logistics & Hardware',
      passwordHash,
      phone: '+919845012345',
      role: Role.CUSTOMER,
      customerProfile: {
        create: {
          companyName: 'TechCorp Solutions Pvt Ltd',
          gstNumber: '29ABCDE1234F1Z5',
          defaultServiceType: ServiceType.B2B,
        },
      },
    },
  });

  const customerPriya = await prisma.user.create({
    data: {
      email: 'priya.retail@example.com',
      name: 'Priya Patel',
      passwordHash,
      phone: '+919811223344',
      role: Role.CUSTOMER,
      customerProfile: {
        create: {
          companyName: 'Priya Fashion Boutique',
          gstNumber: '29ZYXWV9876E1Z2',
          defaultServiceType: ServiceType.B2C,
        },
      },
    },
  });

  const zoneCentral = await prisma.zone.create({
    data: {
      code: 'ZONE-CENTRAL',
      name: 'Central Business Hub',
      city: 'Bengaluru',
      state: 'Karnataka',
      description: 'Downtown commercial, retail, and tech central district',
      isActive: true,
      pincodes: {
        create: [
          { pincode: '560001', areaName: 'MG Road / Brigade Road', lat: 12.9716, lng: 77.5946 },
          { pincode: '560025', areaName: 'Richmond Town / Langford', lat: 12.9615, lng: 77.6012 },
          { pincode: '560002', areaName: 'City Market / Chickpet', lat: 12.9663, lng: 77.5768 },
        ],
      },
    },
  });

  const zoneNorth = await prisma.zone.create({
    data: {
      code: 'ZONE-NORTH',
      name: 'North Metro Corridor',
      city: 'Bengaluru',
      state: 'Karnataka',
      description: 'Hebbal, Yelahanka, and Airport corridor',
      isActive: true,
      pincodes: {
        create: [
          { pincode: '560024', areaName: 'Hebbal / RT Nagar', lat: 13.0358, lng: 77.5970 },
          { pincode: '560064', areaName: 'Yelahanka Satellite Town', lat: 13.1007, lng: 77.5963 },
          { pincode: '560092', areaName: 'Sahakara Nagar', lat: 13.0624, lng: 77.5898 },
        ],
      },
    },
  });

  const zoneSouth = await prisma.zone.create({
    data: {
      code: 'ZONE-SOUTH',
      name: 'South Tech Corridor',
      city: 'Bengaluru',
      state: 'Karnataka',
      description: 'Koramangala, HSR Layout, and Electronic City',
      isActive: true,
      pincodes: {
        create: [
          { pincode: '560034', areaName: 'Koramangala Block 3 & 4', lat: 12.9352, lng: 77.6245 },
          { pincode: '560102', areaName: 'HSR Layout Sector 1-7', lat: 12.9121, lng: 77.6446 },
          { pincode: '560068', areaName: 'Madivala / Bommanahalli', lat: 12.9172, lng: 77.6227 },
        ],
      },
    },
  });

  const zoneEast = await prisma.zone.create({
    data: {
      code: 'ZONE-EAST',
      name: 'East Tech Parks',
      city: 'Bengaluru',
      state: 'Karnataka',
      description: 'Whitefield, Indiranagar, and Marathahalli tech zones',
      isActive: true,
      pincodes: {
        create: [
          { pincode: '560038', areaName: 'Indiranagar 100ft Road', lat: 12.9784, lng: 77.6408 },
          { pincode: '560066', areaName: 'Whitefield ITPL', lat: 12.9698, lng: 77.7499 },
          { pincode: '560037', areaName: 'Marathahalli Bridge', lat: 12.9591, lng: 77.6974 },
        ],
      },
    },
  });

  const zoneWest = await prisma.zone.create({
    data: {
      code: 'ZONE-WEST',
      name: 'West Suburban Heights',
      city: 'Bengaluru',
      state: 'Karnataka',
      description: 'Rajajinagar, Malleshwaram, and Peenya Industrial',
      isActive: true,
      pincodes: {
        create: [
          { pincode: '560010', areaName: 'Rajajinagar 1st Block', lat: 12.9982, lng: 77.5530 },
          { pincode: '560003', areaName: 'Malleshwaram 8th Cross', lat: 13.0031, lng: 77.5702 },
          { pincode: '560058', areaName: 'Peenya Industrial Area', lat: 13.0285, lng: 77.5195 },
        ],
      },
    },
  });

  const agentUserAlex = await prisma.user.create({
    data: {
      email: 'alex.agent@milezero.io',
      name: 'Alex Rivera',
      passwordHash,
      phone: '+919900112233',
      role: Role.AGENT,
      agentProfile: {
        create: {
          vehicleType: 'BIKE',
          vehicleNumber: 'KA-01-EA-1001',
          licenseNumber: 'DL-2022-ALEX-01',
          availabilityStatus: AgentStatus.AVAILABLE,
          currentLat: 12.9720,
          currentLng: 77.5950,
          lastLocationUpdate: new Date(),
          currentZoneId: zoneCentral.id,
        },
      },
    },
    include: { agentProfile: true },
  });

  const agentUserSam = await prisma.user.create({
    data: {
      email: 'sam.agent@milezero.io',
      name: 'Sam Wilson',
      passwordHash,
      phone: '+919900223344',
      role: Role.AGENT,
      agentProfile: {
        create: {
          vehicleType: 'VAN',
          vehicleNumber: 'KA-04-MB-2045',
          licenseNumber: 'DL-2021-SAMW-02',
          availabilityStatus: AgentStatus.BUSY,
          currentLat: 13.0358,
          currentLng: 77.5970,
          lastLocationUpdate: new Date(),
          currentZoneId: zoneNorth.id,
        },
      },
    },
    include: { agentProfile: true },
  });

  const agentUserMarcus = await prisma.user.create({
    data: {
      email: 'marcus.agent@milezero.io',
      name: 'Marcus Vance',
      passwordHash,
      phone: '+919900334455',
      role: Role.AGENT,
      agentProfile: {
        create: {
          vehicleType: 'SCOOTER',
          vehicleNumber: 'KA-05-ST-3312',
          licenseNumber: 'DL-2023-MVAN-03',
          availabilityStatus: AgentStatus.AVAILABLE,
          currentLat: 12.9250,
          currentLng: 77.6200,
          lastLocationUpdate: new Date(),
          currentZoneId: zoneSouth.id,
        },
      },
    },
    include: { agentProfile: true },
  });

  const agentUserElena = await prisma.user.create({
    data: {
      email: 'elena.agent@milezero.io',
      name: 'Elena Rostova',
      passwordHash,
      phone: '+919900445566',
      role: Role.AGENT,
      agentProfile: {
        create: {
          vehicleType: 'VAN',
          vehicleNumber: 'KA-03-TR-8821',
          licenseNumber: 'DL-2020-ERST-04',
          availabilityStatus: AgentStatus.OFFLINE,
          currentLat: 12.9800,
          currentLng: 77.6800,
          lastLocationUpdate: new Date(),
          currentZoneId: zoneEast.id,
        },
      },
    },
    include: { agentProfile: true },
  });

  const rateCardB2C = await prisma.rateCard.create({
    data: {
      code: 'B2C-STD-EXPRESS',
      name: 'B2C Standard Express',
      serviceType: ServiceType.B2C,
      baseWeightKg: 1.0,
      basePriceIntra: 40.0,
      basePriceInter: 70.0,
      perKgRateIntra: 20.0,
      perKgRateInter: 35.0,
      minCharge: 40.0,
      isActive: true,
      description: 'Standard last-mile parcel delivery for retail consumers',
    },
  });

  const rateCardB2B = await prisma.rateCard.create({
    data: {
      code: 'B2B-FREIGHT-EXP',
      name: 'B2B Freight Express',
      serviceType: ServiceType.B2B,
      baseWeightKg: 5.0,
      basePriceIntra: 120.0,
      basePriceInter: 200.0,
      perKgRateIntra: 15.0,
      perKgRateInter: 25.0,
      minCharge: 120.0,
      isActive: true,
      description: 'Heavy shipment and commercial enterprise bulk freight rate',
    },
  });

  const codConfig = await prisma.codConfig.create({
    data: {
      name: 'Standard COD Surcharge',
      feeType: CodFeeType.PERCENTAGE,
      percentageFee: 2.0,
      flatFee: 40.0,
      minFee: 30.0,
      maxFee: 500.0,
      isActive: true,
    },
  });

  const createAddr = async (userId: string, name: string, phone: string, street: string, city: string, pin: string, lat: number, lng: number, zoneId: string) => {
    return prisma.address.create({
      data: {
        userId,
        contactName: name,
        phone,
        street,
        city,
        state: 'Karnataka',
        pincode: pin,
        lat,
        lng,
        zoneId,
      },
    });
  };

  // Order 1: DELIVERED
  const pAddr1 = await createAddr(customerRahul.id, 'Rahul Sharma', '+919876543210', '142 MG Road, Penthouse 4', 'Bengaluru', '560001', 12.9716, 77.5946, zoneCentral.id);
  const dAddr1 = await createAddr(customerRahul.id, 'Anita Verma', '+919876500001', '88 Richmond Road, Apt 2B', 'Bengaluru', '560025', 12.9615, 77.6012, zoneCentral.id);

  const orderDelivered = await prisma.order.create({
    data: {
      trackingNumber: 'MZ-2026-800101',
      customerId: customerRahul.id,
      agentId: agentUserAlex.agentProfile!.id,
      serviceType: ServiceType.B2C,
      paymentMode: PaymentMode.PREPAID,
      status: OrderStatus.DELIVERED,
      packageDescription: 'Artisan Espresso Coffee Beans & Grinder',
      packageCategory: 'Gourmet Food',
      lengthCm: 25,
      widthCm: 18,
      heightCm: 12,
      actualWeightKg: 1.5,
      volumetricWeightKg: 1.08,
      billableWeightKg: 1.5,
      pickupAddressId: pAddr1.id,
      dropAddressId: dAddr1.id,
      pickupZoneId: zoneCentral.id,
      dropZoneId: zoneCentral.id,
      isInterZone: false,
      rateCardId: rateCardB2C.id,
      baseCharge: 40.0,
      weightCharge: 10.0,
      codSurcharge: 0,
      totalPrice: 50.0,
      deliveredAt: new Date(Date.now() - 3600000 * 2),
      createdAt: new Date(Date.now() - 3600000 * 6),
    },
  });

  const t0 = new Date(Date.now() - 3600000 * 6);
  await prisma.orderStatusHistory.createMany({
    data: [
      { orderId: orderDelivered.id, status: OrderStatus.PENDING, actorRole: 'CUSTOMER', actorName: 'Rahul Sharma', notes: 'Order placed online', createdAt: t0 },
      { orderId: orderDelivered.id, status: OrderStatus.ASSIGNED, actorRole: 'SYSTEM', actorName: 'MileZero Dispatch', notes: 'Assigned to nearest available agent Alex Rivera', createdAt: new Date(t0.getTime() + 15 * 60000) },
      { orderId: orderDelivered.id, status: OrderStatus.PICKED_UP, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'Package verified and picked up from merchant', createdAt: new Date(t0.getTime() + 60 * 60000) },
      { orderId: orderDelivered.id, status: OrderStatus.IN_TRANSIT, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'In transit via Central Expressway', createdAt: new Date(t0.getTime() + 100 * 60000) },
      { orderId: orderDelivered.id, status: OrderStatus.OUT_FOR_DELIVERY, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'Arriving at recipient gate', createdAt: new Date(t0.getTime() + 180 * 60000) },
      { orderId: orderDelivered.id, status: OrderStatus.DELIVERED, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'Handed directly to recipient Anita Verma. Signature captured.', createdAt: new Date(t0.getTime() + 240 * 60000) },
    ],
  });

  // Order 2: OUT_FOR_DELIVERY
  const pAddr2 = await createAddr(customerTechCorp.id, 'TechCorp Dispatch Center', '+919845012345', 'Plot 45 Hebbal Industrial Ring', 'Bengaluru', '560024', 13.0358, 77.5970, zoneNorth.id);
  const dAddr2 = await createAddr(customerTechCorp.id, 'Alpha IT Labs', '+919845099887', '7th Block Koramangala 80ft Road', 'Bengaluru', '560034', 12.9352, 77.6245, zoneSouth.id);

  const orderOutForDelivery = await prisma.order.create({
    data: {
      trackingNumber: 'MZ-2026-800102',
      customerId: customerTechCorp.id,
      agentId: agentUserSam.agentProfile!.id,
      serviceType: ServiceType.B2B,
      paymentMode: PaymentMode.COD,
      status: OrderStatus.OUT_FOR_DELIVERY,
      packageDescription: 'Server Rack Switches & Fiber Transceivers (3 Units)',
      packageCategory: 'IT Hardware',
      lengthCm: 60,
      widthCm: 45,
      heightCm: 25,
      actualWeightKg: 14.5,
      volumetricWeightKg: 13.5,
      billableWeightKg: 14.5,
      pickupAddressId: pAddr2.id,
      dropAddressId: dAddr2.id,
      pickupZoneId: zoneNorth.id,
      dropZoneId: zoneSouth.id,
      isInterZone: true,
      rateCardId: rateCardB2B.id,
      codConfigId: codConfig.id,
      baseCharge: 200.0,
      weightCharge: 237.5,
      codSurcharge: 40.0,
      totalPrice: 477.5,
      specialInstructions: 'Security check at Gate 2. Collect payment receipt before unloading.',
      createdAt: new Date(Date.now() - 3600000 * 3),
    },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      { orderId: orderOutForDelivery.id, status: OrderStatus.PENDING, actorRole: 'CUSTOMER', actorName: 'TechCorp Dispatch', notes: 'High priority B2B shipment created', createdAt: new Date(Date.now() - 3600000 * 3) },
      { orderId: orderOutForDelivery.id, status: OrderStatus.ASSIGNED, actorRole: 'ADMIN', actorName: 'Sarah Chen', notes: 'Manually allocated to heavy van agent Sam Wilson', createdAt: new Date(Date.now() - 3600000 * 2.5) },
      { orderId: orderOutForDelivery.id, status: OrderStatus.PICKED_UP, actorRole: 'AGENT', actorName: 'Sam Wilson', notes: 'Loaded 3 cartons into Van KA-04-MB-2045', createdAt: new Date(Date.now() - 3600000 * 1.8) },
      { orderId: orderOutForDelivery.id, status: OrderStatus.IN_TRANSIT, actorRole: 'AGENT', actorName: 'Sam Wilson', notes: 'Cross-zone transit North to South Corridor', createdAt: new Date(Date.now() - 3600000 * 1) },
      { orderId: orderOutForDelivery.id, status: OrderStatus.OUT_FOR_DELIVERY, actorRole: 'AGENT', actorName: 'Sam Wilson', notes: 'Agent is 1.2km away approaching destination', createdAt: new Date(Date.now() - 15 * 60000) },
    ],
  });

  // Order 3: FAILED
  const pAddr3 = await createAddr(customerPriya.id, 'Priya Fashion Hub', '+919811223344', '402 Indiranagar 100ft Road', 'Bengaluru', '560038', 12.9784, 77.6408, zoneEast.id);
  const dAddr3 = await createAddr(customerPriya.id, 'Dr. Meera Nambiar', '+919811200009', '12 Rajajinagar 1st Main Road', 'Bengaluru', '560010', 12.9982, 77.5530, zoneWest.id);

  const orderFailed = await prisma.order.create({
    data: {
      trackingNumber: 'MZ-2026-800106',
      customerId: customerPriya.id,
      agentId: null,
      serviceType: ServiceType.B2C,
      paymentMode: PaymentMode.COD,
      status: OrderStatus.FAILED,
      packageDescription: 'Designer Silk Saree & Festive Jewelry Box',
      packageCategory: 'Apparel & Luxury',
      lengthCm: 35,
      widthCm: 25,
      heightCm: 10,
      actualWeightKg: 1.2,
      volumetricWeightKg: 1.75,
      billableWeightKg: 1.75,
      pickupAddressId: pAddr3.id,
      dropAddressId: dAddr3.id,
      pickupZoneId: zoneEast.id,
      dropZoneId: zoneWest.id,
      isInterZone: true,
      rateCardId: rateCardB2C.id,
      codConfigId: codConfig.id,
      baseCharge: 70.0,
      weightCharge: 26.25,
      codSurcharge: 30.0,
      totalPrice: 126.25,
      createdAt: new Date(Date.now() - 3600000 * 8),
    },
  });

  await prisma.orderStatusHistory.createMany({
    data: [
      { orderId: orderFailed.id, status: OrderStatus.PENDING, actorRole: 'CUSTOMER', actorName: 'Priya Patel', notes: 'Order booked', createdAt: new Date(Date.now() - 3600000 * 8) },
      { orderId: orderFailed.id, status: OrderStatus.ASSIGNED, actorRole: 'SYSTEM', actorName: 'MileZero Dispatch', notes: 'Assigned to Agent Alex Rivera', createdAt: new Date(Date.now() - 3600000 * 7) },
      { orderId: orderFailed.id, status: OrderStatus.PICKED_UP, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'Picked up from Indiranagar boutique', createdAt: new Date(Date.now() - 3600000 * 5) },
      { orderId: orderFailed.id, status: OrderStatus.OUT_FOR_DELIVERY, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'Out for delivery at recipient residence', createdAt: new Date(Date.now() - 3600000 * 3) },
      { orderId: orderFailed.id, status: OrderStatus.FAILED, actorRole: 'AGENT', actorName: 'Alex Rivera', notes: 'Customer unavailable: Door locked and phone unreachable after 3 attempts', createdAt: new Date(Date.now() - 3600000 * 1) },
    ],
  });

  await prisma.deliveryAttempt.create({
    data: {
      orderId: orderFailed.id,
      attemptNumber: 1,
      status: AttemptStatus.FAILED,
      failureReason: 'Customer Unavailable (Door locked, phone unreachable)',
      notes: 'Agent waited 12 minutes at location. Customer did not answer calls.',
      attemptedAt: new Date(Date.now() - 3600000 * 1),
    },
  });

  // Order 4: PENDING
  const pAddr4 = await createAddr(customerTechCorp.id, 'TechCorp Hub', '+919845012345', '56 MG Road Tower A', 'Bengaluru', '560001', 12.9716, 77.5946, zoneCentral.id);
  const dAddr4 = await createAddr(customerTechCorp.id, 'Koramangala Co-working', '+919845088776', '12 80ft Road Koramangala', 'Bengaluru', '560034', 12.9352, 77.6245, zoneSouth.id);

  await prisma.order.create({
    data: {
      trackingNumber: 'MZ-2026-800105',
      customerId: customerTechCorp.id,
      agentId: null,
      serviceType: ServiceType.B2B,
      paymentMode: PaymentMode.PREPAID,
      status: OrderStatus.PENDING,
      packageDescription: 'Precision Ergonomic Keyboards & Mice (10 Pack)',
      packageCategory: 'Office Equipment',
      lengthCm: 45,
      widthCm: 35,
      heightCm: 20,
      actualWeightKg: 6.0,
      volumetricWeightKg: 6.3,
      billableWeightKg: 6.3,
      pickupAddressId: pAddr4.id,
      dropAddressId: dAddr4.id,
      pickupZoneId: zoneCentral.id,
      dropZoneId: zoneSouth.id,
      isInterZone: true,
      rateCardId: rateCardB2B.id,
      baseCharge: 200.0,
      weightCharge: 32.5, // 1.3kg * 25
      codSurcharge: 0,
      totalPrice: 232.5,
      createdAt: new Date(Date.now() - 20 * 60000), // 20 mins ago
      statusHistory: {
        create: {
          status: OrderStatus.PENDING,
          actorRole: 'CUSTOMER',
          actorName: 'TechCorp Logistics',
          notes: 'Order placed, awaiting nearest agent allocation',
          createdAt: new Date(Date.now() - 20 * 60000),
        },
      },
    },
  });

  console.log('Seed completed successfully.');
  console.log('----------------------------------------------------');
  console.log('Demo credentials:');
  console.log('  Admin:    admin@milezero.io / Password123!');
  console.log('  Customer: rahul.sharma@example.com / Password123!');
  console.log('  Customer: techcorp@example.com / Password123!');
  console.log('  Customer: priya.retail@example.com / Password123!');
  console.log('  Agent:    alex.agent@milezero.io / Password123! (Available, Central)');
  console.log('  Agent:    sam.agent@milezero.io / Password123! (Busy, North)');
  console.log('  Agent:    marcus.agent@milezero.io / Password123! (Available, South)');
  console.log('  Agent:    elena.agent@milezero.io / Password123! (Offline, East)');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
