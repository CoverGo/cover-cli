#!/usr/bin/env zx

import { Command } from 'commander'
const program = new Command()

program.command('product-nodes', 'Copy an entire product with data schemas, tree and nodes')
	.argument('<tenant source alias>', 'Alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'Alias of a tenant to copy node types to`')
	.argument('<productId>', 'The product id you wish to copy (name/type/version)')
	.action(async (sourceName, targetName, nodeId) => {
		await Promise.all([
			$`sleep 1; echo 1`,
			$`sleep 2; echo 2`,
			$`sleep 3; echo 3`,
		])
		// const { getConfig } = await import("./tenant/config.mjs")
		// const { exportProductBuilderTree } = await import("./graph/export.mjs");
		// const { importNodes } = await import("./graph/import.mjs");

		// const sourceConfig = await getConfig(sourceName)
		// const targetConfig = await getConfig(targetName)
		// const nodes = await exportProductBuilderTree(nodeId, sourceConfig.TOKEN, sourceConfig.ENDPOINT)
		// const rootNode = await importNodes(nodes, targetConfig.TOKEN, targetConfig.ENDPOINT)

		// console.log("Import complete!")
		// console.log(`New imported root node: ${rootNode}`)
	})

program.parse()