#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProduct.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { error, info, success, warn } from './src/log.mjs'

const program = new Command()

program.name('cg graph product')

program
	.command('copy')
	.description('Copy a product including tree and data schemas.')
	.requiredOption('-s, --source <tenant>', 'Name of the source tenant.')
	.requiredOption('-d, --destination <tenant>', 'Name of the destination tenant.')
	.option('-i, --id <id>', 'Give the newly copied file a different ID from the source.')
	.argument('<id>', "The product ID to copy.")
	.action(async (sourceProductId, options) => {
		try {
			const sourceAlias = options.source
			const targetAlias = options.destination
			const targetProductId = options.id ?? sourceProductId

			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const mutations = useProductMutations(targetContext)

			info(`graph:product:copy`, `Fetch product ${chalk.bold(sourceProductId)} from tenant ${chalk.bold(sourceAlias)}.`)
			const product = await queries.fetchProduct(sourceProductId)

			const [plan, type, version] = targetProductId.split('/')
			const newId = { plan, type, version }
			const newProduct = { ...product, productId: newId }

			info(`graph:product:copy`, `Create product ${chalk.bold(targetProductId)} in tenant ${chalk.bold(targetAlias)}.`)
			const productCopy = await mutations.createProduct(newProduct)

			info(`graph:product:copy`, `Fetch source product tree.`)
			const productTree = await queries.fetchProductTree(product)

			info(`graph:product:copy`, `Create tree on destination tenant.`)
			const rootNode = await mutations.createProductTree(productTree)

			success(`graph:product:copy`, `Created tree root ${chalk.bold(rootNode)}.`)

			info(`graph:product:copy`, `Update product ID on destination tenant.`)
			await mutations.updateProductTreeIdOnProduct(productCopy, rootNode)

			let schema = null
			try {
				info(`graph:product:copy`, `Fetch source product data schema.`)
				schema = await queries.fetchProductSchema(product.productTreeId)
			} catch (e) {
				warn(`graph:product:copy`, `No data schema found for product ${chalk.bold(sourceProductId)}.`)
			}

			if (schema) {
				info(`graph:product:copy`, `Create data schema on destination tenant.`)
				const schemaId = await mutations.createProductDataSchema(rootNode, schema.dataSchema)

				info(`graph:product:copy`, `Create associated UI schema.`)
				const uiSchemas = schema?.uiSchemas ?? []
				for (const uiSchema of uiSchemas) {
					if (uiSchema?.name === productCopy.productTreeId) {
						await mutations.createProductUiDataSchema(schemaId, rootNode, uiSchema.schema)
					}
				}
			}

			success(`graph:product:copy`, `Product ${chalk.bold(sourceProductId)} copied to ${chalk.bold(targetProductId)}.`)
			exit(0)
		} catch (e) {
			error(`graph:product:copy`, e.message)
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

			console.log(chalk.blue(`Updating \`${productId}\` with productTreeId \`${productTreeId}\` on \`${alias}\`.`))
			await mutations.updateProductTreeIdOnProduct(product, productTreeId)

			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program
	.command('sync')
	.description('Sync a product from one environment to another')
	.argument('<tenant source alias>', argDescriptions.sourceAlias)
	.argument('<source product id>', argDescriptions.productId)
	.argument('<tenant target alias>', argDescriptions.targetAlias)
	.argument('<target product id>', argDescriptions.productId)
	.action(async (sourceAlias, sourceProductId, targetAlias, targetProductId) => {
		try {
			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const targetQueries = useProductQueries(targetContext)
			const mutations = useProductMutations(targetContext)

			console.log(chalk.blue(`Fetch \`${sourceProductId}\` from tenant \`${sourceAlias}\`.`))
			const product = await queries.fetchProduct(sourceProductId)

			console.log(chalk.blue(`Fetch \`${targetProductId}\` from tenant \`${targetAlias}\`.`))
			const targetProduct = await targetQueries.fetchProduct(targetProductId)

			if (!product.productTreeId) {
				console.error(chalk.bold.red(`Product \`${sourceProductId}\` has no associated product tree!`))
				exit(1)
			}

			console.log(chalk.blue(`Copy product tree \`${product.productTreeId}\` from tenant \`${sourceAlias}\` to \`${targetAlias}\`.`))
			const productTree = await queries.fetchProductTree(product)
			const productTreeId = await mutations.createProductTree(productTree)

			console.log(chalk.blue(`Updating \`${targetProductId}\` with productTreeId \`${productTreeId}\` on \`${targetAlias}\`.`))
			await mutations.updateProductTreeIdOnProduct(targetProduct, productTreeId)

			console.log(chalk.blue(`Fetching data schemas for \`${product.productTreeId}\`.`))
			const schema = await queries.fetchProductSchema(product.productTreeId)

			console.log(chalk.blue(`Create data schema \`${targetProductId}\` from tenant \`${targetAlias}\`.`))
			const schemaId = await mutations.createProductDataSchema(productTreeId, schema.dataSchema)

			console.log(chalk.blue(`Create product UI schema for tree \`${productTreeId}\` associated with data schema \`${schemaId}\`.`))
			const uiSchemas = schema?.uiSchemas ?? []
			for (const uiSchema of uiSchemas) {
				if (uiSchema?.name === product.productTreeId) {
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