#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProduct.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'

const program = new Command()

program.name('cg graph product')

program
	.command('copy')
	.description('Copy from one environment to another')
	.argument('<tenant source alias>', argDescriptions.sourceAlias)
	.argument('<source product id>', argDescriptions.productId)
	.argument('<tenant target alias>', argDescriptions.targetAlias)
	.argument('<target product id>', argDescriptions.productId)
	.action(async (sourceAlias, sourceProductId, targetAlias, targetProductId) => {
		try {
			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const mutations = useProductMutations(targetContext)

			console.log(chalk.blue(`${chalk.bold(`1/8:`)} Fetch \`${sourceProductId}\` from tenant \`${sourceAlias}\`.`))
			const product = await queries.fetchProduct(sourceProductId)

			console.log(chalk.blue(`${chalk.bold(`2/8:`)} Fetch product tree \`${product.productTreeId}\` from tenant \`${sourceAlias}\`.`))
			const productTree = await queries.fetchProductTree(product)

			console.log(chalk.blue(`${chalk.bold(`3/8:`)} Copying node(s) from product \`${sourceProductId}\` to \`${targetProductId}\` on \`${targetAlias}\`.`))
			const rootNode = await mutations.createProductTree(productTree)

			const [plan, type, version] = targetProductId.split('/')
			product.productId = { plan, type, version }
			console.log(chalk.blue(`${chalk.bold(`4/8:`)} Creating product \`${targetProductId}\` on tenant \`${targetAlias}\`.`))
			const productCopy = await mutations.createProduct(product)

			console.log(chalk.blue(`${chalk.bold(`5/8:`)} Updating \`${targetProductId}\` with productTreeId \`${rootNode}\` on \`${targetAlias}\`.`))
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

program
	.command('assign-tree')
	.description('Assign a product tree to a product')
	.argument('<tenant alias>', argDescriptions.alias)
	.argument('<productId>', argDescriptions.productId)
	.argument('<productTreeId>', argDescriptions.productTreeId)
	.action(async (alias, productId, productTreeId) => {
		try {
			const context = await useProductApi(alias)
			const queries = useProductQueries(context)
			const mutations = useProductMutations(context)

			console.log(chalk.blue(`Fetch \`${productId}\` from tenant \`${alias}\`.`))
			const product = await queries.fetchProduct(productId)
			const existingProductTreeId = product.productTreeId

			console.log(chalk.blue(`Updating \`${productId}\` with productTreeId \`${productTreeId}\` on \`${alias}\`.`))
			await mutations.updateProductTreeIdOnProduct(product, productTreeId)

			if (!existingProductTreeId) {
				console.warn(chalk.yellow(`No existing product tree found for \`${productId}\` on \`${alias}\`.`))
				exit(0)
			}

			console.log(chalk.blue(`Fetching data schemas for \`${existingProductTreeId}\`.`))
			const schema = await queries.fetchProductSchema(existingProductTreeId)

			console.log(chalk.blue(`Create product schema for tree \`${productTreeId}\`.`))
			const schemaId = await mutations.createProductDataSchema(productTreeId, schema.dataSchema)

			console.log(chalk.blue(`Create product UI schema for tree \`${productTreeId}\`.`))
			const uiSchemas = schema?.uiSchemas ?? []
			for (const uiSchema of uiSchemas) {
				if (uiSchema?.name === existingProductTreeId) {
					await mutations.createProductUiDataSchema(schemaId, productTreeId, uiSchema.schema)
				}
			}

			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program.parse()