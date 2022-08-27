#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program
	.command('info', 'configure a new tenant')
	.argument('<name>', 'show the tenant information for this alias')
	.action(async (name) => {
		const {readConfig} = await import("./tenant/config.mjs");
		console.log(await readConfig(name))
	})

program.parse()