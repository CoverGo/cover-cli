#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations } from './src/graph/useProductActions.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'
const program = new Command()

program.command('product-nodes', 'Import product nodes from input')
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

program.parse()