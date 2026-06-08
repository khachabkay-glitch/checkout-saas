"use client";

import { useEffect, useState } from "react";

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export default function SetupPage() {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: "shopify",
      title: "Connect Shopify",
      description: "Link your Shopify store to import products and manage orders.",
      completed: false,
    },
    {
      id: "whop",
      title: "Connect Whop",
      description: "Set up Whop integration for payment processing.",
      completed: false,
    },
    {
      id: "test",
      title: "Test Checkout",
      description: "Place a test order to verify everything works end-to-end.",
      completed: false,
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading setup...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Setup your checkout</h1>
      <p className="text-gray-600 mb-8">Complete these steps to get your checkout page live.</p>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-start gap-4 p-4 border rounded-lg bg-white shadow-sm"
          >
            <div className="flex-shrink-0 mt-0.5">
              {step.completed ? (
                <CheckIcon />
              ) : (
                <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-300 text-xs text-gray-400">
                  {index + 1}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
