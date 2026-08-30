import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/app/apply/[hackathonId]/application-form";
import { Wordmark } from "@/components/brand/wordmark";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ApplyPageProps = {
  params: Promise<{ hackathonId: string }>;
};

export async function generateMetadata({
  params,
}: ApplyPageProps): Promise<Metadata> {
  const { hackathonId } = await params;
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { name: true },
  });

  return {
    title: hackathon ? `Apply to ${hackathon.name}` : "Apply",
  };
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  const { hackathonId } = await params;
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { id: true, name: true },
  });

  if (!hackathon) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-black px-5 py-14 text-[#f4f4f4] selection:bg-[#4a4a4a] selection:text-white sm:px-8 sm:py-20">
      <section className="mx-auto w-full max-w-[760px]">
        <Wordmark size="md" />
        <h1 className="mb-14 mt-6 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
          {hackathon.name}
        </h1>

        <ApplicationForm hackathonId={hackathon.id} />

        <p className="mt-16 border-t border-[#242424] pt-6 text-sm font-medium text-[#6f6f6f]">
          Applications powered by 8x.
        </p>
      </section>
    </main>
  );
}
