#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations } from './src/graph/useProductActions.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'
const program = new Command()

program.command('product-node-types', 'Import node types from input')
	.argument('<tenant alias>', argDescriptions.targetAlias)
	.argument('<types>', argDescriptions.nodeTypes)
	.action(async (alias, types) => {
		console.log(`Importing node types to ${alias}.`)

		const targetContext = await useProductApi(alias)
		const mutations = useProductMutations(targetContext)
		await mutations.createNodeTypes(types)

		console.log('')
		console.log(chalk.bold.green(`Done!`))

		exit(0)
	})

program.parse()