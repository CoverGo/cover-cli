#!/usr/bin/env node
import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'
import { chalk } from 'zx'
import { argDescriptions } from './src/strings.js'

const program = new Command()

program.command('product-node-types', 'Copy node types between tenants')
	.argument('<tenant source alias>', argDescriptions.sourceAlias)
	.argument('<tenant target alias>', argDescriptions.targetAlias)
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