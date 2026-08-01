-- Reading an authenticated page upserts UserProfile. Broadcasting that write
-- would make every realtime refresh schedule another refresh indefinitely.
drop trigger if exists draki_realtime_change on public."UserProfile";
