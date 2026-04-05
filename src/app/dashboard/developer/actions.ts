'use server';

import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function generateApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Generate a random 32-character hex string as the API key, prefixed with 'csela_'
  const rawKey = crypto.randomBytes(32).toString('hex');
  const apiKey = `csela_${rawKey}`;
  const now = new Date().toISOString();

  // Save the new key and creation timestamp to the user's profile
  const { error } = await supabase
    .from('profiles')
    .update({ api_key: apiKey, api_key_created_at: now })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to generate API Key:', error);
    return { error: 'Failed to generate API key. Please check your database schema (add api_key and api_key_created_at columns to profiles).' };
  }

  return { apiKey, createdAt: now };
}

export async function revokeApiKey() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ api_key: null, api_key_created_at: null })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to revoke API Key:', error);
    return { error: 'Failed to revoke API key.' };
  }

  return { success: true };
}
