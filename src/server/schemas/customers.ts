import { z } from "zod";

// Name is required; phone and area are optional (no credit-limit field).
export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  area: z.string().max(120).optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).nullish(),
  area: z.string().max(120).nullish(),
});

export const listCustomersQuerySchema = z.object({
  search: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
