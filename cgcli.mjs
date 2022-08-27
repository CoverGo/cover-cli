#!/usr/bin/env node

import { Command } from 'commander';
const program = new Command();

program
	.name('cover-cli')
	.description('Small utility scripts for interacting with the covergo platform.')
	.version('0.0.1')
	.command('graph', 'interact with the graph API')
	.command('config', 'configure this tool')

program.parse()
