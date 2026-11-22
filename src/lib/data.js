import { supabase } from './supabase.js';

export async function loadAccountData(userId){
  if(!supabase)throw new Error('Supabase is not configured.');
  // The signup trigger creates profiles for new users; this also backfills older Auth accounts.
  const {error:profileCreateError}=await supabase.from('profiles').upsert(
    {id:userId},
    {onConflict:'id',ignoreDuplicates:true}
  );
  if(profileCreateError)throw profileCreateError;
  const [profileResult,prefsResult]=await Promise.all([
    supabase.from('profiles').select('*').eq('id',userId).maybeSingle(),
    supabase.from('user_preferences').select('preferences').eq('user_id',userId).maybeSingle()
  ]);
  if(profileResult.error)throw profileResult.error;
  if(prefsResult.error)throw prefsResult.error;
  const preferences=prefsResult.data?.preferences||{};
  return {profile:profileResult.data,appState:preferences.appState||null};
}

export async function saveAccountState(userId,state){
  if(!supabase)throw new Error('Supabase is not configured.');
  const {error}=await supabase.from('user_preferences').upsert({
    user_id:userId,
    preferences:{appState:state,schemaVersion:2},
    updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error)throw error;
}
