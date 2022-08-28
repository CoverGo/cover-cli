#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-nodes', 'export a subtree of nodeId')
	.argument('<tenant alias>', 'alias of a tenant configured with `cgcli config tenant create`')
	.argument('<nodeId>', 'the root node you want to export')
	.action(async (name, nodeId) => {
		const { getConfig } = await import("./tenant/config.mjs")
		const { exportProductBuilderTree } = await import("./src/graph/export.mjs");
		const config = await getConfig(name)
		const result = await exportProductBuilderTree(nodeId, config.TOKEN, config.ENDPOINT)
		console.log(JSON.stringify(result))
	})

program.parse()