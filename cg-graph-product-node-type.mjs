#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProduct.mjs'
import { exit } from 'node:process'
import { chalk } from 'zx'
import { info, success } from './src/log.mjs'

const program = new Command()

program.name('covergo graph product-node-type')

program.command('copy')
	.description('Copy product tree node types')
	.requiredOption('-s, --source <tenant>', 'Name of the source tenant.')
	.requiredOption('-d, --destination <tenant>', 'Name of the destination tenant.')
	.action(async (options) => {
		const sourceAlias = options.source
		const targetAlias = options.destination

		info(`graph:product-node-type:copy`, `Copying node types from ${chalk.bold(sourceAlias)} to ${chalk.bold(targetAlias)}.`)

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)

		const queries = useProductQueries(sourceContext)
		const mutations = useProductMutations(targetContext)

		const response = await queries.fetchAllNodeTypes()
		await mutations.createNodeTypes(response)

		info(``, ``)
		success(`graph:product-node-type:copy`, `Types copied!`)

		exit(0)
	})

program.command('import')
	.description('Import list of previously exported node types.')
	.requiredOption('-t, --tenant <tenant>', 'Tenant to import node types to.')
	.argument('<types>', 'JSON structure containing previously exported node types.')
	.action(async (types, options) => {
		info(`graph:product-node-type:import`, `Importing node types to ${options.tenant}.`)

		const targetContext = await useProductApi(options.tenant)
		const mutations = useProductMutations(targetContext)
		await mutations.createNodeTypes(JSON.parse(types))
		info(``, ``)
		success(`graph:product-node-type:import`, `Types imported!`)
		exit(0)
	})

program.command('export')
	.description('Export all product tree node types from a tenant.')
	.requiredOption('-t, --tenant <tenant>', 'Tenant to export node types from.')
	.action(async (options) => {
		const sourceContext = await useProductApi(options.tenant)
		const queries = useProductQueries(sourceContext)

		const response = await queries.fetchAllNodeTypes()
		console.log(JSON.stringify(response))

		exit(0)
	})

program.parse()