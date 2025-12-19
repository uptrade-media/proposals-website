/**
 * Training Sync Endpoint
 * 
 * Receives training data from GWA app and syncs to org_gwa schema
 * POST /.netlify/functions/training-sync
 * 
 * Headers:
 *   X-Org-Id: bfa1aa3d-9807-4ba4-baaa-4d7ca04958fb (GWA org ID)
 *   X-User-Id: visitor_xxxx or actual contact id
 * 
 * Body:
 *   {
 *     sessions: TrainingSession[],
 *     stats: UserStats,
 *     prs: PRRecord[]
 *   }
 */

import { createSupabaseAdmin } from './utils/supabase.js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Org-Id, X-User-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

// GWA Organization ID
const GWA_ORG_ID = 'bfa1aa3d-9807-4ba4-baaa-4d7ca04958fb'

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const supabase = createSupabaseAdmin()
    
    // Get org and user from headers
    const orgId = event.headers['x-org-id']
    const userId = event.headers['x-user-id'] || 'anonymous'

    // Validate org - only GWA is allowed for now
    if (orgId && orgId !== GWA_ORG_ID) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Invalid organization' })
      }
    }

    // Parse body
    const body = JSON.parse(event.body || '{}')
    const { sessions = [], stats = null, prs = [] } = body

    if (!sessions.length && !stats && !prs.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No data to sync' })
      }
    }

    const results = {
      sessions: { synced: 0, errors: [] },
      stats: { synced: false, error: null },
      prs: { synced: 0, errors: [] }
    }

    // 1. Sync sessions to org_gwa.training_sessions
    if (sessions.length > 0) {
      for (const session of sessions) {
        try {
          // Use RPC to insert into tenant schema
          const { error } = await supabase.rpc('execute_sql', {
            sql: `
              INSERT INTO org_gwa.training_sessions (
                id, user_id, type, duration, rating, notes, date, 
                exercises, created_at, updated_at
              ) VALUES (
                '${session.id}',
                '${userId}',
                '${session.type}',
                ${session.duration},
                ${session.rating},
                ${session.notes ? `'${session.notes.replace(/'/g, "''")}'` : 'NULL'},
                '${session.date}',
                ${session.exercises ? `'${JSON.stringify(session.exercises)}'::jsonb` : 'NULL'},
                '${session.createdAt || new Date().toISOString()}',
                '${session.updatedAt || new Date().toISOString()}'
              )
              ON CONFLICT (id) DO UPDATE SET
                type = EXCLUDED.type,
                duration = EXCLUDED.duration,
                rating = EXCLUDED.rating,
                notes = EXCLUDED.notes,
                exercises = EXCLUDED.exercises,
                updated_at = EXCLUDED.updated_at
            `
          })
          
          if (error) {
            results.sessions.errors.push({ id: session.id, error: error.message })
          } else {
            results.sessions.synced++
          }
        } catch (err) {
          results.sessions.errors.push({ id: session.id, error: err.message })
        }
      }
    }

    // 2. Sync user stats to org_gwa.training_stats
    if (stats) {
      try {
        const { error } = await supabase.rpc('execute_sql', {
          sql: `
            INSERT INTO org_gwa.training_stats (
              user_id, total_sessions, total_minutes, current_streak,
              longest_streak, total_prs, last_workout_date, updated_at
            ) VALUES (
              '${userId}',
              ${stats.totalSessions || 0},
              ${stats.totalMinutes || 0},
              ${stats.currentStreak || 0},
              ${stats.longestStreak || 0},
              ${stats.totalPRs || 0},
              ${stats.lastWorkoutDate ? `'${stats.lastWorkoutDate}'` : 'NULL'},
              NOW()
            )
            ON CONFLICT (user_id) DO UPDATE SET
              total_sessions = EXCLUDED.total_sessions,
              total_minutes = EXCLUDED.total_minutes,
              current_streak = EXCLUDED.current_streak,
              longest_streak = EXCLUDED.longest_streak,
              total_prs = EXCLUDED.total_prs,
              last_workout_date = EXCLUDED.last_workout_date,
              updated_at = NOW()
          `
        })

        if (error) {
          results.stats.error = error.message
        } else {
          results.stats.synced = true
        }
      } catch (err) {
        results.stats.error = err.message
      }
    }

    // 3. Sync personal records to org_gwa.training_prs
    if (prs.length > 0) {
      for (const pr of prs) {
        try {
          const { error } = await supabase.rpc('execute_sql', {
            sql: `
              INSERT INTO org_gwa.training_prs (
                id, user_id, exercise, value, unit, date, created_at
              ) VALUES (
                '${pr.id}',
                '${userId}',
                '${pr.exercise.replace(/'/g, "''")}',
                ${pr.value},
                '${pr.unit || 'lbs'}',
                '${pr.date}',
                NOW()
              )
              ON CONFLICT (id) DO NOTHING
            `
          })

          if (error) {
            results.prs.errors.push({ id: pr.id, error: error.message })
          } else {
            results.prs.synced++
          }
        } catch (err) {
          results.prs.errors.push({ id: pr.id, error: err.message })
        }
      }
    }

    // Log sync activity
    console.log(`Training sync for user ${userId}:`, {
      sessions: results.sessions.synced,
      stats: results.stats.synced,
      prs: results.prs.synced
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        synced: {
          sessions: results.sessions.synced,
          stats: results.stats.synced,
          prs: results.prs.synced
        },
        errors: {
          sessions: results.sessions.errors.length,
          stats: results.stats.error ? 1 : 0,
          prs: results.prs.errors.length
        }
      })
    }

  } catch (error) {
    console.error('Training sync error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to sync training data',
        message: error.message 
      })
    }
  }
}
