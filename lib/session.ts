import { nanoid } from "nanoid";

export interface LineItem {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  quantity: number;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  sku: string;
  weight: number;
  weightUnit: string;
  lineId: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface ShippingMethod {
  handle: string;
  title: string;
  price: string;
}

export interface CheckoutSession {
  id: string;
  merchantId: string;
  storeId: string;
  country: string;
  email?: string;
  phone?: string;
  lineItems: LineItem[];
  subtotal: number;
  total: number;
  currency: string;
  discounts: unknown[];
  shippingAddress?: ShippingAddress;
  shippingMethod?: ShippingMethod;
  shippingCost: number;
  paymentIntentId?: string;
  paymentStatus: "pending" | "processing" | "paid" | "failed";
  orderId?: string;
  orderName?: string;
  createdAt: number;
}

// Use globalThis to persist across warm serverless invocations
const globalSessions = (globalThis as Record<string, unknown>)
  .__sessions as Map<string, string> | undefined;
const sessions: Map<string, string> = globalSessions || new Map();
(globalThis as Record<string, unknown>).__sessions = sessions;

function serialize(session: CheckoutSession): string {
  return JSON.stringify(session);
}

function deserialize(data: string): CheckoutSession {
  return JSON.parse(data);
}

export function createSession(params: {
  merchantId: string;
  storeId: string;
  country: string;
  lineItems: LineItem[];
  subtotal: number;
  total: number;
  currency: string;
  discounts: unknown[];
}): CheckoutSession {
  const id = nanoid(21);
  const session: CheckoutSession = {
    id,
    merchantId: params.merchantId,
    storeId: params.storeId,
    country: params.country,
    lineItems: params.lineItems,
    subtotal: params.subtotal,
    total: params.total,
    currency: params.currency,
    discounts: params.discounts,
    shippingCost: 0,
    paymentStatus: "pending",
    createdAt: Date.now(),
  };
  sessions.set(id, serialize(session));
  return session;
}

export function getSession(id: string): CheckoutSession | undefined {
  const data = sessions.get(id);
  if (!data) return undefined;
  return deserialize(data);
}

export function updateSession(
  id: string,
  updates: Partial<CheckoutSession>
): CheckoutSession | undefined {
  const session = getSession(id);
  if (!session) return undefined;
  const updated = { ...session, ...updates };
  sessions.set(id, serialize(updated));
  return updated;
}

// Encode session to a URL-safe token (for passing through redirects)
export function encodeSessionToken(session: CheckoutSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

// Decode session from token
export function decodeSessionToken(token: string): CheckoutSession | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    return null;
  }
}

// Store a session from a token (re-hydrate after cold start)
export function restoreSession(token: string): CheckoutSession | null {
  const session = decodeSessionToken(token);
  if (!session) return null;
  sessions.set(session.id, serialize(session));
  return session;
}
