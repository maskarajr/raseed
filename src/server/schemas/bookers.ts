import { z } from "zod";

export const createBookerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  password: z.string().min(6).max(200),
  phone: z.string().max(40).optional(),
  route: z.string().max(40).optional(),
});

export const updateBookerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).max(200).optional(),
  phone: z.string().max(40).nullish(),
  route: z.string().max(40).nullish(),
});

export type CreateBookerInput = z.infer<typeof createBookerSchema>;
export type UpdateBookerInput = z.infer<typeof updateBookerSchema>;
