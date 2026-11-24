export type Report = {
  rows: Record<string, string | number | null>[];
  summary?: {
    total: number;
    completed: number;
    scheduledHours: number;
    actualHours: number;
    vehicleDistance: number;
  };
};
