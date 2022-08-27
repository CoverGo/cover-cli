#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program.command('env', 'Configure tenant environments')
program.command('tenant', 'Configure individual tenants')

program.parse()
