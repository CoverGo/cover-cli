#!/usr/bin/env node
import { Command } from 'commander'
const program = new Command()

program.command('product-node-types', 'copy node types from source to target tenant')
	.argument('<tenant source alias>', 'alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'alias of a tenant to copy node types to`')
	.action(async (sourceName, targetName) => {
		const { getConfig } = await import("./tenant/config.mjs")

		const sourceConfig = await getConfig(sourceName)
		const targetConfig = await getConfig(targetName)

		const { exportProductBuilderTypes } = await import("./src/graph/export.mjs")
		const { importTypes } = await import("./src/graph/import.mjs");
		console.log(`Exporting from ${sourceName}`)

		try {
			const types = await exportProductBuilderTypes(sourceConfig.TOKEN, sourceConfig.ENDPOINT)
			await importTypes(types, targetConfig.TOKEN, targetConfig.ENDPOINT)
		} catch (e) {
			console.error(e.message)
		}

		console.log("Import complete!")
	})

program.parse()