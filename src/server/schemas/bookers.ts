import { z } from "zod";

export const createBookerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6).max(200),
});

export const updateBookerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
});

export type CreateBookerInput = z.infer<typeof createBookerSchema>;
export type UpdateBookerInput = z.infer<typeof updateBookerSchema>;
