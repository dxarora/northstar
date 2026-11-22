import { supabase } from './supabase.js';

const STORAGE_KEY='northstar-v1';
const LEGACY_OWNER_KEY='northstar-legacy-v1-owner';

// Import a pre-existing V1 browser snapshot once. Never copy one browser's data into another account.
export async function migrateLocalData(userId){
  if(!supabase)throw new Error('Supabase is not configured.');
  const {data:existing,error:readError}=await supabase.from('user_preferences').select('preferences').eq('user_id',userId).maybeSingle();
  if(readError)throw readError;
  if(existing?.preferences?.appState)return {migrated:false,reason:'cloud-data-exists'};

  const legacyOwner=localStorage.getItem(LEGACY_OWNER_KEY);
  if(legacyOwner && legacyOwner!==userId)return {migrated:false,reason:'legacy-data-belongs-to-another-account'};

  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw){localStorage.setItem(LEGACY_OWNER_KEY,userId);return {migrated:false,reason:'no-local-data'};}
  let appState;
  try{appState=JSON.parse(raw);}catch{throw new Error('Your local Northstar data could not be parsed. Export a backup before continuing.');}

  const {error}=await supabase.from('user_preferences').upsert({
    user_id:userId,
    preferences:{appState,schemaVersion:2,migratedFrom:'northstar-v1'},
    updated_at:new Date().toISOString()
  },{onConflict:'user_id'});
  if(error)throw error;
  localStorage.setItem(LEGACY_OWNER_KEY,userId);
  return {migrated:true};
}
