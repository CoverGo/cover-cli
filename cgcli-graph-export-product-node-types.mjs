#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'
const program = new Command()

program.command('product-node-types', 'export product node types')
	.argument('<tenant alias>', 'alias of a tenant configured with `cgcli config tenant create`')
	.action(async (alias) => {
		const sourceContext = await useProductApi(alias)
		const queries = useProductQueries(sourceContext)

		const response = await queries.fetchAllNodeTypes()
		console.log(JSON.stringify(response))

		exit(0)
	})

program.parse()