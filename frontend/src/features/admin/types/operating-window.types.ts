export type OperatingWindow = {
  id?: string;
  dayOfWeek: number;
  opens: string;
  closes: string;
  kind: "BOOKING" | "HANDOVER" | "RETURN";
};
