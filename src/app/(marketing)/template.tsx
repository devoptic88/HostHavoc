import { PageTransition } from "@/components/motion/PageTransition";

export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
