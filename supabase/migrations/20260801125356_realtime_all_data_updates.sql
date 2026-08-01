create schema if not exists private;

create or replace function private.broadcast_draki_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_data jsonb;
  hackathon_id text;
begin
  if tg_op = 'DELETE' then
    record_data := to_jsonb(old);
  else
    record_data := to_jsonb(new);
  end if;

  if tg_table_name = 'Hackathon' then
    hackathon_id := record_data ->> 'id';
  else
    hackathon_id := record_data ->> 'hackathonId';
  end if;

  perform realtime.send(
    jsonb_build_object(
      'table', tg_table_name,
      'operation', tg_op,
      'hackathonId', hackathon_id
    ),
    'invalidate',
    'draki:updates',
    false
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.broadcast_draki_change() from public;

drop trigger if exists draki_realtime_change on public."UserProfile";
create trigger draki_realtime_change
after insert or update or delete on public."UserProfile"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."Workspace";
create trigger draki_realtime_change
after insert or update or delete on public."Workspace"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."WorkspaceMember";
create trigger draki_realtime_change
after insert or update or delete on public."WorkspaceMember"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."Hackathon";
create trigger draki_realtime_change
after insert or update or delete on public."Hackathon"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."Task";
create trigger draki_realtime_change
after insert or update or delete on public."Task"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."BudgetEntry";
create trigger draki_realtime_change
after insert or update or delete on public."BudgetEntry"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."Judge";
create trigger draki_realtime_change
after insert or update or delete on public."Judge"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."JudgeGroup";
create trigger draki_realtime_change
after insert or update or delete on public."JudgeGroup"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."Application";
create trigger draki_realtime_change
after insert or update or delete on public."Application"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."ApplicationAssignment";
create trigger draki_realtime_change
after insert or update or delete on public."ApplicationAssignment"
for each row execute function private.broadcast_draki_change();

drop trigger if exists draki_realtime_change on public."Score";
create trigger draki_realtime_change
after insert or update or delete on public."Score"
for each row execute function private.broadcast_draki_change();
