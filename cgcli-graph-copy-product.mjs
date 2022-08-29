#!/usr/bin/env zx
import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { exit } from 'node:process'
import { chalk } from 'zx'
import { useProductMutations, useProductQueries } from './src/graph/useProductActions.mjs'

const program = new Command()
program.command('product-nodes', 'Copy an entire product with data schemas, tree and nodes')
	.argument('<tenant source alias>', 'Alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'Alias of a tenant to copy node types to`')
	.argument('<productId>', 'The product id you wish to copy (name/type/version)')
	.action(async (sourceAlias, targetAlias, productId) => {
		try {
			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const mutations = useProductMutations(targetContext)

			console.log(chalk.blue(`${chalk.bold(`1/8:`)} Fetch \`${productId}\` from tenant \`${sourceAlias}\`.`))
			const product = await queries.fetchProduct(productId, sourceAlias)

			console.log(chalk.blue(`${chalk.bold(`2/8:`)} Creating product \`${productId}\` on tenant \`${targetAlias}\`.`))
			const productCopy = await mutations.createProduct(product)

			console.log(chalk.blue(`${chalk.bold(`3/8:`)} Fetch product tree \`${product.productTreeId}\` from tenant \`${sourceAlias}\`.`))
			const productTree = await queries.fetchProductTree(product)

			console.log(chalk.blue(`${chalk.bold(`4/8:`)} Copying node(s) from product \`${productId}\` to tenant \`${targetAlias}\`.`))
			const rootNode = await mutations.createProductTree(productTree)

			console.log(chalk.blue(`${chalk.bold(`5/8:`)} Updating \`${productId}\` with productTreeId \`${rootNode}\` on \`${targetAlias}\`.`))
			await mutations.updateProductTreeIdOnProduct(product, rootNode)

			console.log(chalk.blue(`${chalk.bold(`6/8:`)} Fetching data schemas for \`${product.productTreeId}\`.`))
			const schema = await queries.fetchProductSchema(product.productTreeId)

			console.log(chalk.blue(`${chalk.bold(`7/8:`)} Create product schema for tree \`${rootNode}\`.`))
			const schemaId = await mutations.createProductDataSchema(rootNode, schema.dataSchema)

			console.log(chalk.blue(`${chalk.bold(`8/8:`)} Create product UI schema for tree \`${rootNode}\`.`))
			const uiSchemas = schema?.uiSchemas ?? []
			for (const uiSchema of uiSchemas) {
				if (uiSchema?.name === productCopy.productTreeId) {
					await mutations.createProductUiDataSchema(schemaId, rootNode, uiSchema.schema)
				}
			}

			console.log('')
			console.log(chalk.bold.green(`Done!`))

			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program.parse()