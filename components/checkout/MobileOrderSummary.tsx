"use client";

import OrderSummary from "./OrderSummary";

type Props = React.ComponentProps<typeof OrderSummary>;

export default function MobileOrderSummary(props: Props) {
  return <OrderSummary {...props} mobileOnly />;
}
