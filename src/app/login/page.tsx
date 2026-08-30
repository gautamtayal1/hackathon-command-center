import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Gavel, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_JUDGE_PATH, isJudgePath } from "@/lib/judging";
import { HashSessionHandler } from "@/app/login/hash-session-handler";

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
      <HashSessionHandler nextPath={nextPath} />
      <section className="w-full max-w-[760px]">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#9b9b9b]">Draki</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
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
