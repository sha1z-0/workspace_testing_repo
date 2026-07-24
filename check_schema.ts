import { SupabaseClient } from '@supabase/supabase-js';
type ExtractSchema<T> = T extends SupabaseClient<any, any, infer S> ? S : never;
type MySchema = ExtractSchema<SupabaseClient<any>>;
