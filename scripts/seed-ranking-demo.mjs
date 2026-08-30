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

const demoTeams = [
  ["Orbit AI", "Alice Demo, Bruno Demo", "AI assistant for event operations"],
  ["GreenRoute", "Carla Demo, Diego Demo", "Low-emission urban route planner"],
  ["PocketCare", "Elena Demo, Fabio Demo", "Mobile preventive-care companion"],
  ["SkillSwap", "Giulia Demo, Luca Demo", "Peer-to-peer skill exchange"],
  ["LocalLoop", "Marco Demo, Nina Demo", "Marketplace for neighborhood makers"],
  ["FocusFlow", "Olivia Demo, Paolo Demo", "Distraction-free team workspace"],
  ["SafeNight", "Quinn Demo, Rosa Demo", "Safer routes and live check-ins"],
  ["FoodLens", "Sara Demo, Teo Demo", "Ingredient scanner and meal insights"],
  ["TripMint", "Uma Demo, Vito Demo", "Collaborative travel planner"],
  ["StudySpark", "Wanda Demo, Yuri Demo", "Adaptive study challenges"],
  ["ReWear", "Zoe Demo, Alex Demo", "Circular fashion exchange"],
];

await database.connect();

try {
  await database.query("BEGIN");

  const { rows: hackathons } = await database.query(`
    SELECT id, name
    FROM "Hackathon"
    WHERE "isActive" = true
    ORDER BY "startsAt" DESC NULLS LAST, "createdAt" DESC
    LIMIT 1
  `);
  const hackathon = hackathons[0];

  if (!hackathon) {
    throw new Error("No active hackathon found.");
  }

  const { rows: groups } = await database.query(
    `
      SELECT id, name, "sortOrder"
      FROM "JudgeGroup"
      WHERE "hackathonId" = $1
      ORDER BY "sortOrder", "createdAt"
    `,
    [hackathon.id],
  );

  if (groups.length === 0) {
    throw new Error("Create judge groups before seeding the ranking demo.");
  }

  for (const [groupIndex, group] of groups.entries()) {
    for (let judgeIndex = 0; judgeIndex < 2; judgeIndex += 1) {
      const id = `mock_judge_${hackathon.id}_${groupIndex + 1}_${judgeIndex + 1}`;
      await database.query(
        `
          INSERT INTO "Judge" (
            id, "hackathonId", "groupId", name, email, "sortOrder",
            "inviteStatus", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, NULL, $5, 'CONTACT', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            "groupId" = EXCLUDED."groupId",
            name = EXCLUDED.name,
            "sortOrder" = EXCLUDED."sortOrder",
            "updatedAt" = NOW()
        `,
        [
          id,
          hackathon.id,
          group.id,
          `Demo Judge ${groupIndex * 2 + judgeIndex + 1}`,
          judgeIndex,
        ],
      );
    }
  }

  for (const [index, [teamName, participants, description]] of demoTeams.entries()) {
    const number = index + 1;
    const applicationId = `mock_application_${hackathon.id}_${number}`;
    const group = groups[index % groups.length];

    await database.query(
      `
        INSERT INTO "Application" (
          id, "hackathonId", "teamName", "participantsFullName",
          "githubRepoUrl", "builtDescription", "createdAt", "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 * INTERVAL '1 second'), NOW())
        ON CONFLICT (id) DO UPDATE SET
          "teamName" = EXCLUDED."teamName",
          "participantsFullName" = EXCLUDED."participantsFullName",
          "githubRepoUrl" = EXCLUDED."githubRepoUrl",
          "builtDescription" = EXCLUDED."builtDescription",
          "updatedAt" = NOW()
      `,
      [
        applicationId,
        hackathon.id,
        teamName,
        participants,
        `https://github.com/8x-demo/${teamName.toLowerCase().replaceAll(" ", "-")}`,
        description,
        number,
      ],
    );

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
        `mock_assignment_${hackathon.id}_${number}`,
        hackathon.id,
        applicationId,
        group.id,
        Math.floor(index / groups.length) + 1,
      ],
    );
  }

  const { rows: assignedApplications } = await database.query(
    `
      SELECT a.id, aa."groupId"
      FROM "Application" a
      JOIN "ApplicationAssignment" aa ON aa."applicationId" = a.id
      WHERE a."hackathonId" = $1
      ORDER BY a."createdAt", a.id
    `,
    [hackathon.id],
  );

  for (const [applicationIndex, application] of assignedApplications.entries()) {
    const { rows: judges } = await database.query(
      `
        SELECT id
        FROM "Judge"
        WHERE "groupId" = $1 AND id LIKE 'mock_judge_%'
        ORDER BY "sortOrder", id
      `,
      [application.groupId],
    );

    for (const [judgeIndex, judge] of judges.entries()) {
      const pitch = 6 + ((applicationIndex + judgeIndex + 1) % 5);
      const potential = 6 + ((applicationIndex * 2 + judgeIndex + 2) % 5);
      const uiUx = 6 + ((applicationIndex * 3 + judgeIndex + 3) % 5);
      const execution = 6 + ((applicationIndex * 4 + judgeIndex + 4) % 5);
      const average = Math.round((pitch + potential + uiUx + execution) / 4);
      const scoreId = `mock_score_${application.id}_${judge.id}`;

      await database.query(
        `
          INSERT INTO "Score" (
            id, "hackathonId", "applicationId", "judgeId", score,
            "pitchScore", "potentialScore", "uiUxScore", "executionScore",
            note, "createdAt", "updatedAt"
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Demo score', NOW(), NOW())
          ON CONFLICT ("applicationId", "judgeId") DO UPDATE SET
            score = EXCLUDED.score,
            "pitchScore" = EXCLUDED."pitchScore",
            "potentialScore" = EXCLUDED."potentialScore",
            "uiUxScore" = EXCLUDED."uiUxScore",
            "executionScore" = EXCLUDED."executionScore",
            note = EXCLUDED.note,
            "updatedAt" = NOW()
        `,
        [
          scoreId,
          hackathon.id,
          application.id,
          judge.id,
          average,
          pitch,
          potential,
          uiUx,
          execution,
        ],
      );
    }
  }

  await database.query("COMMIT");

  const { rows: summary } = await database.query(
    `
      SELECT g.name, count(DISTINCT aa."applicationId")::int AS applications,
             count(DISTINCT j.id)::int AS judges,
             count(DISTINCT s.id)::int AS scores
      FROM "JudgeGroup" g
      LEFT JOIN "ApplicationAssignment" aa ON aa."groupId" = g.id
      LEFT JOIN "Judge" j ON j."groupId" = g.id
      LEFT JOIN "Score" s ON s."judgeId" = j.id
      WHERE g."hackathonId" = $1
      GROUP BY g.id
      ORDER BY g."sortOrder"
    `,
    [hackathon.id],
  );

  console.log({ hackathon: hackathon.name, groups: summary });
} catch (error) {
  await database.query("ROLLBACK");
  throw error;
} finally {
  await database.end();
}
