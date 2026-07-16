import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 bg-grid-faint bg-[size:32px_32px]" />
      <div className="absolute inset-0 bg-radial-glow" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo withTagline />
        </div>
        {children}
      </div>
    </div>
  );
}
