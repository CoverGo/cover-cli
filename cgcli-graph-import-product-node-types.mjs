#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-node-types', 'export product node types')
	.argument('<tenant alias>', 'alias of a tenant configured with `cgcli config tenant create`')
	.argument('<types>', 'JSON string representing types to import from exported file')
	.action(async (name, types) => {
		const { getConfig } = await import("./tenant/config.mjs")
		const { importTypes } = await import("./graph/import.mjs");

		const config = await getConfig(name)
		await importTypes(JSON.parse(types), config.TOKEN, config.ENDPOINT)

		console.log("Import complete!")
	})

program.parse()