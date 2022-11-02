#!/usr/bin/env node

import { Command } from 'commander'
import { chalk } from 'zx'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProduct.mjs'
import { exit } from 'node:process'
import { info, success } from './src/log.mjs'

const program = new Command()

program.name('covergo graph product-tree')

program
	.command('copy')
	.description('Copy product tree')
	.requiredOption('-s, --source <tenant>', 'Name of the source tenant.')
	.requiredOption('-d, --destination <tenant>', 'Name of the destination tenant.')
	.argument('<id>', "The product ID to copy the tree from.")
	.action(async (productId, options) => {
		const sourceAlias = options.source
		const targetAlias = options.destination

		info(`graph:product-tree:copy`, `Copying product tree from ${chalk.bold(sourceAlias)} to ${chalk.bold(targetAlias)}.`)

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)

		const queries = useProductQueries(sourceContext)
		const mutations = useProductMutations(targetContext)

		const product = await queries.fetchProduct(productId)
		const productTree = await queries.fetchProductTree(product)
		const rootId = await mutations.createProductTree(productTree)

		success(`graph:product-tree:copy`, `Product tree copied with ID ${chalk.bold(rootId)}.`)
	})

program
	.command('import')
	.description('Import previously exported data')
	.requiredOption('-t, --tenant <tenant>', 'Tenant import the tree to.')
	.argument('<nodes>', 'JSON structure containing previously exported nodes.')
	.action(async (nodes, options) => {
		info(`graph:product-tree:import`, `Importing product tree to ${options.tenant}.`)

		const targetContext = await useProductApi(options.tenant)
		const mutations = useProductMutations(targetContext)
		await mutations.createProductTree(nodes)

		success(`graph:product-tree:import`, `Product tree imported!`)
		exit(0)
	})

program
	.command('export')
	.description('Export product tree nodes')
	.requiredOption('-t, --tenant <tenant>', 'Tenant export the tree from.')
	.argument('<id>', "The product ID to export the tree from.")
	.action(async (productId, options) => {
		const sourceContext = await useProductApi(options.tenant)
		const queries = useProductQueries(sourceContext)

		const product = await queries.fetchProduct(productId)
		const productTree = await queries.fetchProductTree(product)

		console.log(JSON.stringify(productTree))

		exit(0)
	})

program.parse()