export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
  features?: Array<{ icon: string; text: string }>;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Take Control of\nYour Finances",
    description: "Track expenses, manage multiple accounts, and achieve your financial goals effortlessly",
    icon: "wallet",
    color: "#3B82F6",
    backgroundColor: "#EFF6FF",
    features: [
      { icon: "trending-up", text: "Real-time balance tracking" },
      { icon: "pie-chart", text: "Visual spending insights" },
      { icon: "shield-checkmark", text: "Bank-level encryption" },
    ],
  },
  {
    id: 2,
    title: "Smart Money\nManagement",
    description: "Organize your finances with powerful features designed for simplicity",
    icon: "analytics",
    color: "#10B981",
    backgroundColor: "#ECFDF5",
    features: [
      { icon: "card", text: "Multiple account types" },
      { icon: "pricetags", text: "Custom categories & tags" },
      { icon: "stats-chart", text: "Detailed reports" },
    ],
  },
  {
    id: 3,
    title: "Start Your\nFinancial Journey",
    description: "Join thousands who've taken control of their money. Your data stays private and secure.",
    icon: "rocket",
    color: "#8B5CF6",
    backgroundColor: "#F5F3FF",
    features: [
      { icon: "phone-portrait", text: "Works 100% offline" },
      { icon: "flash", text: "Log expenses in seconds" },
      { icon: "moon", text: "Beautiful dark mode" },
    ],
  },
  {
    id: 4,
    title: "Setup Your Data",
    description: "Choose how you'd like to get started",
    icon: "cloud-upload",
    color: "#F59E0B",
    backgroundColor: "#FFFBEB",
    features: [],
  },
];

