export interface NetworkDeviceStatus {
  total: number;
  online: number;
  offline: number;
}

export interface VoucherStock {
  price: number;
  available: number;
}

/**
 * Network overview derived entirely from database state so the admin
 * dashboard never presents fabricated telemetry. Traffic/bandwidth
 * figures are intentionally absent until a real router integration
 * reports them.
 */
export interface NetworkOverview {
  routers: NetworkDeviceStatus;
  accessPoints: NetworkDeviceStatus;
  activeSubscriptions: number;
  vouchersAvailable: number;
  vouchersByTier: VoucherStock[];
  subscriptionsToday: number;
  activeAlerts: number;
  telemetryConnected: boolean;
}

export interface NetworkAlert {
  id: number;
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  device: string;
  timestamp: string;
}

export interface NetworkDeviceItem {
  id: number;
  name: string;
  type: "router" | "access_point";
  model: string | null;
  ip: string | null;
  macAddress: string | null;
  serialNumber: string | null;
  location: string | null;
  firmware: string | null;
  status: "online" | "offline";
  lastSeenAt: string | null;
}