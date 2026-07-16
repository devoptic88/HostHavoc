export interface VpsPlan {
  id: string;
  name: string;
  ram: number;
  vcpu: number;
  disk: number;
  net: string;
  price: number;
  popular?: boolean;
}

export const VPS_PLANS: VpsPlan[] = [
  { id: "vps-1", name: "VPS-1", ram: 1, vcpu: 1, disk: 20, net: "250 Mbps", price: 5 },
  { id: "vps-2", name: "VPS-2", ram: 2, vcpu: 1, disk: 35, net: "250 Mbps", price: 10 },
  { id: "vps-4", name: "VPS-4", ram: 4, vcpu: 2, disk: 65, net: "250 Mbps", price: 20, popular: true },
  { id: "vps-6", name: "VPS-6", ram: 6, vcpu: 2, disk: 100, net: "250 Mbps", price: 30 },
  { id: "vps-8", name: "VPS-8", ram: 8, vcpu: 4, disk: 140, net: "500 Mbps", price: 40 },
  { id: "vps-12", name: "VPS-12", ram: 12, vcpu: 4, disk: 180, net: "500 Mbps", price: 60 },
  { id: "vps-16", name: "VPS-16", ram: 16, vcpu: 6, disk: 250, net: "1 Gbps", price: 80 },
];

export interface DedicatedPlan {
  id: string;
  cpu: string;
  cores: string;
  ram: string;
  disk: string;
  bandwidth: string;
  price: number;
  soldOut?: boolean;
}

export const DEDICATED_PLANS: DedicatedPlan[] = [
  { id: "ded-9950x", cpu: "AMD Ryzen 9 9950X", cores: "16c / 32t @ 5.7 GHz", ram: "192 GB DDR5", disk: "2×2 TB NVMe", bandwidth: "100 TB @ 10 Gbps", price: 385 },
  { id: "ded-7950x", cpu: "AMD Ryzen 9 7950X", cores: "16c / 32t @ 5.7 GHz", ram: "128 GB DDR5", disk: "2×2 TB NVMe", bandwidth: "100 TB @ 10 Gbps", price: 300 },
  { id: "ded-7900x", cpu: "AMD Ryzen 9 7900X", cores: "12c / 24t @ 5.6 GHz", ram: "128 GB DDR5", disk: "2 TB NVMe", bandwidth: "100 TB @ 10 Gbps", price: 280 },
  { id: "ded-e2388g", cpu: "Intel Xeon E-2388G", cores: "8c / 16t @ 5.1 GHz", ram: "128 GB DDR4", disk: "2 TB NVMe", bandwidth: "100 TB @ 10 Gbps", price: 200 },
  { id: "ded-5950x", cpu: "AMD Ryzen 9 5950X", cores: "16c / 32t @ 4.9 GHz", ram: "128 GB DDR4", disk: "2 TB NVMe", bandwidth: "50 TB @ 10 Gbps", price: 240, soldOut: true },
];
