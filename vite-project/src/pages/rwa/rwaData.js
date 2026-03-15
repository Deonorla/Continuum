// Shared RWA data & helpers used across God View, Asset Factory, Fleet Control
import { useState, useEffect } from 'react';

export const MOCK_ASSETS = [
  {
    id: 'rwa-001', type: 'real_estate',
    title: 'Lagos Commercial Plaza', location: 'Victoria Island, Lagos',
    lat: 6.4281, lng: 3.4219,
    description: 'Grade-A office complex. Owner retains NFT + yield rights.',
    totalYield: 50000, duration: 365 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 30 * 86400,
    flowRate: 50000 / (365 * 86400),
    pricePerHour: 5.71, accessType: 'Smart lock · Floor 3–8',
    gradient: 'from-blue-600/20 to-cyan-600/20', border: 'border-blue-500/30',
    ownerAddress: '0xABCD...1234',
    renter: '0x9F12...3A4B', rentedSince: Math.floor(Date.now() / 1000) - 3600 * 5,
  },
  {
    id: 'rwa-002', type: 'vehicle',
    title: 'Tesla Model S Fleet (×5)', location: 'Lekki, Lagos',
    lat: 6.4698, lng: 3.5852,
    description: 'Premium EV fleet. Owner keeps NFT + resale rights.',
    totalYield: 12000, duration: 90 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 10 * 86400,
    flowRate: 12000 / (90 * 86400),
    pricePerHour: 50, accessType: 'IoT ignition unlock',
    gradient: 'from-purple-600/20 to-pink-600/20', border: 'border-purple-500/30',
    ownerAddress: '0xDEF0...5678',
    renter: '0x2C88...F1D0', rentedSince: Math.floor(Date.now() / 1000) - 3600 * 2,
  },
  {
    id: 'rwa-003', type: 'commodity',
    title: 'Industrial CNC Machinery', location: 'Apapa Industrial Zone',
    lat: 6.4474, lng: 3.3903,
    description: 'Precision manufacturing equipment. Stream to activate machine controller.',
    totalYield: 8000, duration: 60 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 5 * 86400,
    flowRate: 8000 / (60 * 86400),
    pricePerHour: 10, accessType: 'PLC controller unlock',
    gradient: 'from-amber-600/20 to-orange-600/20', border: 'border-amber-500/30',
    ownerAddress: '0x9ABC...9012',
    renter: null, rentedSince: null,
  },
  {
    id: 'rwa-004', type: 'real_estate',
    title: 'Abuja Residential Complex', location: 'Maitama, Abuja',
    lat: 9.0765, lng: 7.3986,
    description: '48-unit apartment block. Tenants stream rent per-second.',
    totalYield: 120000, duration: 365 * 86400,
    startTime: Math.floor(Date.now() / 1000) - 60 * 86400,
    flowRate: 120000 / (365 * 86400),
    pricePerHour: 13.7, accessType: 'Smart lock · All units',
    gradient: 'from-emerald-600/20 to-teal-600/20', border: 'border-emerald-500/30',
    ownerAddress: '0x1234...ABCD',
    renter: '0x7E55...C290', rentedSince: Math.floor(Date.now() / 1000) - 3600 * 12,
  },
];

export const TYPE_META = {
  real_estate: { label: 'Real Estate', color: 'text-blue-400',   dot: 'bg-blue-400'   },
  vehicle:     { label: 'Vehicle',     color: 'text-purple-400', dot: 'bg-purple-400' },
  commodity:   { label: 'Commodity',   color: 'text-amber-400',  dot: 'bg-amber-400'  },
};

export function calcYield(asset) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = Math.max(0, Math.min(now, asset.startTime + asset.duration) - asset.startTime);
  return Math.min(elapsed * asset.flowRate, asset.totalYield);
}

export function calcRentPaid(asset) {
  if (!asset.renter || !asset.rentedSince) return 0;
  const elapsed = Math.floor(Date.now() / 1000) - asset.rentedSince;
  return (elapsed / 3600) * asset.pricePerHour;
}

export function useLiveTick(fn, interval = 1000) {
  const [val, setVal] = useState(fn);
  useEffect(() => {
    const id = setInterval(() => setVal(fn()), interval);
    return () => clearInterval(id);
  }, []);
  return val;
}
