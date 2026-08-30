import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_JUDGE_PATH, isJudgePath } from "@/lib/judging";
import { JudgeLoginForm } from "@/app/login/login-form";

type JudgeLoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function JudgeLoginPage({
  searchParams,
}: JudgeLoginPageProps) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next, DEFAULT_JUDGE_PATH);
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black px-4 text-[#f4f4f4]">
      <section className="w-full max-w-[420px]">
        <Link
          href="/login"
          className="mb-7 inline-flex items-center gap-2 rounded-[20px] px-2 py-2 text-sm font-semibold text-[#b4b4b4] transition hover:bg-[#1f1f1f] hover:text-white"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Login
        </Link>
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#9b9b9b]">Draki Judges</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
            Judge login
          </h1>
          <p className="mt-3 text-sm font-medium leading-6 text-[#9b9b9b]">
            Enter the email assigned by the organizer. We will send a magic
            link.
          </p>
        </div>

        <JudgeLoginForm nextPath={nextPath} />
      </section>
    </main>
  );
}

function safeNextPath(next: string | undefined, fallback: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  if (!isJudgePath(next)) {
    return fallback;
  }

  return next;
}
