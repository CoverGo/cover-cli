#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'
const program = new Command()

program.command('product-nodes', 'export a subtree of nodeId')
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