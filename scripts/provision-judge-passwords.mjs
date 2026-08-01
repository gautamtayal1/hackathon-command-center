import { config } from "dotenv";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.JUDGE_DEFAULT_PASSWORD;

if (!databaseUrl || !supabaseUrl || !secretKey || !password) {
  throw new Error("Database, Supabase, or judge password configuration is missing.");
}

if (password.length < 6) {
  throw new Error("JUDGE_DEFAULT_PASSWORD must contain at least 6 characters.");
}

const database = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});
const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

await database.connect();

try {
  const { rows: judges } = await database.query(`
    SELECT DISTINCT lower(email) AS email
    FROM "Judge"
    WHERE email IS NOT NULL
      AND "inviteStatus" <> 'REVOKED'
    ORDER BY email
  `);
  const { rows: admins } = await database.query(`
    SELECT DISTINCT "userId"
    FROM "WorkspaceMember"
  `);
  const adminIds = new Set(admins.map((admin) => admin.userId));
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw error;

  const usersByEmail = new Map(
    data.users
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  );
  let created = 0;
  let updated = 0;
  let skippedAdmins = 0;

  for (const judge of judges) {
    const existingUser = usersByEmail.get(judge.email);

    if (existingUser && adminIds.has(existingUser.id)) {
      skippedAdmins += 1;
      continue;
    }

    if (existingUser) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true },
      );
      if (updateError) throw updateError;
      updated += 1;
      continue;
    }

    const { error: createError } = await supabase.auth.admin.createUser({
      email: judge.email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;
    created += 1;
  }

  console.log(
    `Judge accounts provisioned: ${created} created, ${updated} updated, ${skippedAdmins} admin accounts unchanged.`,
  );
} finally {
  await database.end();
}
