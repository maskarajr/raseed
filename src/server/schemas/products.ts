import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  unit: z.string().min(1).max(20).default("pcs"),
  price: z.number().int().nonnegative(),
  stockQty: z.number().int().default(0),
  reorderLevel: z.number().int().nonnegative().optional(),
  active: z.boolean().default(true),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().max(100).nullish(),
  unit: z.string().min(1).max(20).optional(),
  price: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().nullish(),
  active: z.boolean().optional(),
});

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  lowStock: z.enum(["true", "false"]).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
