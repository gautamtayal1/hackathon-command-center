create type public."JudgingRoundType" as enum ('GROUP', 'FINAL');
create type public."JudgingRoundStatus" as enum ('DRAFT', 'OPEN', 'CLOSED');

create table public."JudgingRound" (
  "id" text primary key,
  "hackathonId" text not null references public."Hackathon"("id") on delete cascade on update cascade,
  "type" public."JudgingRoundType" not null,
  "status" public."JudgingRoundStatus" not null default 'DRAFT',
  "openedAt" timestamptz,
  "closedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null,
  constraint "JudgingRound_hackathonId_type_key" unique ("hackathonId", "type")
);

create index "JudgingRound_hackathonId_status_idx"
  on public."JudgingRound"("hackathonId", "status");

create table public."FinalistSelection" (
  "id" text primary key,
  "hackathonId" text not null references public."Hackathon"("id") on delete cascade on update cascade,
  "finalRoundId" text not null references public."JudgingRound"("id") on delete cascade on update cascade,
  "applicationId" text not null references public."Application"("id") on delete cascade on update cascade,
  "sourceGroupId" text not null references public."JudgeGroup"("id") on delete restrict on update cascade,
  "selectedAt" timestamptz not null default now(),
  constraint "FinalistSelection_applicationId_key" unique ("applicationId"),
  constraint "FinalistSelection_finalRoundId_sourceGroupId_key" unique ("finalRoundId", "sourceGroupId")
);

create index "FinalistSelection_hackathonId_idx"
  on public."FinalistSelection"("hackathonId");
create index "FinalistSelection_sourceGroupId_idx"
  on public."FinalistSelection"("sourceGroupId");

alter table public."Score" add column "roundId" text;

insert into public."JudgingRound" (
  "id",
  "hackathonId",
  "type",
  "status",
  "openedAt",
  "updatedAt"
)
select
  'group_' || md5("id"),
  "id",
  'GROUP'::public."JudgingRoundType",
  'OPEN'::public."JudgingRoundStatus",
  now(),
  now()
from public."Hackathon";

update public."Score" as score
set "roundId" = round."id"
from public."JudgingRound" as round
where round."hackathonId" = score."hackathonId"
  and round."type" = 'GROUP';

alter table public."Score" alter column "roundId" set not null;
alter table public."Score"
  add constraint "Score_roundId_fkey"
  foreign key ("roundId") references public."JudgingRound"("id") on delete cascade on update cascade;

alter table public."Score"
  drop constraint if exists "Score_applicationId_judgeId_key";
drop index if exists public."Score_applicationId_judgeId_key";

create unique index "Score_roundId_applicationId_judgeId_key"
  on public."Score"("roundId", "applicationId", "judgeId");
create index "Score_roundId_idx" on public."Score"("roundId");

alter table public."JudgingRound" enable row level security;
alter table public."FinalistSelection" enable row level security;

drop trigger if exists draki_realtime_change on public."JudgingRound";
create trigger draki_realtime_change
after insert or update or delete on public."JudgingRound"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."FinalistSelection";
create trigger draki_realtime_change
after insert or update or delete on public."FinalistSelection"
for each row execute function private.broadcast_draki_change();
