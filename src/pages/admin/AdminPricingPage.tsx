import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pricingApi } from '../../services/api';
import { RateCard, CodConfig } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Edit2, CheckCircle2 } from 'lucide-react';

export const AdminPricingPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [editingRateCard, setEditingRateCard] = useState<RateCard | null>(null);
  const [editingCodConfig, setEditingCodConfig] = useState<CodConfig | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const { data: rateCards = [], isLoading: rateCardsLoading } = useQuery({
    queryKey: ['admin-rate-cards'],
    queryFn: () => pricingApi.getRateCards(true),
  });

  const { data: codConfig } = useQuery({
    queryKey: ['admin-cod-config'],
    queryFn: () => pricingApi.getCodConfig(),
  });

  const updateRateCardMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      pricingApi.updateRateCard(id, dto),
    onSuccess: () => {
      setEditingRateCard(null);
      setSaveSuccessMsg('Rate card updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-rate-cards'] });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
  });

  const updateCodConfigMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) =>
      pricingApi.updateCodConfig(id, dto),
    onSuccess: () => {
      setEditingCodConfig(null);
      setSaveSuccessMsg('COD surcharge rules updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['admin-cod-config'] });
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
  });

  const handleRateCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRateCard) return;
    updateRateCardMutation.mutate({
      id: editingRateCard.id,
      dto: {
        name: editingRateCard.name,
        baseWeightKg: Number(editingRateCard.baseWeightKg),
        basePriceIntra: Number(editingRateCard.basePriceIntra),
        basePriceInter: Number(editingRateCard.basePriceInter),
        perKgRateIntra: Number(editingRateCard.perKgRateIntra),
        perKgRateInter: Number(editingRateCard.perKgRateInter),
        minCharge: Number(editingRateCard.minCharge),
        description: editingRateCard.description,
      },
    });
  };

  const handleCodConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCodConfig) return;
    updateCodConfigMutation.mutate({
      id: editingCodConfig.id,
      dto: {
        feeType: editingCodConfig.feeType,
        percentageFee: Number(editingCodConfig.percentageFee),
        flatFee: Number(editingCodConfig.flatFee),
        minFee: Number(editingCodConfig.minFee),
        maxFee: Number(editingCodConfig.maxFee),
      },
    });
  };

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500";
  const labelCls = "block text-[12px] font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pricing & Rate Cards</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Configurable weight thresholds, intra/inter-zone multipliers, and COD collection rules
        </p>
      </div>

      {saveSuccessMsg && (
        <div className="px-4 py-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Rate Cards */}
      <div className="space-y-3">
        <h2 className="text-[14px] font-medium text-gray-900">Active Rate Cards</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rateCardsLoading ? (
            <div className="col-span-full bg-white rounded-lg border border-gray-200 p-12 text-center text-[13px] text-gray-400">
              Loading rate cards…
            </div>
          ) : (
            rateCards.map((rc) => (
              <div
                key={rc.id}
                className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] font-medium text-gray-500 px-1.5 py-0.5 rounded bg-gray-100">
                          {rc.code}
                        </span>
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${rc.serviceType === 'B2B' ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-700'}`}>
                          {rc.serviceType}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-gray-900">{rc.name}</h3>
                      {rc.description && (
                        <p className="text-[12px] text-gray-500 mt-0.5">{rc.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => setEditingRateCard(rc)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit Rate Card"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Pricing Details */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-md bg-gray-50 border border-gray-100 text-[12px]">
                    <div>
                      <span className="text-gray-500 block">Base Weight</span>
                      <span className="text-gray-900 font-semibold font-mono text-[13px]">
                        Up to {rc.baseWeightKg} kg
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 block">Min Charge</span>
                      <span className="text-gray-900 font-semibold font-mono text-[13px]">
                        ₹{rc.minCharge.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-gray-200/60 pt-2">
                      <span className="text-emerald-700 font-medium block">Intra-Zone</span>
                      <div className="text-gray-900 font-mono">
                        Base: ₹{rc.basePriceIntra.toFixed(2)}
                      </div>
                      <div className="text-gray-500 font-mono text-[11px]">
                        +₹{rc.perKgRateIntra.toFixed(2)}/kg
                      </div>
                    </div>

                    <div className="border-t border-gray-200/60 pt-2">
                      <span className="text-red-700 font-medium block">Inter-Zone</span>
                      <div className="text-gray-900 font-mono">
                        Base: ₹{rc.basePriceInter.toFixed(2)}
                      </div>
                      <div className="text-gray-500 font-mono text-[11px]">
                        +₹{rc.perKgRateInter.toFixed(2)}/kg
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-between border-t border-gray-100">
                  <span>Formula: (L×W×H)/5000</span>
                  <span className="text-emerald-600 font-medium">● Active in engine</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* COD Configuration */}
      <div className="space-y-3">
        <h2 className="text-[14px] font-medium text-gray-900">Cash On Delivery (COD) Rules</h2>

        {codConfig && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono">
                  {codConfig.feeType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT'}
                </span>
                <span className="text-gray-900 font-semibold text-[14px]">{codConfig.name}</span>
              </div>
              <p className="text-[13px] text-gray-500 max-w-xl leading-relaxed">
                {codConfig.feeType === 'PERCENTAGE'
                  ? `Applied as ${codConfig.percentageFee}% of order value or delivery fee (min ₹${codConfig.minFee}, max ₹${codConfig.maxFee || '500'}).`
                  : `Fixed flat surcharge of ₹${codConfig.flatFee} per COD shipment.`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right font-mono">
                <div className="text-xl font-semibold text-gray-900">
                  {codConfig.feeType === 'PERCENTAGE'
                    ? `${codConfig.percentageFee}%`
                    : `₹${codConfig.flatFee}`}
                </div>
                <div className="text-[11px] text-gray-400">
                  Min: ₹{codConfig.minFee} · Max: ₹{codConfig.maxFee || '500'}
                </div>
              </div>

              <button
                onClick={() => setEditingCodConfig(codConfig)}
                className="px-3 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-[13px] font-medium transition-colors cursor-pointer"
              >
                Configure
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Rate Card Modal */}
      <Modal
        isOpen={!!editingRateCard}
        onClose={() => setEditingRateCard(null)}
        title={`Edit ${editingRateCard?.name}`}
        subtitle="Modify base weights and zone rates"
      >
        {editingRateCard && (
          <form onSubmit={handleRateCardSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Base Weight Included (kg)</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editingRateCard.baseWeightKg}
                  onChange={(e) =>
                    setEditingRateCard({
                      ...editingRateCard,
                      baseWeightKg: Number(e.target.value),
                    })
                  }
                  className={inputCls + " font-mono"}
                />
              </div>

              <div>
                <label className={labelCls}>Minimum Charge (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={editingRateCard.minCharge}
                  onChange={(e) =>
                    setEditingRateCard({
                      ...editingRateCard,
                      minCharge: Number(e.target.value),
                    })
                  }
                  className={inputCls + " font-mono"}
                />
              </div>
            </div>

            {/* Intra Zone */}
            <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200/60 space-y-3">
              <span className="text-[12px] font-medium text-emerald-800">Intra-Zone (Same Zone)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Base Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingRateCard.basePriceIntra}
                    onChange={(e) =>
                      setEditingRateCard({
                        ...editingRateCard,
                        basePriceIntra: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
                <div>
                  <label className={labelCls}>Rate per Excess kg (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingRateCard.perKgRateIntra}
                    onChange={(e) =>
                      setEditingRateCard({
                        ...editingRateCard,
                        perKgRateIntra: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
              </div>
            </div>

            {/* Inter Zone */}
            <div className="p-3.5 rounded-md bg-gray-50 border border-gray-200/60 space-y-3">
              <span className="text-[12px] font-medium text-red-800">Inter-Zone (Cross-Zone)</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Base Price (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingRateCard.basePriceInter}
                    onChange={(e) =>
                      setEditingRateCard({
                        ...editingRateCard,
                        basePriceInter: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
                <div>
                  <label className={labelCls}>Rate per Excess kg (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingRateCard.perKgRateInter}
                    onChange={(e) =>
                      setEditingRateCard({
                        ...editingRateCard,
                        perKgRateInter: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRateCard(null)}
                className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateRateCardMutation.isPending}
                className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50 transition-colors"
              >
                {updateRateCardMutation.isPending ? 'Saving…' : 'Save Rate Card'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit COD Surcharge Modal */}
      <Modal
        isOpen={!!editingCodConfig}
        onClose={() => setEditingCodConfig(null)}
        title="Configure COD Rules"
        subtitle="Manage cash-handling fees for Cash On Delivery orders"
      >
        {editingCodConfig && (
          <form onSubmit={handleCodConfigSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Fee Type</label>
              <select
                value={editingCodConfig.feeType}
                onChange={(e) =>
                  setEditingCodConfig({
                    ...editingCodConfig,
                    feeType: e.target.value as any,
                  })
                }
                className={inputCls}
              >
                <option value="PERCENTAGE">Percentage (%) of order total</option>
                <option value="FLAT">Flat Fee (₹)</option>
              </select>
            </div>

            {editingCodConfig.feeType === 'PERCENTAGE' ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingCodConfig.percentageFee || 2.0}
                    onChange={(e) =>
                      setEditingCodConfig({
                        ...editingCodConfig,
                        percentageFee: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
                <div>
                  <label className={labelCls}>Min Fee (₹)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingCodConfig.minFee}
                    onChange={(e) =>
                      setEditingCodConfig({
                        ...editingCodConfig,
                        minFee: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
                <div>
                  <label className={labelCls}>Max Fee (₹)</label>
                  <input
                    type="number"
                    step="1"
                    value={editingCodConfig.maxFee || 500}
                    onChange={(e) =>
                      setEditingCodConfig({
                        ...editingCodConfig,
                        maxFee: Number(e.target.value),
                      })
                    }
                    className={inputCls + " font-mono"}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>Flat Surcharge (₹)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={editingCodConfig.flatFee || 40}
                  onChange={(e) =>
                    setEditingCodConfig({
                      ...editingCodConfig,
                      flatFee: Number(e.target.value),
                    })
                  }
                  className={inputCls + " font-mono"}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCodConfig(null)}
                className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateCodConfigMutation.isPending}
                className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50 transition-colors"
              >
                {updateCodConfigMutation.isPending ? 'Saving…' : 'Save Rules'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
