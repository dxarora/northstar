import { supabase } from '../supabase.js';

function requireUser(userId) {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!userId) throw new Error('An authenticated user is required.');
}

function throwIfError(error, action) {
  if (error) throw new Error(`Could not ${action}: ${error.message}`);
}

// Habit definitions are account-owned reusable items. Completion is stored
// separately in habit_logs, one row per habit and local calendar date.
export async function listHabits(userId) {
  requireUser(userId);
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  throwIfError(error, 'load habits');
  return data ?? [];
}

export async function createHabit(userId, { title, description = '', frequency = { type: 'daily' }, sortOrder = 0 }) {
  requireUser(userId);
  const cleanTitle = String(title ?? '').trim();
  if (!cleanTitle) throw new Error('A habit name is required.');
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      title: cleanTitle,
      description: String(description ?? '').trim() || null,
      frequency,
      active: true,
      sort_order: sortOrder
    })
    .select('*')
    .single();
  throwIfError(error, 'create habit');
  return data;
}

export async function updateHabit(userId, habitId, changes) {
  requireUser(userId);
  if (!habitId) throw new Error('A habit is required.');
  const allowed = {};
  if (changes.title !== undefined) {
    allowed.title = String(changes.title).trim();
    if (!allowed.title) throw new Error('A habit name cannot be empty.');
  }
  if (changes.description !== undefined) allowed.description = String(changes.description).trim() || null;
  if (changes.frequency !== undefined) allowed.frequency = changes.frequency;
  if (changes.sortOrder !== undefined) allowed.sort_order = changes.sortOrder;
  if (changes.active !== undefined) allowed.active = Boolean(changes.active);
  if (!Object.keys(allowed).length) return null;

  const { data, error } = await supabase
    .from('habits')
    .update(allowed)
    .eq('id', habitId)
    .eq('user_id', userId)
    .select('*')
    .single();
  throwIfError(error, 'update habit');
  return data;
}

export async function setHabitCompletion(userId, habitId, date, completed) {
  requireUser(userId);
  if (!habitId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('A habit and a valid local date (YYYY-MM-DD) are required.');
  }

  if (!completed) {
    const { error } = await supabase
      .from('habit_logs')
      .delete()
      .eq('user_id', userId)
      .eq('habit_id', habitId)
      .eq('log_date', date);
    throwIfError(error, 'remove habit completion');
    return null;
  }

  const { data, error } = await supabase
    .from('habit_logs')
    .upsert(
      { user_id: userId, habit_id: habitId, log_date: date, completed: true },
      { onConflict: 'habit_id,log_date' }
    )
    .select('*')
    .single();
  throwIfError(error, 'save habit completion');
  return data;
}

export async function listHabitLogs(userId, { from, to } = {}) {
  requireUser(userId);
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new Error('The start date must use YYYY-MM-DD.');
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error('The end date must use YYYY-MM-DD.');
  let query = supabase
    .from('habit_logs')
    .select('id,user_id,habit_id,log_date,completed,updated_at')
    .eq('user_id', userId)
    .order('log_date', { ascending: false });
  if (from) query = query.gte('log_date', from);
  if (to) query = query.lte('log_date', to);
  const { data, error } = await query;
  throwIfError(error, 'load habit history');
  return data ?? [];
}
