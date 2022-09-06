#!/usr/bin/env node

import { Command } from 'commander';
const program = new Command();

program
	.name('cg')
	.description('Utility scripts for interacting with the covergo platform')
	.version('0.0.1')
	.command('graph', 'Interact with the graph API')
	.command('env', 'Manage environments')
	.command('tenant', 'Manage tenants')
	// .command('login', 'Change the active tenant')

program.parse()
