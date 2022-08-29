#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'
import { chalk } from 'zx'
import { argDescriptions } from './src/strings.js'
const program = new Command()

program.command('product-nodes', 'Copy ')
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

program.parse()