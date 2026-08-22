import type { NetworkAlert } from "../types/network.types";

export function getMockAlerts(): NetworkAlert[] {
  const now = Date.now();
  return [
    { id: 1, severity: "critical", type: "device_offline", message: "Branch Router - Mwanza is offline", device: "RTR-003", timestamp: new Date(now - 3600000).toISOString() },
    { id: 2, severity: "warning", type: "high_bandwidth", message: "Bandwidth utilization exceeded 80% on Core Router WAN1", device: "RTR-001", timestamp: new Date(now - 7200000).toISOString() },
    { id: 3, severity: "warning", type: "weak_signal", message: "Parking Area AP signal strength below threshold (-68 dBm)", device: "AP-004", timestamp: new Date(now - 14400000).toISOString() },
    { id: 4, severity: "info", type: "firmware_update", message: "Firmware update available for Branch Router - Arusha", device: "RTR-002", timestamp: new Date(now - 86400000).toISOString() },
    { id: 5, severity: "info", type: "client_limit", message: "Office AP - Floor 1 reaching 24% client capacity", device: "AP-001", timestamp: new Date(now - 172800000).toISOString() },
  ];
}
