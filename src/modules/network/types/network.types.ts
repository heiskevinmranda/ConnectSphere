export interface NetworkRouter {
  id: string;
  name: string;
  model: string;
  ip: string;
  mac: string;
  serialNumber: string;
  status: "online" | "offline";
  uptime: string;
  cpu: number;
  memory: number;
  memoryTotal: string;
  memoryUsed: string;
  firmware: string;
  clients: number;
  maxClients: number;
  wanStatus: string;
  lanStatus: string;
  totalDownload: number;
  totalUpload: number;
  totalTrafficToday: string;
  interfaces?: NetworkInterface[];
}

export interface NetworkInterface {
  name: string;
  type: "WAN" | "LAN";
  status: string;
  speed: string;
  ip: string;
  download: number;
  upload: number;
  rxBytes: string;
  txBytes: string;
}

export interface AccessPoint {
  id: string;
  name: string;
  model: string;
  ip: string;
  mac: string;
  status: "online" | "offline";
  clients: number;
  maxClients: number;
  ssids: string[];
  channel: number;
  frequency: string;
  band: string;
  signal: number;
  transmitPower: string;
  uptime: string;
  firmware: string;
}

export interface NetworkAlert {
  id: number;
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  device: string;
  timestamp: string;
}

export interface NetworkOverview {
  routers: { total: number; online: number; offline: number };
  accessPoints: { total: number; online: number; offline: number };
  clients: { total: number; maxCapacity: number };
  bandwidth: {
    download: number;
    upload: number;
    capacityDown: number;
    capacityUp: number;
    utilizationDown: number;
    utilizationUp: number;
  };
  activeAlerts: number;
  totalTrafficToday: string;
}

export interface BandwidthData {
  total: {
    download: number;
    upload: number;
    capacityDown: number;
    capacityUp: number;
    utilizationDown: number;
    utilizationUp: number;
  };
  byRouter: Array<{
    id: string;
    name: string;
    download: number;
    upload: number;
    utilizationDown: number;
    utilizationUp: number;
  }>;
  traffic: {
    today: string;
    peakHour: string;
    avgUtilization: number;
  };
}

export interface ConnectedClient {
  id: string;
  name: string;
  ip: string;
  mac: string;
  type: "wired" | "wireless";
  upload: string;
  download: string;
  dataUsage: string;
  connected: string;
}
