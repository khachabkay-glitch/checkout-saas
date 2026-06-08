import { NextRequest, NextResponse } from "next/server";
import { getSession, encodeSessionToken } from "@/lib/session";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing sessionId" },
      { status: 400 }
    );
  }

  const session = getSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.id,
    paymentStatus: session.paymentStatus,
    orderId: session.orderId,
    orderName: session.orderName,
    sessionToken: encodeSessionToken(session),
  });
}
