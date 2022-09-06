#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { chalk } from 'zx'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'
import { exit } from 'node:process'

const program = new Command()

program.name('cg graph product-schema')

program
	.command('copy')
	.description('Copy a product schema and product UI schemas with to a new product tree')
	.argument('<source alias>', argDescriptions.sourceAlias)
	.argument('<source product id>', argDescriptions.productId)
	.argument('<target alias>', argDescriptions.targetAlias)
	.argument('<target product id>', argDescriptions.productId)
	.action(async (sourceAlias, sourceProductId, targetAlias, targetProductId) => {

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)

		const sourceQueries = useProductQueries(sourceContext)
		const targetQueries = useProductQueries(targetContext)
		const mutations = useProductMutations(targetContext)

		console.log(chalk.blue(`Fetch \`${sourceProductId}\` from tenant \`${sourceAlias}\`.`))
		const sourceProduct = await sourceQueries.fetchProduct(sourceProductId)

		console.log(chalk.blue(`Fetching data schemas for \`${sourceProduct.productTreeId}\`.`))
		const schema = await sourceQueries.fetchProductSchema(sourceProduct.productTreeId)

		console.log(chalk.blue(`Fetch \`${targetAlias}\` from tenant \`${targetProductId}\`.`))
		const targetProduct = await targetQueries.fetchProduct(targetProductId)

		if (!targetProduct.productTreeId) {
			console.error(chalk.bold.red(`Product \`${targetProductId}\` has no associated product tree!`))
			exit(1)
		}

		console.log(chalk.blue(`Create data schema \`${targetProductId}\` from tenant \`${targetAlias}\`.`))
		const schemaId = await mutations.createProductDataSchema(targetProduct.productTreeId, schema.dataSchema)

		console.log(chalk.blue(`Create product UI schema for tree \`${targetProduct.productTreeId}\` on associated with data schema \`${schemaId}\`.`))
		const uiSchemas = schema?.uiSchemas ?? []
		for (const uiSchema of uiSchemas) {
			if (uiSchema?.name === sourceProduct.productTreeId) {
				await mutations.createProductUiDataSchema(schemaId, targetProduct.productTreeId, uiSchema.schema)
			}
		}

		exit(0)
	})

program.parse()