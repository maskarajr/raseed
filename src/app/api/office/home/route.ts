import { requireRole } from "@/server/auth/requireRole";
import { json } from "@/server/http";
import { officeHomeSummary } from "@/server/services/officeHome";

// Read-only dashboard endpoint. No writes of any kind.
export const GET = requireRole(
  "owner",
  "office",
)(async () => {
  const data = await officeHomeSummary();
  return json(data);
});
