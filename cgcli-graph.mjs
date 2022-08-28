#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

program.command('copy', 'Export and re-import data between tenants')
program.command('create-tenant', 'Create a new tenant on an environment')
program.command('export', 'Export data between tenants')
program.command('import', 'Import data between tenants')

program.parse()
