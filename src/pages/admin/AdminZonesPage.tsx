import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { zonesApi } from '../../services/api';
import { Zone, ZonePincode } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Plus, X } from 'lucide-react';

export const AdminZonesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false);
  const [newZoneData, setNewZoneData] = useState({
    code: '',
    name: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    description: '',
  });

  const [activeZoneForPincode, setActiveZoneForPincode] = useState<Zone | null>(null);
  const [newPincodeData, setNewPincodeData] = useState({
    pincode: '',
    areaName: '',
    lat: 12.9716,
    lng: 77.5946,
  });

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['admin-zones'],
    queryFn: () => zonesApi.getZones(true),
  });

  const createZoneMutation = useMutation({
    mutationFn: (dto: any) => zonesApi.createZone(dto),
    onSuccess: () => {
      setIsCreateZoneOpen(false);
      setNewZoneData({ code: '', name: '', city: 'Bengaluru', state: 'Karnataka', description: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-zones'] });
    },
  });

  const addPincodeMutation = useMutation({
    mutationFn: ({ zoneId, dto }: { zoneId: string; dto: any }) =>
      zonesApi.addPincode(zoneId, dto),
    onSuccess: () => {
      setActiveZoneForPincode(null);
      setNewPincodeData({ pincode: '', areaName: '', lat: 12.9716, lng: 77.5946 });
      queryClient.invalidateQueries({ queryKey: ['admin-zones'] });
    },
  });

  const removePincodeMutation = useMutation({
    mutationFn: (pincodeId: string) => zonesApi.removePincode(pincodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-zones'] });
    },
  });

  const handleCreateZoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createZoneMutation.mutate(newZoneData);
  };

  const handleAddPincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeZoneForPincode) return;
    addPincodeMutation.mutate({
      zoneId: activeZoneForPincode.id,
      dto: newPincodeData,
    });
  };

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-2 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500";
  const labelCls = "block text-[12px] font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Zones & Pincodes</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Geographic coverage matrix for automatic address resolution and pricing</p>
        </div>

        <button
          onClick={() => setIsCreateZoneOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create zone</span>
        </button>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full bg-white rounded-lg border border-gray-200 p-12 text-center text-[13px] text-gray-400">
            Loading zones…
          </div>
        ) : (
          zones.map((zone) => (
            <div
              key={zone.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col justify-between space-y-4 hover:border-gray-300 transition-all shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-medium text-gray-500 px-1.5 py-0.5 rounded bg-gray-100">
                        {zone.code}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${zone.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    </div>
                    <h3 className="text-[15px] font-semibold text-gray-900 mt-1.5">{zone.name}</h3>
                    <p className="text-[12px] text-gray-400">
                      {zone.city}, {zone.state}
                    </p>
                  </div>
                </div>

                {zone.description && (
                  <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed">
                    {zone.description}
                  </p>
                )}

                {/* Pincodes List */}
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-gray-700">
                      Mapped Pincodes ({zone.pincodes?.length || 0})
                    </span>
                    <button
                      onClick={() => setActiveZoneForPincode(zone)}
                      className="text-brand-600 hover:text-brand-700 text-[12px] font-medium flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-0.5">
                    {zone.pincodes?.length === 0 ? (
                      <span className="text-[12px] text-gray-400 italic">No pincodes mapped yet</span>
                    ) : (
                      zone.pincodes?.map((pin: ZonePincode) => (
                        <span
                          key={pin.id}
                          className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-gray-50 border border-gray-200 text-gray-700 group"
                        >
                          <span className="font-medium">{pin.pincode}</span>
                          <span className="text-[10px] text-gray-400 font-sans">({pin.areaName})</span>
                          <button
                            onClick={() => removePincodeMutation.mutate(pin.id)}
                            className="text-gray-400 hover:text-red-500 ml-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove pincode"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Zone Modal */}
      <Modal
        isOpen={isCreateZoneOpen}
        onClose={() => setIsCreateZoneOpen(false)}
        title="Create Geographic Zone"
        subtitle="Define a new operational delivery zone"
      >
        <form onSubmit={handleCreateZoneSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Zone Code</label>
            <input
              type="text"
              required
              value={newZoneData.code}
              onChange={(e) => setNewZoneData({ ...newZoneData, code: e.target.value })}
              placeholder="e.g. ZONE-AIRPORT"
              className={inputCls + " uppercase font-mono"}
            />
          </div>

          <div>
            <label className={labelCls}>Zone Name</label>
            <input
              type="text"
              required
              value={newZoneData.name}
              onChange={(e) => setNewZoneData({ ...newZoneData, name: e.target.value })}
              placeholder="e.g. International Airport Corridor"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input
                type="text"
                required
                value={newZoneData.city}
                onChange={(e) => setNewZoneData({ ...newZoneData, city: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input
                type="text"
                required
                value={newZoneData.state}
                onChange={(e) => setNewZoneData({ ...newZoneData, state: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description (Optional)</label>
            <textarea
              rows={2}
              value={newZoneData.description}
              onChange={(e) => setNewZoneData({ ...newZoneData, description: e.target.value })}
              placeholder="Geographic boundary notes"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateZoneOpen(false)}
              className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createZoneMutation.isPending}
              className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50 transition-colors"
            >
              {createZoneMutation.isPending ? 'Creating…' : 'Create Zone'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Pincode Modal */}
      <Modal
        isOpen={!!activeZoneForPincode}
        onClose={() => setActiveZoneForPincode(null)}
        title={`Add Pincode to ${activeZoneForPincode?.name}`}
        subtitle="Associate a postal code and area label with this delivery zone"
      >
        <form onSubmit={handleAddPincodeSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Postal Pincode</label>
            <input
              type="text"
              required
              value={newPincodeData.pincode}
              onChange={(e) => setNewPincodeData({ ...newPincodeData, pincode: e.target.value })}
              placeholder="e.g. 560099"
              className={inputCls + " font-mono"}
            />
          </div>

          <div>
            <label className={labelCls}>Area / Landmark Name</label>
            <input
              type="text"
              required
              value={newPincodeData.areaName}
              onChange={(e) => setNewPincodeData({ ...newPincodeData, areaName: e.target.value })}
              placeholder="e.g. Tech Park Phase 2"
              className={inputCls}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveZoneForPincode(null)}
              className="flex-1 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addPincodeMutation.isPending}
              className="flex-1 py-2 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-[13px] font-medium cursor-pointer disabled:opacity-50 transition-colors"
            >
              {addPincodeMutation.isPending ? 'Mapping…' : 'Map Pincode'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
