#!/usr/bin/env node
import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'
import { chalk } from 'zx'

const program = new Command()
program.command('product-node-types', 'copy node types from source to target tenant')
	.argument('<tenant source alias>', 'alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'alias of a tenant to copy node types to`')
	.action(async (sourceAlias, targetAlias) => {
		console.log(`Copying node types from ${sourceAlias} to ${targetAlias}.`)

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)
		const queries = useProductQueries(sourceContext)
		const mutations = useProductMutations(targetContext)

		const response = await queries.fetchAllNodeTypes()
		await mutations.createNodeTypes(response)

		console.log('')
		console.log(chalk.bold.green(`Done!`))

		exit(0)
	})

program.parse()