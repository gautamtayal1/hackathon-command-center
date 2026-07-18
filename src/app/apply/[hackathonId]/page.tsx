import { notFound } from "next/navigation";
import { ApplicationForm } from "@/app/apply/[hackathonId]/application-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ApplyPageProps = {
  params: Promise<{ hackathonId: string }>;
};

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
        <h1 className="mb-14 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
          {hackathon.name}
        </h1>

        <ApplicationForm hackathonId={hackathon.id} />
      </section>
    </main>
  );
}
