import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { AdminLoginForm } from "@/app/login/login-form";
import { BrandLockup } from "@/components/brand/brand-lockup";

type AdminLoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, "/");
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="brand-bg grid min-h-screen place-items-center px-4 text-ink">
      <section className="w-full max-w-[420px]">
        <Link
          href="/login"
          className="mb-7 inline-flex items-center gap-2 rounded-[20px] px-2 py-2 text-sm font-semibold text-ink-3 transition hover:bg-surface-3 hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Login
        </Link>
        <div className="mb-8">
          <BrandLockup size="lg" />
          <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            Command center
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
            Admin <span className="text-accent">login</span>
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-ink-3">
            Private command center access with your email and password.
          </p>
        </div>

        <AdminLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}

function safeNextPath(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  if (next.startsWith("/judge")) {
    return fallback;
  }

  return next;
}
