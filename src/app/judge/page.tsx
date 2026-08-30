import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { requireUser, upsertUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BrandLockup } from "@/components/brand/brand-lockup";

export const dynamic = "force-dynamic";

export default async function JudgeHomePage() {
  const user = await requireUser("/judge");
  await upsertUserProfile(user);

  const assignments = await prisma.judge.findMany({
    where: {
      inviteStatus: { not: "REVOKED" },
      OR: [{ userId: user.id }, { email: user.email }],
    },
    include: { hackathon: true },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <main className="brand-bg min-h-screen px-4 py-10 text-ink sm:px-6">
      <section className="mx-auto w-full max-w-[760px]">
        <div className="mb-8">
          <BrandLockup size="lg" />
          <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
            Judging portal
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
            Your <span className="text-accent">hackathons</span>
          </h1>
        </div>

        {assignments.length ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href="/round1"
                className="brand-card group flex items-center justify-between gap-4 rounded-[20px] border border-edge bg-p-card px-5 py-4 transition hover:border-accent-line hover:bg-surface-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold tracking-[-0.02em] text-white">
                    {assignment.hackathon.name}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-sm font-medium text-ink-3">
                    <CalendarDays className="size-4 text-ink-4" aria-hidden="true" />
                    {formatDate(assignment.hackathon.startsAt)}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-ink-4 transition group-hover:translate-x-0.5 group-hover:text-accent" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-edge bg-p-card p-6">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              No judging assignments
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-ink-3">
              You are signed in as {user.email}, but this email is not assigned
              to a hackathon yet.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}
