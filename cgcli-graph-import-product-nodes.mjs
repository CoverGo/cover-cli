#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-nodes', 'import product nodes')
	.argument('<tenant alias>', 'alias of a tenant configured with `cgcli config tenant create`')
	.argument('<types>', 'JSON string representing nodes to import from exported file')
	.action(async (name, nodes) => {
		const { getConfig } = await import("./tenant/config.mjs")
		const { importNodes } = await import("./graph/import.mjs");
		const config = await getConfig(name)
		const rootNode = await importNodes(JSON.parse(nodes), config.TOKEN, config.ENDPOINT)

		console.log("Import complete!")
		console.log(`New imported root node: ${rootNode}`)
	})

program.parse()