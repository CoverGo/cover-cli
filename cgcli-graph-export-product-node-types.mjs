#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-node-types', 'export product node types')
	.argument('<tenant alias>', 'alias of a tenant configured with `cgcli config tenant create`')
	.action(async (name) => {
		const { getConfig } = await import("./tenant/config.mjs")
		const config = await getConfig(name)
		const { exportProductBuilderTypes } = await import("./graph/export.mjs")
		const result = await exportProductBuilderTypes(config.TOKEN, config.ENDPOINT)
		console.log(JSON.stringify(result))
	})

program.parse()