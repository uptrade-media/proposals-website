#!/usr/bin/env node
/**
 * @uptrade/site-kit CLI
 * 
 * Setup wizard for integrating Site-Kit into existing Next.js projects.
 * 
 * Usage:
 *   npx @uptrade/site-kit init
 *   npx uptrade-setup
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { initCommand } from './commands/init.js'
import { scanCommand } from './commands/scan.js'
import { migrateCommand } from './commands/migrate.js'

const program = new Command()

program
  .name('uptrade-setup')
  .description('Setup wizard for @uptrade/site-kit')
  .version('1.0.0')

program
  .command('init')
  .description('Initialize Site-Kit in your Next.js project')
  .option('-k, --api-key <key>', 'Uptrade API key')
  .option('-p, --project <id>', 'Project ID')
  .option('--skip-scan', 'Skip codebase scanning')
  .option('--ui', 'Launch visual setup wizard instead of CLI')
  .action(initCommand)

program
  .command('scan')
  .description('Scan codebase for forms, metadata, and widgets')
  .option('-d, --dir <path>', 'Directory to scan', '.')
  .option('--forms', 'Only scan for forms')
  .option('--meta', 'Only scan for metadata')
  .option('--widgets', 'Only scan for widgets')
  .action(scanCommand)

program
  .command('migrate')
  .description('Migrate detected components to Site-Kit')
  .option('--dry-run', 'Show changes without applying')
  .option('-f, --file <path>', 'Migrate specific file')
  .action(migrateCommand)

// Default to init if no command specified
if (process.argv.length === 2) {
  process.argv.push('init')
}

program.parse()
