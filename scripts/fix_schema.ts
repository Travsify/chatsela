import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

async function fixSchema() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🚀 Running schema fix...');

  const sql = `
    -- Ensure columns exist
    DO $$ 
    BEGIN 
      BEGIN
        ALTER TABLE public.bots ADD COLUMN welcome_message TEXT;
      EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'column welcome_message already exists';
      END;

      BEGIN
        ALTER TABLE public.bots ADD COLUMN menu_options JSONB;
      EXCEPTION WHEN duplicate_column THEN 
        RAISE NOTICE 'column menu_options already exists';
      END;
    END $$;

    -- Refresh PostgREST cache
    NOTIFY pgrst, 'reload schema';
  `;

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
       console.log('⚠️ RPC exec_sql not found. This is expected on some Supabase projects.');
       console.log('Falling back to manual check...');
    } else {
       console.error('❌ Error executing SQL:', error);
       return;
    }
  }

  console.log('✅ Schema check & cache refresh complete!');
}

fixSchema();
