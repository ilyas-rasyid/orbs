import { z } from "zod";

export const userInput = z
  .object({
    employeeCode: z.string().min(2).max(40),
    name: z.string().min(2).max(120),
    email: z.string().email(),
    departmentId: z.string().uuid().nullable().optional(),
    role: z.enum(["EMPLOYEE", "FACILITY_MANAGER", "ADMIN"]).default("EMPLOYEE"),
  })
  .strict();
