// src/components/signal/index.js
// Signal Module component exports

// Main Signal Module
export { default as SignalModule } from './SignalModule'
export { default as SignalPulse } from './pulse/SignalPulse'
export { default as SignalMind } from './mind/SignalMind'
export { default as SignalInsights } from './insights/SignalInsights'
export { default as SignalConfig } from './config/SignalConfig'

// Signal Sync - AI-powered calendar & planning
export { 
  SignalSync, 
  CalendarOverview, 
  DailyBriefing, 
  FocusTimeManager, 
  MeetingPrepCard 
} from './sync'

// Shared Components
export { default as EchoInput, EchoTextarea, useEcho } from './shared/EchoInput'
export { 
  SignalLoader, 
  PulseIndicator, 
  GlowBorder, 
  StreamingText, 
  SignalGradientText,
  SignalCard,
  NeuralGraph 
} from './shared/SignalUI'

// Setup
export { default as SignalSetupWizard } from './SignalSetupWizard'
export { default as SignalAILogo } from './SignalAILogo'


