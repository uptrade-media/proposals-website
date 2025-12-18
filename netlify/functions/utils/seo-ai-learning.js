/**
 * SEO AI Learning System
 * 
 * Tracks recommendation outcomes and feeds learnings back to the AI
 * so it continuously improves based on what actually works.
 */

import { createSupabaseAdmin } from './supabase.js';

const MINIMUM_DAYS_FOR_MEASUREMENT = 14;  // Wait at least 2 weeks
const OPTIMAL_DAYS_FOR_MEASUREMENT = 30;  // Prefer 30 days of data
const MINIMUM_OUTCOMES_FOR_PATTERN = 5;   // Need 5+ outcomes to establish pattern
const WIN_THRESHOLD_SCORE = 15;           // Score >= 15 is a win
const LOSS_THRESHOLD_SCORE = -15;         // Score <= -15 is a loss

/**
 * Record an outcome for a recommendation
 */
export async function recordOutcome({
  recommendationId,
  siteId,
  pageId,
  category,
  changeType,
  beforeValue,
  afterValue,
  implementedAt,
  targetKeyword,
  positionBefore,
  positionAfter,
  clicksBefore,
  clicksAfter,
  impressionsBefore,
  impressionsAfter,
  ctrBefore,
  ctrAfter
}) {
  const supabase = createSupabaseAdmin();
  
  // Calculate changes
  const positionChange = positionBefore && positionAfter 
    ? positionBefore - positionAfter  // Positive = improved (moved up)
    : null;
  
  const clicksChangePct = clicksBefore && clicksAfter 
    ? ((clicksAfter - clicksBefore) / clicksBefore) * 100 
    : null;
    
  const impressionsChangePct = impressionsBefore && impressionsAfter 
    ? ((impressionsAfter - impressionsBefore) / impressionsBefore) * 100 
    : null;
    
  const ctrChangePct = ctrBefore && ctrAfter 
    ? ((ctrAfter - ctrBefore) / ctrBefore) * 100 
    : null;

  // Calculate outcome score
  const outcomeScore = calculateOutcomeScore({
    positionChange,
    clicksChangePct,
    impressionsChangePct,
    ctrChangePct
  });

  // Determine outcome
  let outcome = 'neutral';
  if (outcomeScore >= WIN_THRESHOLD_SCORE) outcome = 'win';
  else if (outcomeScore <= LOSS_THRESHOLD_SCORE) outcome = 'loss';

  const daysSinceImplementation = Math.floor(
    (Date.now() - new Date(implementedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Confidence based on data quality
  const outcomeConfidence = calculateConfidence({
    daysSinceImplementation,
    hasPositionData: positionBefore !== null && positionAfter !== null,
    hasTrafficData: clicksBefore !== null && clicksAfter !== null,
    clicksBefore: clicksBefore || 0
  });

  const { data, error } = await supabase
    .from('seo_ai_recommendation_outcomes')
    .insert({
      recommendation_id: recommendationId,
      site_id: siteId,
      page_id: pageId,
      category,
      change_type: changeType,
      before_value: beforeValue,
      after_value: afterValue,
      implemented_at: implementedAt,
      target_keyword: targetKeyword,
      keyword_position_before: positionBefore,
      keyword_position_after: positionAfter,
      keyword_position_change: positionChange,
      clicks_before_30d: clicksBefore,
      clicks_after_30d: clicksAfter,
      clicks_change_pct: clicksChangePct,
      impressions_before_30d: impressionsBefore,
      impressions_after_30d: impressionsAfter,
      impressions_change_pct: impressionsChangePct,
      ctr_before: ctrBefore,
      ctr_after: ctrAfter,
      ctr_change_pct: ctrChangePct,
      outcome,
      outcome_score: outcomeScore,
      outcome_confidence: outcomeConfidence,
      measured_at: new Date().toISOString(),
      days_since_implementation: daysSinceImplementation
    })
    .select()
    .single();

  if (error) throw error;

  // Update the recommendation
  await supabase
    .from('seo_ai_recommendations')
    .update({
      outcome_tracked: true,
      outcome_id: data.id
    })
    .eq('id', recommendationId);

  // Update patterns
  await updateLearningPatterns(siteId, category, changeType, outcome, outcomeScore, {
    before: beforeValue,
    after: afterValue,
    impact: outcomeScore
  });

  return data;
}

/**
 * Calculate outcome score from metrics
 */
function calculateOutcomeScore({ positionChange, clicksChangePct, impressionsChangePct, ctrChangePct }) {
  let score = 0;

  // Position improvement (up to 50 points)
  if (positionChange !== null) {
    score += Math.min(50, Math.max(-50, positionChange * 10));
  }

  // Traffic impact (up to 30 points)
  if (clicksChangePct !== null) {
    score += Math.min(30, Math.max(-30, clicksChangePct * 0.3));
  }

  // CTR impact (up to 20 points)
  if (ctrChangePct !== null) {
    score += Math.min(20, Math.max(-20, ctrChangePct * 0.5));
  }

  return Math.min(100, Math.max(-100, Math.round(score)));
}

/**
 * Calculate confidence in the outcome measurement
 */
function calculateConfidence({ daysSinceImplementation, hasPositionData, hasTrafficData, clicksBefore }) {
  let confidence = 0.5;

  // More time = more confidence
  if (daysSinceImplementation >= OPTIMAL_DAYS_FOR_MEASUREMENT) confidence += 0.2;
  else if (daysSinceImplementation >= MINIMUM_DAYS_FOR_MEASUREMENT) confidence += 0.1;

  // Having position data adds confidence
  if (hasPositionData) confidence += 0.15;

  // Having traffic data adds confidence
  if (hasTrafficData) confidence += 0.15;

  // Higher baseline traffic = more reliable signal
  if (clicksBefore >= 100) confidence += 0.1;
  else if (clicksBefore >= 50) confidence += 0.05;

  return Math.min(1.0, confidence);
}

/**
 * Update learning patterns based on new outcome
 */
async function updateLearningPatterns(siteId, category, changeType, outcome, score, example) {
  const supabase = createSupabaseAdmin();
  const patternType = `${category}_${changeType || 'general'}`;

  // Get or create pattern
  const { data: existing } = await supabase
    .from('seo_ai_learning_patterns')
    .select('*')
    .eq('site_id', siteId)
    .eq('pattern_type', patternType)
    .single();

  if (existing) {
    // Update existing pattern
    const updates = {
      total_implementations: existing.total_implementations + 1,
      wins: existing.wins + (outcome === 'win' ? 1 : 0),
      losses: existing.losses + (outcome === 'loss' ? 1 : 0),
      neutral: existing.neutral + (outcome === 'neutral' ? 1 : 0),
      last_updated: new Date().toISOString()
    };

    // Calculate new win rate
    updates.win_rate = (updates.wins / updates.total_implementations) * 100;

    // Update average impact
    const currentAvg = existing.avg_position_impact || 0;
    const n = existing.total_implementations;
    updates.avg_position_impact = ((currentAvg * n) + score) / (n + 1);

    // Add example
    const examples = existing.examples || [];
    examples.push(example);
    if (examples.length > 10) examples.shift(); // Keep last 10
    updates.examples = examples;

    // Update best performing
    if (outcome === 'win' && score > (existing.best_performing_example?.impact || 0)) {
      updates.best_performing_example = example;
    }

    // Update confidence level
    if (updates.total_implementations >= 20) updates.confidence_level = 'high';
    else if (updates.total_implementations >= 10) updates.confidence_level = 'medium';
    else updates.confidence_level = 'low';

    await supabase
      .from('seo_ai_learning_patterns')
      .update(updates)
      .eq('id', existing.id);
  } else {
    // Create new pattern
    await supabase
      .from('seo_ai_learning_patterns')
      .insert({
        site_id: siteId,
        pattern_type: patternType,
        pattern_description: `${category} changes of type: ${changeType || 'general'}`,
        total_implementations: 1,
        wins: outcome === 'win' ? 1 : 0,
        losses: outcome === 'loss' ? 1 : 0,
        neutral: outcome === 'neutral' ? 1 : 0,
        win_rate: outcome === 'win' ? 100 : 0,
        avg_position_impact: score,
        examples: [example],
        best_performing_example: outcome === 'win' ? example : null,
        confidence_level: 'low'
      });
  }
}

/**
 * Get learnings for a site to include in AI context
 */
export async function getSiteLearnings(siteId) {
  const supabase = createSupabaseAdmin();

  // Get patterns with enough data
  const { data: patterns } = await supabase
    .from('seo_ai_learning_patterns')
    .select('*')
    .eq('site_id', siteId)
    .gte('total_implementations', MINIMUM_OUTCOMES_FOR_PATTERN)
    .order('win_rate', { ascending: false });

  // Get recent wins
  const { data: recentWins } = await supabase
    .from('seo_ai_recommendation_outcomes')
    .select(`
      *,
      recommendation:seo_ai_recommendations(*)
    `)
    .eq('site_id', siteId)
    .eq('outcome', 'win')
    .order('outcome_score', { ascending: false })
    .limit(10);

  // Get recent losses to learn from
  const { data: recentLosses } = await supabase
    .from('seo_ai_recommendation_outcomes')
    .select(`
      *,
      recommendation:seo_ai_recommendations(*)
    `)
    .eq('site_id', siteId)
    .eq('outcome', 'loss')
    .order('outcome_score', { ascending: true })
    .limit(5);

  // Get knowledge base insights
  const { data: insights } = await supabase
    .from('seo_ai_wins_knowledge')
    .select('*')
    .or(`site_id.eq.${siteId},site_id.is.null`)
    .eq('is_active', true)
    .gte('confidence', 0.7)
    .order('confidence', { ascending: false })
    .limit(10);

  return {
    patterns: patterns || [],
    recentWins: recentWins || [],
    recentLosses: recentLosses || [],
    insights: insights || [],
    summary: generateLearningSummary(patterns || [], recentWins || [], recentLosses || [])
  };
}

/**
 * Generate a summary of learnings for the AI prompt
 */
function generateLearningSummary(patterns, wins, losses) {
  const lines = [];

  // High-performing patterns
  const highWinPatterns = patterns.filter(p => p.win_rate >= 70 && p.total_implementations >= 5);
  if (highWinPatterns.length > 0) {
    lines.push('## What Works Well for This Site');
    highWinPatterns.forEach(p => {
      lines.push(`- **${p.pattern_type}**: ${p.win_rate.toFixed(0)}% win rate (${p.total_implementations} implementations)`);
      if (p.best_performing_example) {
        lines.push(`  Best example: "${p.best_performing_example.before}" → "${p.best_performing_example.after}" (+${p.best_performing_example.impact} score)`);
      }
    });
  }

  // Low-performing patterns to avoid
  const lowWinPatterns = patterns.filter(p => p.win_rate <= 30 && p.total_implementations >= 5);
  if (lowWinPatterns.length > 0) {
    lines.push('');
    lines.push('## What to Avoid for This Site');
    lowWinPatterns.forEach(p => {
      lines.push(`- **${p.pattern_type}**: Only ${p.win_rate.toFixed(0)}% win rate - consider alternative approaches`);
    });
  }

  // Recent wins
  if (wins.length > 0) {
    lines.push('');
    lines.push('## Recent Wins');
    wins.slice(0, 5).forEach(w => {
      lines.push(`- ${w.category}: "${w.before_value?.substring(0, 50)}..." → "${w.after_value?.substring(0, 50)}..." (Score: +${w.outcome_score})`);
    });
  }

  // Recent losses
  if (losses.length > 0) {
    lines.push('');
    lines.push('## Recent Changes That Didn\'t Work');
    losses.slice(0, 3).forEach(l => {
      lines.push(`- ${l.category}: "${l.before_value?.substring(0, 50)}..." → "${l.after_value?.substring(0, 50)}..." (Score: ${l.outcome_score})`);
    });
  }

  return lines.join('\n');
}

/**
 * Build learning context for AI prompt
 */
export async function buildLearningContext(siteId) {
  const learnings = await getSiteLearnings(siteId);
  
  if (!learnings.patterns.length && !learnings.recentWins.length) {
    return ''; // No learnings yet
  }

  return `
---
## 📊 LEARNING FROM PAST RESULTS

You have access to data about what has worked and what hasn't for this site.
Use this to make more targeted recommendations.

${learnings.summary}

${learnings.insights.length > 0 ? `
## Proven Strategies
${learnings.insights.map(i => `- **${i.insight_title}**: ${i.insight_description}`).join('\n')}
` : ''}

**Important**: Weight your recommendations toward patterns that have historically worked for this site. Avoid approaches that have previously failed unless there's a good reason to try again.
---
`;
}

/**
 * Find pending recommendations to measure outcomes
 * (Called by a scheduled job)
 */
export async function findRecommendationsToMeasure() {
  const supabase = createSupabaseAdmin();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - MINIMUM_DAYS_FOR_MEASUREMENT);

  const { data: pending } = await supabase
    .from('seo_ai_recommendations')
    .select(`
      *,
      site:seo_sites(*),
      page:seo_pages(*)
    `)
    .eq('status', 'implemented')
    .eq('outcome_tracked', false)
    .lt('implemented_at', cutoffDate.toISOString())
    .order('implemented_at', { ascending: true })
    .limit(50);

  return pending || [];
}

/**
 * Generate new insights from accumulated patterns
 * (Called periodically to update the knowledge base)
 */
export async function generateInsightsFromPatterns(siteId) {
  const supabase = createSupabaseAdmin();
  
  const { data: patterns } = await supabase
    .from('seo_ai_learning_patterns')
    .select('*')
    .eq('site_id', siteId)
    .gte('total_implementations', 10)
    .gte('win_rate', 60)
    .order('win_rate', { ascending: false });

  if (!patterns?.length) return [];

  const newInsights = [];

  for (const pattern of patterns) {
    // Check if insight already exists
    const { data: existing } = await supabase
      .from('seo_ai_wins_knowledge')
      .select('id')
      .eq('site_id', siteId)
      .eq('insight_type', pattern.pattern_type)
      .single();

    if (existing) {
      // Update existing
      await supabase
        .from('seo_ai_wins_knowledge')
        .update({
          supporting_outcomes: pattern.total_implementations,
          avg_impact_score: pattern.avg_position_impact,
          confidence: pattern.win_rate / 100,
          pattern_examples: pattern.examples,
          success_when_followed: pattern.win_rate,
          last_validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new insight
      const insight = {
        site_id: siteId,
        insight_type: pattern.pattern_type,
        insight_title: `${pattern.pattern_type.replace(/_/g, ' ')} works well`,
        insight_description: `This type of change has a ${pattern.win_rate.toFixed(0)}% success rate with an average impact score of ${pattern.avg_position_impact?.toFixed(0) || 'N/A'}.`,
        supporting_outcomes: pattern.total_implementations,
        avg_impact_score: pattern.avg_position_impact,
        confidence: pattern.win_rate / 100,
        pattern_examples: pattern.examples,
        success_when_followed: pattern.win_rate,
        is_active: true
      };

      const { data } = await supabase
        .from('seo_ai_wins_knowledge')
        .insert(insight)
        .select()
        .single();

      if (data) newInsights.push(data);
    }
  }

  return newInsights;
}

/**
 * Mark outcomes as fed to AI (so we don't repeat them)
 */
export async function markOutcomesAsFed(outcomeIds) {
  const supabase = createSupabaseAdmin();
  
  await supabase
    .from('seo_ai_recommendation_outcomes')
    .update({ fed_to_ai: true })
    .in('id', outcomeIds);
}

export default {
  recordOutcome,
  getSiteLearnings,
  buildLearningContext,
  findRecommendationsToMeasure,
  generateInsightsFromPatterns,
  markOutcomesAsFed
};
