import { z } from "zod";

export const powerStateSchema = z
  .object({
    percent: z.number().int().min(0).max(100),
    charging: z.boolean(),
    pluggedIn: z.boolean(),
    low: z.boolean(),
  })
  .nullable();

export type PowerState = z.infer<typeof powerStateSchema>;
