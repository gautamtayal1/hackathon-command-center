import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Database configuration is missing.");
}

const database = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await database.connect();

try {
  await database.query("BEGIN");

  const { rows: activeHackathons } = await database.query(`
    SELECT id, name
    FROM "Hackathon"
    WHERE "isActive" = true
    ORDER BY "startsAt" DESC NULLS LAST, "createdAt" DESC
    LIMIT 1
  `);
  const activeHackathon = activeHackathons[0];

  if (!activeHackathon) {
    throw new Error("No active hackathon found.");
  }

  const { rows: sourceJudges } = await database.query(
    `
      SELECT
        j.id,
        j."hackathonId",
        j.name,
        j.email,
        j."userId",
        j."inviteStatus",
        j."invitedAt",
        j."acceptedAt"
      FROM "Judge" j
      JOIN "Hackathon" h ON h.id = j."hackathonId"
      LEFT JOIN "JudgeGroup" g ON g.id = j."groupId"
      WHERE h.name ILIKE '%Bella&Bona%'
        AND j.email IS NOT NULL
        AND j."inviteStatus" <> 'REVOKED'
        AND j.id NOT LIKE 'active_judge_%'
      ORDER BY g."sortOrder" NULLS LAST, j."sortOrder", j."createdAt"
      LIMIT 7
    `,
  );

  if (sourceJudges.length !== 7) {
    throw new Error(`Expected 7 source judges, found ${sourceJudges.length}.`);
  }

  const { rows: currentGroups } = await database.query(
    `
      SELECT id, "sortOrder"
      FROM "JudgeGroup"
      WHERE "hackathonId" = $1
      ORDER BY "sortOrder", "createdAt"
    `,
    [activeHackathon.id],
  );
  const groups = [];

  for (let index = 0; index < 7; index += 1) {
    const number = index + 1;
    const existing = currentGroups[index];
    const id = existing?.id ?? `active_group_${activeHackathon.id}_${number}`;

    if (existing) {
      await database.query(
        `
          UPDATE "JudgeGroup"
          SET name = $1, "sortOrder" = $2, "updatedAt" = NOW()
          WHERE id = $3
        `,
        [`Group ${number}`, index, id],
      );
    } else {
      await database.query(
        `
          INSERT INTO "JudgeGroup" (
            id, "hackathonId", name, "sortOrder", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `,
        [id, activeHackathon.id, `Group ${number}`, index],
      );
    }

    groups.push({ id, name: `Group ${number}` });
  }

  await database.query(
    `DELETE FROM "Judge" WHERE "hackathonId" = $1 AND id LIKE 'mock_judge_%'`,
    [activeHackathon.id],
  );
  await database.query(
    `DELETE FROM "Judge" WHERE "hackathonId" = $1 AND id LIKE 'active_judge_%'`,
    [activeHackathon.id],
  );

  const judgeIds = [];

  for (const [index, sourceJudge] of sourceJudges.entries()) {
    const id = `active_judge_${activeHackathon.id}_${index + 1}`;
    const group = groups[index];

    if (sourceJudge.hackathonId === activeHackathon.id) {
      await database.query(
        `
          UPDATE "Judge"
          SET "groupId" = $1, "sortOrder" = 0, "updatedAt" = NOW()
          WHERE id = $2
        `,
        [group.id, sourceJudge.id],
      );
      judgeIds.push(sourceJudge.id);
      continue;
    }

    await database.query(
      `
        INSERT INTO "Judge" (
          id, "hackathonId", "groupId", "userId", name, email, "sortOrder",
          "inviteStatus", "invitedAt", "acceptedAt", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          "groupId" = EXCLUDED."groupId",
          "userId" = EXCLUDED."userId",
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          "sortOrder" = 0,
          "inviteStatus" = EXCLUDED."inviteStatus",
          "invitedAt" = EXCLUDED."invitedAt",
          "acceptedAt" = EXCLUDED."acceptedAt",
          "updatedAt" = NOW()
      `,
      [
        id,
        activeHackathon.id,
        group.id,
        sourceJudge.userId,
        sourceJudge.name,
        sourceJudge.email,
        sourceJudge.inviteStatus,
        sourceJudge.invitedAt,
        sourceJudge.acceptedAt,
      ],
    );
    judgeIds.push(id);
  }

  const { rows: judgingRounds } = await database.query(
    `
      INSERT INTO "JudgingRound" (
        id, "hackathonId", type, status, "openedAt", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, 'GROUP', 'OPEN', NOW(), NOW(), NOW())
      ON CONFLICT ("hackathonId", type) DO UPDATE SET
        "updatedAt" = NOW()
      RETURNING id
    `,
    [`group_round_${activeHackathon.id}`, activeHackathon.id],
  );
  const groupRoundId = judgingRounds[0].id;

  const { rows: applications } = await database.query(
    `
      SELECT id
      FROM "Application"
      WHERE "hackathonId" = $1
      ORDER BY "createdAt", id
    `,
    [activeHackathon.id],
  );
  const groupLoads = Array(7).fill(0);

  for (const [index, application] of applications.entries()) {
    const groupIndex = index % groups.length;
    const group = groups[groupIndex];
    const sortOrder = groupLoads[groupIndex];
    groupLoads[groupIndex] += 1;

    await database.query(
      `
        INSERT INTO "ApplicationAssignment" (
          id, "hackathonId", "applicationId", "groupId", "sortOrder",
          "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT ("applicationId") DO UPDATE SET
          "groupId" = EXCLUDED."groupId",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW()
      `,
      [
        `seven_judges_assignment_${activeHackathon.id}_${application.id}`,
        activeHackathon.id,
        application.id,
        group.id,
        sortOrder,
      ],
    );

    const judgeId = judgeIds[groupIndex];
    const pitch = 6 + ((index + 1) % 5);
    const potential = 6 + ((index * 2 + 2) % 5);
    const uiUx = 6 + ((index * 3 + 3) % 5);
    const execution = 6 + ((index * 4 + 4) % 5);
    const average = Math.round((pitch + potential + uiUx + execution) / 4);

    await database.query(
      `
        INSERT INTO "Score" (
          id, "hackathonId", "applicationId", "judgeId", "roundId", score,
          "pitchScore", "potentialScore", "uiUxScore", "executionScore",
          note, "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Demo score', NOW(), NOW())
        ON CONFLICT ("roundId", "applicationId", "judgeId") DO UPDATE SET
          score = EXCLUDED.score,
          "pitchScore" = EXCLUDED."pitchScore",
          "potentialScore" = EXCLUDED."potentialScore",
          "uiUxScore" = EXCLUDED."uiUxScore",
          "executionScore" = EXCLUDED."executionScore",
          note = EXCLUDED.note,
          "updatedAt" = NOW()
      `,
      [
        `seven_judges_score_${activeHackathon.id}_${application.id}`,
        activeHackathon.id,
        application.id,
        judgeId,
        groupRoundId,
        average,
        pitch,
        potential,
        uiUx,
        execution,
      ],
    );
  }

  await database.query("COMMIT");

  const { rows: summary } = await database.query(
    `
      SELECT
        g.name,
        string_agg(DISTINCT j.name, ', ') AS judge,
        count(DISTINCT aa."applicationId")::int AS applications
      FROM "JudgeGroup" g
      LEFT JOIN "Judge" j ON j."groupId" = g.id
      LEFT JOIN "ApplicationAssignment" aa ON aa."groupId" = g.id
      WHERE g."hackathonId" = $1
      GROUP BY g.id
      ORDER BY g."sortOrder"
    `,
    [activeHackathon.id],
  );

  console.log({ hackathon: activeHackathon.name, groups: summary });
} catch (error) {
  await database.query("ROLLBACK");
  throw error;
} finally {
  await database.end();
}
