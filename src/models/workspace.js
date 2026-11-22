// Northstar's stable application-level workspace contract.
// Database snake_case fields are normalised into camelCase here.

export function createEmptyWorkspace(user, profile = null, preferences = {}) {
  return {
    user: {
      id: user.id,
      displayName:
        profile?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'there'
    },
    profile: {
      timezone: profile?.timezone ?? null,
      theme: profile?.theme ?? 'light',
      workMode: profile?.work_mode ?? null,
      wakeTime: profile?.wake_time ?? null,
      bedtime: profile?.bedtime ?? null,
      workStart: profile?.work_start ?? null,
      workEnd: profile?.work_end ?? null,
      stepTarget: profile?.step_target ?? null
    },
    preferences: preferences ?? {},
    goals: { longTerm: [], weekly: [] },
    habits: [],
    habitLogs: {},
    daily: {},
    reflections: {},
    meta: {
      schemaVersion: 1,
      fetchedAt: null
    }
  };
}

export function assembleWorkspace({ user, profile, preferences, goals, weeklyGoals, habits, habitLogs, priorities, focus, reflections }) {
  const workspace = createEmptyWorkspace(user, profile, preferences);

  workspace.goals.longTerm = goals.map(goal => ({
    id: goal.id,
    title: goal.title,
    description: goal.description ?? '',
    category: goal.category,
    target: goal.target,
    unit: goal.unit,
    frequency: goal.frequency,
    status: goal.status ?? (goal.active ? 'active' : 'archived'),
    startDate: goal.start_date,
    targetDate: goal.target_date,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at
  }));

  workspace.goals.weekly = weeklyGoals.map(goal => ({
    id: goal.id,
    weekStart: goal.week_start,
    title: goal.title,
    completed: goal.completed,
    sortOrder: goal.sort_order,
    createdAt: goal.created_at,
    updatedAt: goal.updated_at
  }));

  workspace.habits = habits.map(habit => ({
    id: habit.id,
    title: habit.title,
    description: habit.description ?? '',
    frequency: habit.frequency ?? { type: 'daily' },
    active: habit.active,
    sortOrder: habit.sort_order,
    createdAt: habit.created_at,
    updatedAt: habit.updated_at
  }));

  for (const log of habitLogs) {
    const date = log.log_date;
    workspace.habitLogs[date] ??= {};
    workspace.habitLogs[date][log.habit_id] = log.completed;
  }

  for (const priority of priorities) {
    workspace.daily[priority.priority_date] ??= { focus: null, priorities: [] };
    workspace.daily[priority.priority_date].priorities.push({
      id: priority.id,
      position: priority.position,
      title: priority.title,
      completed: priority.completed
    });
  }

  for (const entry of focus) {
    workspace.daily[entry.focus_date] ??= { focus: null, priorities: [] };
    workspace.daily[entry.focus_date].focus = {
      id: entry.id,
      title: entry.title,
      notes: entry.notes ?? ''
    };
  }

  for (const [date, day] of Object.entries(workspace.daily)) {
    day.priorities.sort((a, b) => a.position - b.position);
  }

  for (const reflection of reflections) {
    workspace.reflections[reflection.reflection_date] = {
      id: reflection.id,
      intention: reflection.intention ?? '',
      proud: reflection.proud ?? '',
      improve: reflection.improve ?? '',
      tomorrow: reflection.tomorrow ?? '',
      mood: reflection.mood ?? null,
      updatedAt: reflection.updated_at
    };
  }

  workspace.meta.fetchedAt = new Date().toISOString();
  return workspace;
}
