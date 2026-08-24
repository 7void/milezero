import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ordersApi, pricingApi, zonesApi } from '../../services/api';
import { PriceBreakdown, ServiceType, PaymentMode } from '../../types';
import { CheckCircle2 } from 'lucide-react';

export const BookDeliveryPage: React.FC = () => {
  const navigate = useNavigate();

  const [pickup, setPickup] = useState({
    contactName: 'Rahul Sharma', phone: '+919876543210', email: 'rahul.sharma@example.com',
    street: '142 MG Road, Penthouse 4', apartment: 'Block B', city: 'Bengaluru', state: 'Karnataka',
    pincode: '560001', lat: 12.9716, lng: 77.5946,
  });

  const [drop, setDrop] = useState({
    contactName: 'Anita Verma', phone: '+919876500001', email: 'anita@example.com',
    street: '88 Richmond Road', apartment: 'Apt 2B', city: 'Bengaluru', state: 'Karnataka',
    pincode: '560025', lat: 12.9615, lng: 77.6012,
  });

  const [pkg, setPkg] = useState({
    lengthCm: 25, widthCm: 20, heightCm: 15, actualWeightKg: 2.0,
    packageDescription: 'Electronics – Wireless Audio System', packageCategory: 'Electronics',
    specialInstructions: 'Handle with care. Fragile audio equipment.',
  });

  const [serviceType, setServiceType] = useState<ServiceType>('B2C');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('PREPAID');
  const [quote, setQuote] = useState<PriceBreakdown | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      if (!pickup.pincode || !drop.pincode || pkg.lengthCm <= 0 || pkg.widthCm <= 0 || pkg.heightCm <= 0 || pkg.actualWeightKg <= 0) return;
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const res = await pricingApi.calculateQuote({
          pickupPincode: pickup.pincode, dropPincode: drop.pincode,
          lengthCm: Number(pkg.lengthCm), widthCm: Number(pkg.widthCm), heightCm: Number(pkg.heightCm),
          actualWeightKg: Number(pkg.actualWeightKg), serviceType, paymentMode,
          orderValue: paymentMode === 'COD' ? 1500 : undefined,
        });
        if (!cancelled) setQuote(res);
      } catch (err: any) {
        if (!cancelled) { setQuoteError(err.message || 'Failed to get quote'); setQuote(null); }
      } finally { if (!cancelled) setQuoteLoading(false); }
    };
    const t = setTimeout(fetchQuote, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pickup.pincode, drop.pincode, pkg.lengthCm, pkg.widthCm, pkg.heightCm, pkg.actualWeightKg, serviceType, paymentMode]);

  const createOrderMutation = useMutation({
    mutationFn: (dto: any) => ordersApi.createOrder(dto),
    onSuccess: (order) => setCreatedOrder(order),
  });

  const handleBook = () => {
    createOrderMutation.mutate({
      pickupAddress: pickup, dropAddress: drop,
      lengthCm: Number(pkg.lengthCm), widthCm: Number(pkg.widthCm), heightCm: Number(pkg.heightCm),
      actualWeightKg: Number(pkg.actualWeightKg), packageDescription: pkg.packageDescription,
      packageCategory: pkg.packageCategory, serviceType, paymentMode,
      specialInstructions: pkg.specialInstructions, autoAssign: true,
    });
  };

  const presets = [
    { label: 'B2C Intra-Zone', fn: () => { setPickup(p => ({ ...p, pincode: '560001' })); setDrop(d => ({ ...d, pincode: '560025' })); setPkg(p => ({ ...p, lengthCm: 25, widthCm: 18, heightCm: 12, actualWeightKg: 1.5, packageDescription: 'Artisan Coffee Beans & French Press' })); setServiceType('B2C'); setPaymentMode('PREPAID'); }},
    { label: 'B2B Inter-Zone', fn: () => { setPickup(p => ({ ...p, pincode: '560024' })); setDrop(d => ({ ...d, pincode: '560034' })); setPkg(p => ({ ...p, lengthCm: 60, widthCm: 45, heightCm: 25, actualWeightKg: 14, packageDescription: 'Server Rack Components' })); setServiceType('B2B'); setPaymentMode('COD'); }},
    { label: 'Bulky (12kg vol)', fn: () => setPkg(p => ({ ...p, lengthCm: 50, widthCm: 40, heightCm: 30, actualWeightKg: 2 })) },
    { label: 'Dense (8kg)', fn: () => setPkg(p => ({ ...p, lengthCm: 10, widthCm: 10, heightCm: 10, actualWeightKg: 8 })) },
  ];

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500";
  const labelCls = "block text-[12px] font-medium text-gray-600 mb-1";
  const readOnlyCls = "w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-[13px] text-gray-500 cursor-not-allowed";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Book a Delivery</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Enter addresses and dimensions for an instant rate quote</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12px] text-gray-400 mr-1">Presets:</span>
          {presets.map(p => (
            <button key={p.label} onClick={p.fn} className="px-2 py-1 text-[12px] rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-colors">{p.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Pickup */}
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-gray-900">1. Pickup Address</h3>
              {quote && <span className="text-[12px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">{quote.pickupZone.name}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Sender name</label><input type="text" value={pickup.contactName} onChange={e => setPickup({...pickup, contactName: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Phone</label><input type="text" value={pickup.phone} onChange={e => setPickup({...pickup, phone: e.target.value})} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Street address</label><input type="text" value={pickup.street} onChange={e => setPickup({...pickup, street: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Pincode</label><input type="text" value={pickup.pincode} onChange={e => setPickup({...pickup, pincode: e.target.value})} className={inputCls + " font-mono"} /></div>
              <div><label className={labelCls}>City / State</label><input type="text" value={`${pickup.city}, ${pickup.state}`} readOnly className={readOnlyCls} /></div>
            </div>
          </section>

          {/* Drop */}
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-medium text-gray-900">2. Delivery Destination</h3>
              {quote && <span className="text-[12px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">{quote.dropZone.name}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Recipient name</label><input type="text" value={drop.contactName} onChange={e => setDrop({...drop, contactName: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Phone</label><input type="text" value={drop.phone} onChange={e => setDrop({...drop, phone: e.target.value})} className={inputCls} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Street address</label><input type="text" value={drop.street} onChange={e => setDrop({...drop, street: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Pincode</label><input type="text" value={drop.pincode} onChange={e => setDrop({...drop, pincode: e.target.value})} className={inputCls + " font-mono"} /></div>
              <div><label className={labelCls}>City / State</label><input type="text" value={`${drop.city}, ${drop.state}`} readOnly className={readOnlyCls} /></div>
            </div>
          </section>

          {/* Package */}
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">3. Package Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className={labelCls}>Description</label><input type="text" value={pkg.packageDescription} onChange={e => setPkg({...pkg, packageDescription: e.target.value})} className={inputCls} /></div>
              <div><label className={labelCls}>Length (cm)</label><input type="number" min={1} value={pkg.lengthCm} onChange={e => setPkg({...pkg, lengthCm: Number(e.target.value)})} className={inputCls + " font-mono"} /></div>
              <div><label className={labelCls}>Width (cm)</label><input type="number" min={1} value={pkg.widthCm} onChange={e => setPkg({...pkg, widthCm: Number(e.target.value)})} className={inputCls + " font-mono"} /></div>
              <div><label className={labelCls}>Height (cm)</label><input type="number" min={1} value={pkg.heightCm} onChange={e => setPkg({...pkg, heightCm: Number(e.target.value)})} className={inputCls + " font-mono"} /></div>
              <div><label className={labelCls}>Actual weight (kg)</label><input type="number" step="0.1" min={0.1} value={pkg.actualWeightKg} onChange={e => setPkg({...pkg, actualWeightKg: Number(e.target.value)})} className={inputCls + " font-mono"} /></div>
            </div>
          </section>

          {/* Service & Payment */}
          <section className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-[14px] font-medium text-gray-900 mb-4">4. Service & Payment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Service tier</label>
                <div className="flex gap-2">
                  {(['B2C', 'B2B'] as const).map(t => (
                    <button key={t} onClick={() => setServiceType(t)} className={`flex-1 py-2 rounded-md text-[13px] font-medium border cursor-pointer transition-colors ${serviceType === t ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t === 'B2C' ? 'B2C Standard' : 'B2B Freight'}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Payment</label>
                <div className="flex gap-2">
                  {(['PREPAID', 'COD'] as const).map(m => (
                    <button key={m} onClick={() => setPaymentMode(m)} className={`flex-1 py-2 rounded-md text-[13px] font-medium border cursor-pointer transition-colors ${paymentMode === m ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{m === 'PREPAID' ? 'Prepaid' : 'Cash on Delivery'}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Quote */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-[14px] font-medium text-gray-900">Price Quote</h3>
                {quoteLoading && <span className="text-[12px] text-brand-500 font-medium">Calculating…</span>}
              </div>
            </div>

            <div className="p-5">
              {quoteError ? (
                <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-[13px]">{quoteError}</div>
              ) : !quote ? (
                <p className="text-[13px] text-gray-400 text-center py-6">Enter details to see quote</p>
              ) : (
                <div className="space-y-4 text-[13px]">
                  {/* Weight */}
                  <div className="space-y-1.5 pb-3 border-b border-gray-100">
                    <div className="flex justify-between text-gray-500"><span>Dimensions</span><span className="font-mono text-gray-700">{quote.lengthCm}×{quote.widthCm}×{quote.heightCm} cm</span></div>
                    <div className="flex justify-between text-gray-500"><span>Volumetric weight</span><span className="font-mono text-gray-700">{quote.volumetricWeightKg} kg</span></div>
                    <div className="flex justify-between text-gray-500"><span>Actual weight</span><span className="font-mono text-gray-700">{quote.actualWeightKg} kg</span></div>
                    <div className="flex justify-between font-medium text-gray-900 pt-1"><span>Billable weight</span><span className="font-mono">{quote.billableWeightKg} kg</span></div>
                  </div>

                  {/* Zone */}
                  <div className="space-y-1.5 pb-3 border-b border-gray-100">
                    <div className="flex justify-between text-gray-500"><span>Pickup zone</span><span className="text-gray-700">{quote.pickupZone.name}</span></div>
                    <div className="flex justify-between text-gray-500"><span>Delivery zone</span><span className="text-gray-700">{quote.dropZone.name}</span></div>
                    <div className="flex justify-between text-gray-500">
                      <span>Zone type</span>
                      <span className={`text-[12px] font-medium px-1.5 py-0.5 rounded ${quote.isInterZone ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {quote.isInterZone ? 'Inter-zone' : 'Intra-zone'}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-500"><span>Rate card</span><span className="text-gray-700 font-mono text-[12px]">{quote.rateCard.name}</span></div>
                  </div>

                  {/* Charges */}
                  <div className="space-y-1.5 pb-3 border-b border-gray-100">
                    <div className="flex justify-between text-gray-600"><span>Base charge</span><span className="font-mono">₹{quote.baseCharge.toFixed(2)}</span></div>
                    {quote.weightCharge > 0 && (
                      <div className="flex justify-between text-gray-600"><span>Weight surcharge</span><span className="font-mono">₹{quote.weightCharge.toFixed(2)}</span></div>
                    )}
                    {quote.codSurcharge > 0 && (
                      <div className="flex justify-between text-amber-700"><span>COD surcharge</span><span className="font-mono">+₹{quote.codSurcharge.toFixed(2)}</span></div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[15px] font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-semibold text-gray-900 font-mono">₹{quote.totalPrice.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={createOrderMutation.isPending || !quote}
                    className="w-full py-2.5 rounded-md bg-brand-600 hover:bg-brand-700 text-white font-medium text-[14px] cursor-pointer disabled:opacity-50 transition-colors mt-2"
                  >
                    {createOrderMutation.isPending ? 'Booking…' : `Book delivery · ₹${quote.totalPrice.toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {createdOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl ring-1 ring-gray-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Booking Confirmed</h3>
              <p className="text-[13px] text-gray-500 mt-1">Your delivery has been created and queued for dispatch.</p>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-left space-y-1.5 text-[13px]">
              <div className="flex justify-between"><span className="text-gray-500">Tracking</span><span className="font-mono font-medium text-gray-900">{createdOrder.trackingNumber}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-mono text-gray-900">₹{createdOrder.totalPrice?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="text-brand-600 font-medium">{createdOrder.status}</span></div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => navigate(`/orders/${createdOrder.id}`)} className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer transition-colors">Track order</button>
              <button onClick={() => { setCreatedOrder(null); navigate('/dashboard'); }} className="py-2 px-3 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer transition-colors">Dashboard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
