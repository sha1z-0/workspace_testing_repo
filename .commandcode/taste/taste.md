# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/  
    
  
# supabase  
- Export Supabase SQL Editor query results as Markdown for direct readability in analysis. Confidence: 0.70 
- Verify actual database schema constraints before implementing role-based access logic. Confidence: 0.65
- Never execute SQL directly against Supabase — all schema/data changes are delivered as .sql files in migration/ for the founder to apply manually. Confidence: 0.85
- Supabase PostgREST error objects have non-enumerable properties (code, message, details, hint) — use JSON.stringify(error, Object.getOwnPropertyNames(error)) in catch blocks to capture them for debugging. Confidence: 0.65

# api-design
- Don't return success/200 when there are failures — report failures honestly in the response so the client knows the real outcome. Confidence: 0.70

# workflow
- For every change: add a Planned entry to supabase/CHANGES.md before starting, then update it to Completed with actual changes and files touched after implementation. Confidence: 0.85
- Write out a full context/state summary and intended fix plan before making any code changes — never code before planning. Confidence: 0.75

# supabase
- When writing SQL migrations that change CHECK constraint values, the correct order is: DROP the old constraint → UPDATE existing rows to valid new values → ADD the new constraint. Updating rows before dropping the old constraint can fail because the new value may not be valid under the old constraint either. Confidence: 0.80
- CREATE TABLE IF NOT EXISTS silently skips tables that already exist even if the schema is incompatible — when a table may pre-exist with an old schema, use DROP/ALTER/CREATE explicitly instead of relying on IF NOT EXISTS to handle schema changes. Confidence: 0.70

# workflow
- When database state is uncertain (columns might not exist, RLS policies might be missing), ask the user to run verification SQL queries before writing any fixes — don't assume or guess the live DB state. Confidence: 0.65
- At the end of each bug-fix round, provide an explicit regression verification checklist listing each lifecycle flow with pass/fail notes. Confidence: 0.70

# architecture
- Avoid parallel implementations of the same functionality — when the same feature (file upload, retrieval, download) exists in multiple places, consolidate into a single shared utility so fixes apply everywhere and bugs don't recur from duplicated code drifting out of sync. Confidence: 0.65
