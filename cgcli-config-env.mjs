#!/usr/bin/env node
import { Command } from 'commander'

const program = new Command()

program
	.command('create', 'Configure a new environment')
	.command('info', 'Show details of a specific environment')
	.command('list', 'Show a list of all environment aliases')

program.parse()