// Shared domain logic: geo math, urgency scoring and the deterministic
// match-scoring engine. Used by both the browser UI and the server-side AI tools
// so every explanation is reproducible from live database values.

export type OrgType = "supplier" | "recipient" | "logistics";
export type VerificationStatus = "pending" | "verified" | "rejected" | "flagged";
export type TransferStatus =
  | "proposed"
  | "accepted"
  | "scheduled"
  | "pickup_ready"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "impact_verified"
  | "cancelled";

export const TRANSFER_FLOW: TransferStatus[] = [
  "proposed",
  "accepted",
  "scheduled",
  "pickup_ready",
  "picked_up",
  "in_transit",
  "delivered",
  "impact_verified",
];

export const TRANSFER_LABEL: Record<TransferStatus, string> = {
  proposed: "Proposed",
  accepted: "Accepted",
  scheduled: "Scheduled",
  pickup_ready: "Pickup ready",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  impact_verified: "Impact verified",
  cancelled: "Cancelled",
};

export function haversineKm(
  a: { latitude?: number | null; longitude?: number | null },
  b: { latitude?: number | null; longitude?: number | null },
): number | null {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return null;
  }
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export function hoursUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return (new Date(iso).getTime() - Date.now()) / 36e5;
}

/** 0-100. Higher = closer to being wasted / missed. */
export function urgencyScore(expiresAt?: string | null): number {
  const h = hoursUntil(expiresAt);
  if (h == null) return 10;
  if (h <= 0) return 100;
  if (h <= 12) return 98;
  if (h <= 24) return 92;
  if (h <= 48) return 80;
  if (h <= 96) return 62;
  if (h <= 168) return 44;
  if (h <= 336) return 28;
  return 14;
}

export function urgencyBand(score: number): "critical" | "high" | "moderate" | "low" {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

export type ScorableResource = {
  id: string;
  title: string;
  category_id: string;
  quantity: number;
  reserved_quantity: number;
  unit: string;
  status: string;
  expires_at: string | null;
  requires_refrigeration: boolean;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  organization_id: string;
};

export type ScorableNeed = {
  id: string;
  title: string;
  category_id: string;
  quantity: number;
  min_quantity: number | null;
  fulfilled_quantity: number;
  unit: string;
  status: string;
  deadline: string | null;
  has_refrigeration: boolean;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  organization_id: string;
};

export type MatchResult = {
  score: number;
  quantity: number;
  distanceKm: number | null;
  reasons: string[];
  blockers: string[];
  missing: string[];
};

/**
 * Deterministic multi-factor scoring. Every reason string maps to a real
 * database value — nothing here is invented.
 */
export function scoreMatch(
  resource: ScorableResource,
  need: ScorableNeed,
  ctx: {
    supplierVerified: boolean;
    recipientVerified: boolean;
    supplierReliability?: number;
    transportAvailable?: boolean;
  },
): MatchResult {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const missing: string[] = [];
  let score = 0;

  // 1. Resource compatibility (30)
  if (resource.category_id === need.category_id) {
    score += 30;
    reasons.push("Exact resource category match");
  } else {
    blockers.push("Different resource category");
  }

  // 2. Quantity fit (20)
  const available = Math.max(0, Number(resource.quantity) - Number(resource.reserved_quantity));
  const outstanding = Math.max(0, Number(need.quantity) - Number(need.fulfilled_quantity));
  const transferable = Math.min(available, outstanding);
  if (transferable <= 0) {
    blockers.push("No unreserved quantity available for this need");
  } else if (transferable >= outstanding) {
    score += 20;
    reasons.push(`Covers the full outstanding need (${outstanding} ${need.unit})`);
  } else if (need.min_quantity != null && transferable >= Number(need.min_quantity)) {
    score += 14;
    reasons.push(
      `Partial cover of ${transferable} ${need.unit}, above the recipient minimum of ${need.min_quantity}`,
    );
  } else {
    score += 7;
    reasons.push(`Partial cover of ${transferable} ${need.unit}`);
  }
  if (resource.unit !== need.unit) missing.push("Units differ — confirm conversion before transfer");

  // 3. Distance (15)
  const distanceKm = haversineKm(resource, need);
  if (distanceKm == null) {
    missing.push("Coordinates missing on one side — distance not calculated");
    if (resource.city && need.city && resource.city.toLowerCase() === need.city.toLowerCase()) {
      score += 9;
      reasons.push(`Same city (${resource.city})`);
    }
  } else if (distanceKm <= 25) {
    score += 15;
    reasons.push(`${distanceKm} km apart — local pickup`);
  } else if (distanceKm <= 75) {
    score += 12;
    reasons.push(`${distanceKm} km apart — same-day transport feasible`);
  } else if (distanceKm <= 200) {
    score += 7;
    reasons.push(`${distanceKm} km apart — regional transport required`);
  } else {
    score += 2;
    reasons.push(`${distanceKm} km apart — long-haul transport required`);
  }

  // 4. Expiry vs deadline (15)
  const expH = hoursUntil(resource.expires_at);
  const deadH = hoursUntil(need.deadline);
  if (expH != null && expH <= 0) {
    blockers.push("Resource has already expired");
  } else if (expH != null && deadH != null) {
    if (expH >= 24) {
      score += 15;
      reasons.push(
        `Delivery window works: resource lasts ${Math.round(expH)}h, need closes in ${Math.round(deadH)}h`,
      );
    } else {
      score += 8;
      reasons.push(`Tight window — resource expires in ${Math.round(expH)}h`);
    }
  } else if (expH != null) {
    score += 10;
    reasons.push(`Resource usable for another ${Math.round(expH)}h`);
    if (deadH == null) missing.push("Recipient has not set a deadline");
  } else {
    score += 10;
    reasons.push("Non-perishable / no expiry constraint");
  }

  // 5. Storage / refrigeration (8)
  if (resource.requires_refrigeration) {
    if (need.has_refrigeration) {
      score += 8;
      reasons.push("Recipient has cold storage for a refrigerated resource");
    } else {
      blockers.push("Resource needs refrigeration, recipient reports none");
    }
  } else {
    score += 8;
    reasons.push("No special storage requirement");
  }

  // 6. Verification (8)
  if (ctx.supplierVerified && ctx.recipientVerified) {
    score += 8;
    reasons.push("Both organizations verified");
  } else {
    score += 2;
    missing.push("One or both organizations are not verified yet");
  }

  // 7. Transport availability (4)
  if (ctx.transportAvailable) {
    score += 4;
    reasons.push("Compatible transport available on the network");
  } else {
    missing.push("No matching transport confirmed yet");
  }

  const reliability = ctx.supplierReliability ?? 80;
  score = Math.round(Math.min(100, score * (0.85 + (reliability / 100) * 0.15)));
  if (blockers.length) score = Math.min(score, 35);

  return { score, quantity: transferable, distanceKm, reasons, blockers, missing };
}

/** Impact estimation. Clearly labelled as estimated wherever it is shown. */
export function estimateMeals(quantityKg: number): number {
  return Math.round(quantityKg * 2.5);
}

export function estimateCo2AvoidedKg(quantityKg: number): number {
  return Math.round(quantityKg * 2.5 * 10) / 10;
}

export function estimateTransportEmissionsKg(distanceKm: number, quantityKg: number): number {
  const tonnes = quantityKg / 1000;
  return Math.round(distanceKm * Math.max(tonnes, 0.1) * 0.11 * 10) / 10;
}
