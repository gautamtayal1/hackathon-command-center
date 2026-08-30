import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Gavel, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_JUDGE_PATH, isJudgePath } from "@/lib/judging";
import { HashSessionHandler } from "@/app/login/hash-session-handler";
import { BrandLockup } from "@/components/brand/brand-lockup";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="brand-bg grid min-h-screen place-items-center px-4 text-ink">
      <HashSessionHandler nextPath={nextPath} />
      <section className="w-full max-w-[760px]">
        <div className="mb-8">
          <BrandLockup size="lg" />
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Choose your <span className="text-accent">access</span>
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-ink-3">
            Admins manage the hackathon. Judges only score their assigned
            event.
          </p>
        </div>

        {params.error ? (
          <p className="mb-4 rounded-[20px] border border-bad-line bg-bad-soft px-4 py-3 text-sm font-medium text-bad">
            Login link expired or could not be verified.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <AccessCard
            href={`/admin/login?next=${encodeURIComponent(
              isJudgePath(nextPath) ? "/" : nextPath,
            )}`}
            icon="admin"
            title="Admin"
            body="Email and password for the Draki command center."
          />
          <AccessCard
            href={`/judge/login?next=${encodeURIComponent(
              isJudgePath(nextPath) ? nextPath : DEFAULT_JUDGE_PATH,
            )}`}
            icon="judge"
            title="Judge"
            body="Magic link access for assigned hackathon scoring."
          />
        </div>
      </section>
    </main>
  );
}

function AccessCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: "admin" | "judge";
  title: string;
  body: string;
}) {
  const Icon = icon === "admin" ? Shield : Gavel;

  return (
    <Link
      href={href}
      className="brand-card brand-topline group relative overflow-hidden rounded-[20px] border border-edge bg-p-card p-5 transition hover:border-accent-line hover:bg-surface-3"
    >
      <span className="grid size-11 place-items-center rounded-[18px] bg-accent-soft text-accent">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-5 flex items-center justify-between gap-4">
        <span>
          <span className="block text-2xl font-semibold tracking-[-0.04em] text-white">
            {title}
          </span>
          <span className="mt-2 block text-sm font-medium leading-6 text-ink-3">
            {body}
          </span>
        </span>
        <ArrowRight
          className="size-5 shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

function safeNextPath(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}
