import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/app/apply/[hackathonId]/application-form";
import { EightXLogo } from "@/components/brand/eight-x-logo";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ApplyPageProps = {
  params: Promise<{ hackathonId: string }>;
};

async function findHackathon(hackathonId: string) {
  return prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { id: true, name: true, startsAt: true },
  });
}

export async function generateMetadata({
  params,
}: ApplyPageProps): Promise<Metadata> {
  const { hackathonId } = await params;
  const hackathon = await findHackathon(hackathonId);

  return {
    title: hackathon ? `Apply — ${hackathon.name}` : "Apply",
    description: hackathon
      ? `Submit your team's project to ${hackathon.name}, hosted by 8x.`
      : "Hackathon submissions, hosted by 8x.",
    icons: { icon: "/brand/8x-icon.svg" },
  };
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { hackathonId } = await params;
  const hackathon = await findHackathon(hackathonId);

  if (!hackathon) {
    notFound();
  }

  const startsAt = hackathon.startsAt
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(hackathon.startsAt)
    : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-[#f4f4f4] selection:bg-[#1d4dff] selection:text-white">
      <BrandGlow />

      <header className="relative z-10 border-b border-[#1c1c1c]/80">
        <div className="mx-auto flex w-full max-w-[820px] items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <a
            href="https://8x.social"
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2.5 rounded-full transition"
          >
            <EightXLogo className="h-5 w-auto text-white transition group-hover:text-[#4f76ff]" />
            <span className="h-4 w-px bg-[#2c2c2c]" aria-hidden="true" />
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-[#8f8f8f] transition group-hover:text-[#d6d6d6]">
              Hackathons
            </span>
          </a>

          <span className="inline-flex items-center gap-2 rounded-full border border-[#26262a] bg-[#111114] px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-[#9b9b9b] uppercase">
            <span
              className="size-1.5 rounded-full bg-[#1d4dff] shadow-[0_0_10px_rgba(29,77,255,0.9)]"
              aria-hidden="true"
            />
            Submissions open
          </span>
        </div>
      </header>

      <main className="relative z-10 px-5 pb-20 pt-12 sm:px-8 sm:pt-16">
        <section className="mx-auto w-full max-w-[820px]">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#6d78a6] uppercase">
            Project submission
          </p>
          <h1 className="mt-3 text-4xl leading-[1.05] font-semibold tracking-[-0.045em] text-white sm:text-[56px]">
            {hackathon.name}
          </h1>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed font-medium text-[#9b9b9b]">
            Tell us who you are and what you shipped. One submission per team —
            you can pitch the details live to your judges in round 1.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {startsAt ? <MetaChip>{startsAt}</MetaChip> : null}
            <MetaChip>Takes about 2 minutes</MetaChip>
            <MetaChip>Public GitHub repo required</MetaChip>
          </div>

          <div className="mt-10">
            <ApplicationForm hackathonId={hackathon.id} />
          </div>

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-[#1c1c1c] pt-6 text-[13px] font-medium text-[#6f6f6f]">
            <span className="flex items-center gap-2">
              Hosted by
              <a
                href="https://8x.social"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#d6d6d6] transition hover:text-white"
              >
                <EightXLogo className="h-3 w-auto" />
              </a>
            </span>
            <span>Questions? Ask an organizer on site.</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#232326] bg-[#0e0e11] px-3 py-1.5 text-[12px] font-medium text-[#9b9b9b]">
      {children}
    </span>
  );
}

function BrandGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(29,77,255,0.22),transparent)] blur-[10px]" />
      <div className="absolute top-[38%] -right-32 h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(0,33,204,0.16),transparent)]" />
    </div>
  );
}
