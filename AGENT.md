# Agent Instructions — Changelog Workflow

This project requires strict change tracking because all Supabase/backend changes
are applied manually by the founder. Follow this loop for every prompt, without exception:

1. **Before writing any code**, open `supabase/CHANGES.md` and add a new entry at the top
   with Status: Planned, describing what you are about to do (Planned Changes section).

2. **Implement the requested change.**
   - If it requires a database/schema/RLS change, do NOT run it yourself.
     Write the SQL into a new file in `migration/` (timestamp + description),
     and reference that filename in the CHANGES.md entry.

3. **After implementation is complete**, go back to the same CHANGES.md entry and:
   - Update Status to Completed
   - Fill in "Actual Changes Made" (including any deviations from the plan)
   - Fill in "Files Touched"
   - Fill in "Migration File" if applicable
   - Add any "Notes / Follow-ups" the founder needs to act on manually

4. Never skip step 1 or step 3, even for small changes. Never batch multiple
   unrelated prompts into a single CHANGES.md entry — one entry per prompt/task.

5. Never execute SQL directly against Supabase. All schema/data changes are
   delivered as `.sql` files in `migration/` only.
