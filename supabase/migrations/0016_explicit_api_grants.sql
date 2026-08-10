-- Explicit Data API grants.
--
-- New Supabase projects no longer need to expose every new public table by
-- default. RLS remains the row-level authorization layer; these grants define
-- which API roles may reach each table at all.

-- Private, parent-owned data is available only to signed-in users.
revoke all on table
  public.profiles,
  public.children,
  public.sessions,
  public.child_badges,
  public.coach_chats,
  public.lesson_enrollment,
  public.lesson_progress,
  public.sport_recommendations
from anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.children,
  public.sessions,
  public.coach_chats,
  public.lesson_enrollment,
  public.lesson_progress,
  public.sport_recommendations
to authenticated;
grant select, insert, delete on table public.child_badges to authenticated;

-- Security-invoker views inherit the underlying tables' RLS policies.
grant select on table
  public.children_with_stats,
  public.child_progress_summary
to authenticated;

-- Read-only content is intentionally public.
revoke all on table
  public.sports,
  public.badges_metadata,
  public.science_references,
  public.training_programs,
  public.training_exercises,
  public.lesson_instructions
from anon, authenticated;

grant select on table
  public.sports,
  public.badges_metadata,
  public.science_references,
  public.training_programs,
  public.training_exercises,
  public.lesson_instructions
to anon, authenticated;

-- Elevated server keys retain administrative access.
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;
grant all privileges on all sequences in schema public to service_role;
