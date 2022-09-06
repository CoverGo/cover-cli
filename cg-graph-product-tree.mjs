#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { chalk } from 'zx'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'

const program = new Command()

program.name('cg graph product-tree')

program
	.command('copy')
	.description('Copy product tree')
	.argument('<tenant source alias>', argDescriptions.sourceAlias)
	.argument('<tenant target alias>', argDescriptions.targetAlias)
	.argument('<productId>', argDescriptions.productId)
	.action(async (sourceAlias, targetAlias, productId) => {
		console.log(chalk.blue(`Copy product tree \`${productId}\` from tenant \`${sourceAlias}\` to \`${targetAlias}\`.`))

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)

		const queries = useProductQueries(sourceContext)
		const mutations = useProductMutations(targetContext)

		const product = await queries.fetchProduct(productId)
		const productTree = await queries.fetchProductTree(product)
		await mutations.createProductTree(productTree)

		console.log('')
		console.log(chalk.bold.green(`Done!`))
	})

program
	.command('import')
	.description('Import previously exported data')
	.argument('<tenant alias>', argDescriptions.targetAlias)
	.argument('<nodes>', argDescriptions.nodes)
	.action(async (alias, nodes) => {
		console.log(`Importing nodes to \`${alias}\`.`)

		const targetContext = await useProductApi(alias)
		const mutations = useProductMutations(targetContext)
		await mutations.createProductTree(nodes)

		console.log('')
		console.log(chalk.bold.green(`Done!`))

		exit(0)
	})

program
	.command('export')
	.description('Export product tree nodes')
	.argument('<tenant alias>', 'Alias of a tenant configured with `cgcli config tenant create`')
	.argument('<productId>', 'The product ID you wish to export nodes from.')
	.action(async (alias, productId) => {
		const sourceContext = await useProductApi(alias)
		const queries = useProductQueries(sourceContext)

		const product = await queries.fetchProduct(productId)
		const productTree = await queries.fetchProductTree(product)
		console.log(JSON.stringify(productTree))

		exit(0)
	})

program.parse()