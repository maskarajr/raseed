-- v3 G2 print fields (additive, non-destructive). Advance already exists on
-- "Order" from the init migration, so no column change is needed for the
-- advance-capture path (C1). Only the two nullable print-support columns land.

-- AlterTable: invoice-level physical-delivery timestamp (G2 'Delivered {d}')
ALTER TABLE "Invoice" ADD COLUMN "deliveredAt" DATETIME;

-- AlterTable: customer NTN for the invoice 'Billed to' sub-line (G2)
ALTER TABLE "Customer" ADD COLUMN "ntn" TEXT;
