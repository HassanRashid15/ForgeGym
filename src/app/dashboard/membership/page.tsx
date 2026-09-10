"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Calendar, Crown, Star, Zap } from "lucide-react";

const membershipPlans = [
  {
    id: 1,
    name: "Basic",
    price: 29,
    period: "month",
    description: "Perfect for beginners",
    features: [
      "Access to gym equipment",
      "Locker room access",
      "Basic fitness classes",
      "Mobile app access",
      "Parking included"
    ],
    icon: Star,
    color: "from-blue-500 to-blue-600",
    popular: false
  },
  {
    id: 2,
    name: "Premium",
    price: 59,
    period: "month",
    description: "Most popular choice",
    features: [
      "All Basic features",
      "Unlimited fitness classes",
      "Personal trainer sessions (2/month)",
      "Nutrition guidance",
      "Priority booking",
      "Guest passes (2/month)"
    ],
    icon: Crown,
    color: "from-purple-500 to-purple-600",
    popular: true
  },
  {
    id: 3,
    name: "Elite",
    price: 99,
    period: "month",
    description: "For serious athletes",
    features: [
      "All Premium features",
      "Unlimited personal training",
      "Private locker",
      "Massage therapy (1/month)",
      "Nutrition planning",
      "Unlimited guest passes",
      "Exclusive equipment access"
    ],
    icon: Zap,
    color: "from-orange-500 to-orange-600",
    popular: false
  }
];

export default function MembershipPage() {
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const userCurrentPlan = "Premium"; // This would come from user data
  const planEndDate = "2024-12-31"; // This would come from user data

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Membership</h1>
        <p className="text-muted-foreground mt-2">
          Manage your gym membership
        </p>
      </div>

      {/* Current Membership Status */}
      <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Membership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold">{userCurrentPlan} Plan</h3>
                <Badge className="bg-green-500">Active</Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Renews on {planEndDate}
              </p>
            </div>
            <Button variant="outline">Manage Subscription</Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing Period Toggle */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant={billingPeriod === "monthly" ? "default" : "outline"}
          onClick={() => setBillingPeriod("monthly")}
        >
          Monthly
        </Button>
        <Button
          variant={billingPeriod === "yearly" ? "default" : "outline"}
          onClick={() => setBillingPeriod("yearly")}
        >
          Yearly <span className="ml-2 text-xs bg-primary-foreground/20 px-2 py-1 rounded">Save 20%</span>
        </Button>
      </div>

      {/* Membership Plans */}
      <div className="grid gap-6 md:grid-cols-3">
        {membershipPlans.map((plan) => {
          const price = billingPeriod === "yearly" 
            ? Math.round(plan.price * 12 * 0.8) 
            : plan.price;
          const period = billingPeriod === "yearly" ? "year" : "month";

          return (
            <Card 
              key={plan.id} 
              className={`relative overflow-hidden ${plan.popular ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              <CardHeader>
                <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4`}>
                  <plan.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${price}</span>
                  <span className="text-muted-foreground">/{period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {selectedPlan === plan.id ? "Selected" : "Choose Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Billing History */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: "2024-11-01", amount: "$59.00", status: "Paid", plan: "Premium" },
              { date: "2024-10-01", amount: "$59.00", status: "Paid", plan: "Premium" },
              { date: "2024-09-01", amount: "$59.00", status: "Paid", plan: "Premium" },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{item.plan} Membership</p>
                  <p className="text-sm text-muted-foreground">{item.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{item.amount}</p>
                  <Badge variant="outline" className="text-green-500 border-green-500">
                    {item.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}