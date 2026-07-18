import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { requireUser, upsertUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    <main className="min-h-screen bg-black px-4 py-10 text-[#f4f4f4] sm:px-6">
      <section className="mx-auto w-full max-w-[760px]">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[#9b9b9b]">Draki Judges</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-white">
            Your hackathons
          </h1>
        </div>

        {assignments.length ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <Link
                key={assignment.id}
                href={`/judge/${assignment.hackathonId}`}
                className="flex items-center justify-between gap-4 rounded-[20px] border border-[#303030] bg-[#212121] px-5 py-4 transition hover:border-[#4a4a4a] hover:bg-[#252525]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold tracking-[-0.02em] text-white">
                    {assignment.hackathon.name}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-sm font-medium text-[#9b9b9b]">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {formatDate(assignment.hackathon.startsAt)}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-[#b4b4b4]" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-[#303030] bg-[#212121] p-6">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              No judging assignments
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-[#b4b4b4]">
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
