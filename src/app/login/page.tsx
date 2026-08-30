import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Gavel, Shield, Wrench } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isDevBypassEnabled } from "@/lib/dev-mode";
import { devBypassLogin } from "@/app/login/dev-bypass-action";
import { Wordmark } from "@/components/brand/wordmark";

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
    <main className="grid min-h-screen place-items-center bg-black px-4 text-[#f4f4f4]">
      <section className="w-full max-w-[760px]">
        <div className="mb-8">
          <Wordmark size="md" />
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-white">
            Choose your access
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-[#9b9b9b]">
            Admins manage the hackathon. Judges only score their assigned
            event.
          </p>
        </div>

        {params.error ? (
          <p className="mb-4 rounded-[20px] border border-[#6d2142] bg-[#2a111c] px-4 py-3 text-sm font-medium text-[#ffd1df]">
            Login link expired or could not be verified.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <AccessCard
            href={`/admin/login?next=${encodeURIComponent(
              nextPath === "/judge" || nextPath.startsWith("/judge/")
                ? "/"
                : nextPath,
            )}`}
            icon="admin"
            title="Admin"
            body="Email and password for the 8x command center."
          />
          <AccessCard
            href={`/judge/login?next=${encodeURIComponent(
              nextPath.startsWith("/judge") ? nextPath : "/judge",
            )}`}
            icon="judge"
            title="Judge"
            body="Magic link access for assigned hackathon scoring."
          />
        </div>

        {isDevBypassEnabled() ? (
          <form action={devBypassLogin} className="mt-4">
            <input type="hidden" name="next" value={nextPath} />
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-[20px] border border-dashed border-[#4a4a4a] bg-[#191919] px-4 text-sm font-semibold text-[#f4b23c] transition hover:border-[#6a6a6a] hover:bg-[#212121]"
            >
              <Wrench className="size-4" aria-hidden="true" />
              Bypass auth (dev only)
            </button>
          </form>
        ) : null}
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
      className="group rounded-[20px] border border-[#303030] bg-[#212121] p-5 transition hover:border-[#4a4a4a] hover:bg-[#252525]"
    >
      <span className="grid size-11 place-items-center rounded-[18px] bg-black text-white">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-5 flex items-center justify-between gap-4">
        <span>
          <span className="block text-2xl font-semibold tracking-[-0.04em] text-white">
            {title}
          </span>
          <span className="mt-2 block text-sm font-medium leading-6 text-[#b4b4b4]">
            {body}
          </span>
        </span>
        <ArrowRight
          className="size-5 shrink-0 text-[#9b9b9b] transition group-hover:text-white"
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
