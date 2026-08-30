export type RankedFinalistCandidate = {
  applicationId: string;
  teamName: string;
  total: number;
  scoreCount?: number;
};

export function selectProvisionalGroupWinner(
  groupName: string,
  candidates: RankedFinalistCandidate[],
) {
  if (!candidates.length) {
    throw new Error(`${groupName} has no applications.`);
  }

  return candidates.toSorted((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }

    return (b.scoreCount ?? 0) - (a.scoreCount ?? 0);
  })[0];
}

export function selectSingleGroupWinner(
  groupName: string,
  candidates: RankedFinalistCandidate[],
) {
  if (!candidates.length) {
    throw new Error(`${groupName} has no applications.`);
  }

  const ranked = candidates.toSorted((a, b) => b.total - a.total);
  const leaders = ranked.filter((candidate) => candidate.total === ranked[0].total);

  if (leaders.length > 1) {
    throw new Error(
      `${groupName} has a tie between ${leaders.map((leader) => leader.teamName).join(" and ")}. Resolve it before starting finals.`,
    );
  }

  return ranked[0];
}
