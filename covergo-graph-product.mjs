#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProduct.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { error, info, success, warn } from './src/log.mjs'

const program = new Command()

program.name('covergo graph product')

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
	.requiredOption('-t, --tenant <tenant>', 'The tenant this product is hosted on.')
	.argument('<productId>', 'The product ID to assign the tree to.')
	.argument('<productTreeId>', 'The product tree ID to assign to the product.')
	.action(async (productId, productTreeId, options) => {
		try {
			const alias = options.tenant
			const context = await useProductApi(alias)
			const queries = useProductQueries(context)
			const mutations = useProductMutations(context)

			info(`graph:product:assign-tree`, `Fetch product ${chalk.bold(productId)} from tenant ${chalk.bold(alias)}.`)
			const product = await queries.fetchProduct(productId)

			info(`graph:product:assign-tree`, `Update product tree ID on product ${chalk.bold(productId)}.`)
			await mutations.updateProductTreeIdOnProduct(product, productTreeId)

			success(`graph:product:assign-tree`, `Product ${chalk.bold(productId)} assigned to tree ${chalk.bold(productTreeId)}.`)
			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program
	.command('sync')
	.description('Sync a product from one environment to another')

	.requiredOption('-s, --source <tenant>', 'Name of the source tenant.')
	.requiredOption('-d, --destination <tenant>', 'Name of the destination tenant.')
	.argument('<from>', "The product to sync from.")
	.argument('<to>', "The product to sync to.")

	.action(async (from, to, options) => {
		try {
			const sourceAlias = options.source
			const targetAlias = options.destination

			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const targetQueries = useProductQueries(targetContext)
			const mutations = useProductMutations(targetContext)

			info(`graph:product:sync`, `Fetch product ${chalk.bold(from)} from tenant ${chalk.bold(sourceAlias)}.`)
			const product = await queries.fetchProduct(from)

			info(`graph:product:sync`, `Fetch product ${chalk.bold(to)} from tenant ${chalk.bold(targetAlias)}.`)
			const targetProduct = await targetQueries.fetchProduct(to)

			if (!product.productTreeId) {
				error(`graph:product:sync`, `Target product ${chalk.bold(product.productTreeId)} does not have a product tree ID.`)
				exit(1)
			}

			info(`graph:product:sync`, `Create tree on destination tenant.`)
			const productTree = await queries.fetchProductTree(product)
			const productTreeId = await mutations.createProductTree(productTree)

			success(`graph:product:copy`, `Created tree root ${chalk.bold(productTreeId)}.`)

			info(`graph:product:sync`, `Update product ID on destination tenant.`)
			await mutations.updateProductTreeIdOnProduct(targetProduct, productTreeId)

			let schema = null
			try {
				info(`graph:product:sync`, `Fetch source product data schema.`)
				schema = await queries.fetchProductSchema(product.productTreeId)
			} catch (e) {
				warn(`graph:product:sync`, `No data schema found for product ${chalk.bold(from)}.`)
				exit(0)
			}

			if (schema) {
				info(`graph:product:sync`, `Create data schema on destination tenant.`)
				const schemaId = await mutations.createProductDataSchema(productTreeId, schema.dataSchema)

				info(`graph:product:sync`, `Create associated UI schema.`)
				const uiSchemas = schema?.uiSchemas ?? []
				for (const uiSchema of uiSchemas) {
					if (uiSchema?.name === product.productTreeId) {
						await mutations.createProductUiDataSchema(schemaId, productTreeId, uiSchema.schema)
					}
				}
			}

			success(`graph:product:sync`, `Product ${chalk.bold(from)} synced to ${chalk.bold(to)}.`)

			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program.parse()