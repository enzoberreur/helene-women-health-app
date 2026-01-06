import { supabase } from '../lib/supabase';

const isMissingTableError = (error) => {
  // PostgREST uses SQLSTATE codes in many errors; 42P01 = undefined_table
  return (
    error?.code === '42P01' ||
    /undefined_table/i.test(error?.message || '') ||
    /Could not find the table .* in the schema cache/i.test(error?.message || '')
  );
};

const asIsoDate = (date) => date.toISOString().split('T')[0];

/**
 * Lightweight database connectivity checklist.
 *
 * Goals:
 * - Confirm session/user is valid
 * - Confirm RLS allows reading the current user's rows
 * - Optionally (dev only) confirm we can write to daily_logs
 *
 * No UI: logs to console so you can inspect in Expo logs.
 */
export async function runDbHealthCheck({ userId, allowWriteTest = false } = {}) {
  const startedAt = Date.now();

  const prefix = '[db-health]';
  const log = (...args) => console.log(prefix, ...args);
  const warn = (...args) => console.warn(prefix, ...args);

  if (!userId) {
    warn('Skipped: missing userId');
    return { ok: false, reason: 'missing_user_id' };
  }

  const results = {
    ok: true,
    userId,
    checks: {
      profiles: { ok: false },
      daily_logs_read: { ok: false },
      daily_logs_write: { ok: null, skipped: true },
      hormone_treatment: { ok: null, skipped: true },
    },
    durationMs: 0,
  };

  try {
    // 1) profiles: can we read our profile row?
    {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        results.ok = false;
        results.checks.profiles = { ok: false, error };
        warn('profiles: FAIL', error.message || error);
      } else {
        results.checks.profiles = { ok: true, hasRow: Boolean(data) };
        log('profiles: OK', data ? '(row found)' : '(no row yet)');
      }
    }

    // 2) daily_logs read: can we read today log?
    const today = asIsoDate(new Date());
    {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('id, log_date')
        .eq('user_id', userId)
        .eq('log_date', today)
        .maybeSingle();

      if (error) {
        results.ok = false;
        results.checks.daily_logs_read = { ok: false, error };
        warn('daily_logs read: FAIL', error.message || error);
      } else {
        results.checks.daily_logs_read = { ok: true, hasTodayRow: Boolean(data) };
        log('daily_logs read: OK', data ? '(today row found)' : '(no row today yet)');
      }
    }

    // 3) daily_logs write (optional): can we upsert minimal row?
    if (allowWriteTest) {
      results.checks.daily_logs_write = { ok: false, skipped: false };

      const payload = {
        user_id: userId,
        log_date: today,
        mood: 3,
        energy_level: 3,
        sleep_quality: 3,
      };

      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'user_id,log_date' })
        .select('id, log_date')
        .single();

      if (error) {
        results.ok = false;
        results.checks.daily_logs_write = { ok: false, skipped: false, error };
        warn('daily_logs write: FAIL', error.message || error);
      } else {
        results.checks.daily_logs_write = { ok: true, skipped: false, id: data?.id };
        log('daily_logs write: OK', `(id ${data?.id})`);
      }
    } else {
      log('daily_logs write: skipped (allowWriteTest=false)');
    }

    // 4) hormone_treatment: table may not exist yet; detect gracefully.
    {
      const { error } = await supabase
        .from('hormone_treatment')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        if (isMissingTableError(error)) {
          results.checks.hormone_treatment = { ok: null, skipped: true, reason: 'missing_table' };
          log('hormone_treatment: skipped (table missing, migration not applied)');
        } else {
          results.ok = false;
          results.checks.hormone_treatment = { ok: false, skipped: false, error };
          warn('hormone_treatment: FAIL', error.message || error);
        }
      } else {
        results.checks.hormone_treatment = { ok: true, skipped: false };
        log('hormone_treatment: OK');
      }
    }
  } catch (error) {
    results.ok = false;
    results.unhandledError = error;
    warn('Unhandled error', error?.message || error);
  } finally {
    results.durationMs = Date.now() - startedAt;
    log(`done in ${results.durationMs}ms`, results.ok ? '✅' : '❌');
  }

  return results;
}
