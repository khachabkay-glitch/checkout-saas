import { NextRequest, NextResponse } from "next/server";
import { submitWhopPayment } from "@/lib/whop-multi";

export async function POST(req: NextRequest) {
  try {
    const { whopApiLocation, email, cardToken, billingCountry, billingZip } =
      await req.json();

    if (!whopApiLocation || !email || !cardToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await submitWhopPayment(
      whopApiLocation,
      email,
      cardToken,
      billingCountry && billingZip
        ? { country: billingCountry, zip: billingZip }
        : undefined
    );

    return NextResponse.json({
      success: true,
      status: result.status,
      data: result,
    });
  } catch (err: any) {
    console.error("Payment submit error:", err);
    return NextResponse.json(
      { error: err.message || "Payment failed" },
      { status: 400 }
    );
  }
}
