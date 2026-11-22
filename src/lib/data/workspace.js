import { supabase } from '../supabase.js';
import { assembleWorkspace } from '../../models/workspace.js';

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
}

function assertUserId(userId) {
  if (!userId) throw new Error('An authenticated user is required.');
}

async function rows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`Could not load ${label}: ${error.message}`);
  return data ?? [];
}

// Loads a bounded, useful initial workspace. Historical views can request older
// date ranges separately instead of downloading a user's entire history.
export async function loadWorkspace(user) {
  requireClient();
  assertUserId(user?.id);

  const userId = user.id;
  const [profileResult, preferenceRows, goals, weeklyGoals, habits, habitLogs, priorities, focus, reflections] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    rows(supabase.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle(), 'preferences'),
    rows(supabase.from('user_goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }), 'goals'),
    rows(supabase.from('weekly_goals').select('*').eq('user_id', userId).order('week_start', { ascending: false }).limit(100), 'weekly goals'),
    rows(supabase.from('habits').select('*').eq('user_id', userId).order('sort_order').order('created_at'), 'habits'),
    rows(supabase.from('habit_logs').select('id,user_id,habit_id,log_date,completed,updated_at').eq('user_id', userId).order('log_date', { ascending: false }).limit(1000), 'habit history'),
    rows(supabase.from('daily_priorities').select('*').eq('user_id', userId).order('priority_date', { ascending: false }).limit(500), 'daily priorities'),
    rows(supabase.from('daily_focus').select('*').eq('user_id', userId).order('focus_date', { ascending: false }).limit(180), 'daily focus'),
    rows(supabase.from('reflections').select('*').eq('user_id', userId).order('reflection_date', { ascending: false }).limit(180), 'reflections')
  ]);

  if (profileResult.error) throw new Error(`Could not load profile: ${profileResult.error.message}`);

  return assembleWorkspace({
    user,
    profile: profileResult.data,
    preferences: preferenceRows?.preferences ?? {},
    goals,
    weeklyGoals,
    habits,
    habitLogs,
    priorities,
    focus,
    reflections
  });
}
