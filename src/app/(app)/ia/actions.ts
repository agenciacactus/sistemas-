"use server";

import { requireUser } from "@/lib/session-guard";
import { generateExecutiveSummary, type Summary } from "@/lib/ai";

export async function generateSummaryAction(
  _prev: Summary | null,
): Promise<Summary> {
  const user = await requireUser();
  return generateExecutiveSummary(user.agencyId, user.agencyName);
}
