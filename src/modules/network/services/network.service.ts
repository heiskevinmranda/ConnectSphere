import { MOCK_ROUTERS } from "../mock/routers.data";
import { MOCK_ACCESS_POINTS } from "../mock/access-points.data";
import { getMockAlerts } from "../mock/alerts.data";
import type {
  NetworkOverview,
  BandwidthData,
  ConnectedClient,
} from "../types/network.types";

export function getNetworkOverview(): NetworkOverview {
  const onlineRouters = MOCK_ROUTERS.filter((r) => r.status === "online");
  const onlineAPs = MOCK_ACCESS_POINTS.filter((a) => a.status === "online");
  const totalClients = MOCK_ROUTERS.reduce((sum, r) => sum + r.clients, 0);
  const totalDownload = MOCK_ROUTERS.reduce(
    (sum, r) => sum + r.totalDownload,
    0
  );
  const totalUpload = MOCK_ROUTERS.reduce(
    (sum, r) => sum + r.totalUpload,
    0
  );
  const capacityDown = 450;
  const capacityUp = 120;

  return {
    routers: {
      total: MOCK_ROUTERS.length,
      online: onlineRouters.length,
      offline: MOCK_ROUTERS.length - onlineRouters.length,
    },
    accessPoints: {
      total: MOCK_ACCESS_POINTS.length,
      online: onlineAPs.length,
      offline: MOCK_ACCESS_POINTS.length - onlineAPs.length,
    },
    clients: { total: totalClients, maxCapacity: 800 },
    bandwidth: {
      download: totalDownload,
      upload: totalUpload,
      capacityDown,
      capacityUp,
      utilizationDown: Math.round((totalDownload / capacityDown) * 100),
      utilizationUp: Math.round((totalUpload / capacityUp) * 100),
    },
    activeAlerts: getMockAlerts().filter(
      (a) => a.severity === "critical" || a.severity === "warning"
    ).length,
    totalTrafficToday: "3.3 TB",
  };
}

export function getBandwidthData(): BandwidthData {
  const onlineRouters = MOCK_ROUTERS.filter((r) => r.status === "online");
  return {
    total: {
      download: 280.6,
      upload: 71.0,
      capacityDown: 450,
      capacityUp: 120,
      utilizationDown: 62,
      utilizationUp: 59,
    },
    byRouter: onlineRouters.map((r) => ({
      id: r.id,
      name: r.name,
      download: r.totalDownload,
      upload: r.totalUpload,
      utilizationDown: Math.round((r.totalDownload / 200) * 100),
      utilizationUp: Math.round((r.totalUpload / 60) * 100),
    })),
    traffic: {
      today: "3.3 TB",
      peakHour: "18:00 - 19:00",
      avgUtilization: 58,
    },
  };
}

function generateClients(routerId: string, count: number): ConnectedClient[] {
  const names = [
    "iPhone-14-Pro", "Samsung-Galaxy-S23", "Laptop-Dell", "MacBook-Pro",
    "Huawei-P60", "Desktop-Win11", "iPad-Air", "Xiaomi-13",
    "OPPO-Reno8", "Vivo-V25", "Printer-HP", "Smart-TV-Samsung",
    "CCTV-Cam-01", "Router-MikroTik",
  ];
  const prefixes = ["192.168.1.", "192.168.2.", "192.168.3."];
  const idx = parseInt(routerId.replace("RTR-00", "")) - 1;
  const prefix = prefixes[idx] || "192.168.1.";

  return Array.from({ length: Math.min(count, names.length) }, (_, i) => ({
    id: `CLI-${routerId}-${i}`,
    name: names[i],
    ip: `${prefix}${10 + i}`,
    mac: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 256)
        .toString(16)
        .padStart(2, "0")
    )
      .join(":")
      .toUpperCase(),
    type:
      names[i].includes("Printer") || names[i].includes("CCTV")
        ? "wired"
        : "wireless",
    upload: (Math.random() * 15).toFixed(1),
    download: (Math.random() * 50).toFixed(1),
    dataUsage: `${(Math.random() * 5).toFixed(1)} GB`,
    connected: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m ago`,
  }));
}

export function getRouterById(id: string) {
  return MOCK_ROUTERS.find((r) => r.id === id) || null;
}

export function getRouterClients(id: string): ConnectedClient[] | null {
  const router = MOCK_ROUTERS.find((r) => r.id === id);
  if (!router) return null;
  return generateClients(id, router.clients);
}

export function getRouterInterfaces(id: string) {
  const router = MOCK_ROUTERS.find((r) => r.id === id);
  if (!router) return null;
  return router.interfaces || [];
}
