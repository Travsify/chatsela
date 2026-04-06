import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

async function fixSchema() {
  const sqlFile = process.argv[2];
  let sql = '';

  if (sqlFile && fs.existsSync(sqlFile)) {
    console.log(`📖 Loading SQL from ${sqlFile}...`);
    sql = fs.readFileSync(sqlFile, 'utf8');
  } else {
    console.log('📝 Using default hardcoded SQL...');
    sql = `
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
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('🚀 Running schema fix...');

  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    if (error.message.includes('function "exec_sql" does not exist')) {
       console.log('⚠️ RPC exec_sql not found. This is expected on some Supabase projects.');
       console.log('Falling back to direct execution if possible (Note: limited)...');
    } else {
       console.error('❌ Error executing SQL:', error);
       process.exit(1);
    }
  }

  console.log('✅ Schema check & cache refresh complete!');
}

fixSchema();
