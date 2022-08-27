#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-nodes', 'copy product nodes from one tenant to another')
	.argument('<tenant source alias>', 'alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'alias of a tenant to copy node types to`')
	.argument('<nodeId>', 'the root node you want to copy')
	.action(async (sourceName, targetName, nodeId) => {
		const { getConfig } = await import("./tenant/config.mjs")
		const { exportProductBuilderTree } = await import("./graph/export.mjs");
		const { importNodes } = await import("./graph/import.mjs");

		const sourceConfig = await getConfig(sourceName)
		const targetConfig = await getConfig(targetName)
		const nodes = await exportProductBuilderTree(nodeId, sourceConfig.TOKEN, sourceConfig.ENDPOINT)
		const rootNode = await importNodes(nodes, targetConfig.TOKEN, targetConfig.ENDPOINT)

		console.log("Import complete!")
		console.log(`New imported root node: ${rootNode}`)
	})

program.parse()