import { LoginCard } from "@nicecxone/lyra-ui";

type Page = "agent-workspace" | "agent" | "outbound" | "login";

interface LoginPageProps {
  onNavigate?: (page: Page) => void;
}

export function LoginPage({ onNavigate }: LoginPageProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-lyra-bg-surface-shell p-6 animate-in fade-in-0 duration-500">
      <LoginCard onLaunch={() => onNavigate?.("agent")} />
    </div>
  );
}
