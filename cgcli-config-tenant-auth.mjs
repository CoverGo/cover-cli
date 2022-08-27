#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program
	.command('auth', 'get and store a new token from the API using configured credentials')
	.argument('<name>', 'the alias you want to use when referencing this tenant in other commands')
	.action(async (name) => {
		const { fetchNewToken, saveToken } = await import("./tenant/config.mjs");
		const token = await fetchNewToken(name)
		await saveToken(name, token)
		console.log(`New token \`${token}\` stored and ready for use.`)
	})

program.parse()