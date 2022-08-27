#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program
	.command('create', 'Configure a new environment')

program.parse()