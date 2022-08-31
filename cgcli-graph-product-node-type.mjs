#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'
import { argDescriptions } from './src/strings.js'
import { chalk } from 'zx'
const program = new Command()

program.command('copy')
	.description('Copy product tree node types')
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

program.command('import')
	.description('Import list of previously exported node types')
	.argument('<tenant alias>', argDescriptions.targetAlias)
	.argument('<types>', argDescriptions.nodeTypes)
	.action(async (alias, types) => {
		console.log(`Importing node types to ${alias}.`)

		const targetContext = await useProductApi(alias)
		const mutations = useProductMutations(targetContext)

		try {
			await mutations.createNodeTypes(JSON.parse(types))

			console.log('')
			console.log(chalk.bold.green(`Done!`))

			exit(0)
		} catch (e) {
			console.log(chalk.red(e))
			exit(1)
		}
	})

program.command('export')
	.description('Export all product tree node types')
	.argument('<tenant alias>', argDescriptions.sourceAlias)
	.action(async (alias) => {
		const sourceContext = await useProductApi(alias)
		const queries = useProductQueries(sourceContext)

		const response = await queries.fetchAllNodeTypes()
		console.log(JSON.stringify(response))

		exit(0)
	})

program.parse()