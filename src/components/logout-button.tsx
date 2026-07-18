import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth-actions";

export function LogoutButton({
  label = "Log out",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={
          className ??
          "inline-flex h-11 items-center gap-2 rounded-[20px] border border-[#303030] bg-[#191919] px-4 text-sm font-semibold text-[#d6d6d6] transition hover:border-[#4a4a4a] hover:bg-[#212121]"
        }
      >
        <LogOut className="size-4" aria-hidden="true" />
        {label}
      </button>
    </form>
  );
}
