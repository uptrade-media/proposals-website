#!/usr/bin/env node
/**
 * Add Training Tables to GWA Schema
 * 
 * Run: node scripts/add-gwa-training-tables.mjs
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const schemaName = 'org_gwa'

async function addTrainingTables() {
  console.log('\n🏋️ Adding Training Tables to GWA Schema...\n')

  try {
    // 1. Training Sessions Table
    const { error: sessionsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.training_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          type TEXT NOT NULL,
          duration INTEGER NOT NULL,
          rating INTEGER CHECK (rating >= 1 AND rating <= 5),
          notes TEXT,
          date DATE NOT NULL,
          exercises JSONB,
          workout_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_training_sessions_user 
          ON ${schemaName}.training_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_training_sessions_date 
          ON ${schemaName}.training_sessions(date);
        CREATE INDEX IF NOT EXISTS idx_training_sessions_type 
          ON ${schemaName}.training_sessions(type);
      `
    })

    if (sessionsError) {
      console.warn('⚠️  Could not create training_sessions:', sessionsError.message)
    } else {
      console.log('✅ Created training_sessions table')
    }

    // 2. Training Stats Table
    const { error: statsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.training_stats (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT UNIQUE NOT NULL,
          total_sessions INTEGER DEFAULT 0,
          total_minutes INTEGER DEFAULT 0,
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          total_prs INTEGER DEFAULT 0,
          last_workout_date DATE,
          badges JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_training_stats_user 
          ON ${schemaName}.training_stats(user_id);
      `
    })

    if (statsError) {
      console.warn('⚠️  Could not create training_stats:', statsError.message)
    } else {
      console.log('✅ Created training_stats table')
    }

    // 3. Personal Records Table
    const { error: prsError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.training_prs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          exercise TEXT NOT NULL,
          value DECIMAL(10,2) NOT NULL,
          unit TEXT DEFAULT 'lbs',
          date DATE NOT NULL,
          session_id UUID REFERENCES ${schemaName}.training_sessions(id),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_training_prs_user 
          ON ${schemaName}.training_prs(user_id);
        CREATE INDEX IF NOT EXISTS idx_training_prs_exercise 
          ON ${schemaName}.training_prs(exercise);
      `
    })

    if (prsError) {
      console.warn('⚠️  Could not create training_prs:', prsError.message)
    } else {
      console.log('✅ Created training_prs table')
    }

    // 4. Training Badges Table (earned achievements)
    const { error: badgesError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${schemaName}.training_badges (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          badge_id TEXT NOT NULL,
          earned_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, badge_id)
        );

        CREATE INDEX IF NOT EXISTS idx_training_badges_user 
          ON ${schemaName}.training_badges(user_id);
      `
    })

    if (badgesError) {
      console.warn('⚠️  Could not create training_badges:', badgesError.message)
    } else {
      console.log('✅ Created training_badges table')
    }

    console.log('\n✨ Training Tables Setup Complete!')
    console.log('   Tables created in org_gwa schema:')
    console.log('   - training_sessions')
    console.log('   - training_stats')
    console.log('   - training_prs')
    console.log('   - training_badges')

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

addTrainingTables()
