#!/usr/bin/env node

import { Command } from 'commander'
import { useProductApi } from './src/graph/api/useProductApi.mjs'
import { useProductMutations, useProductQueries } from './src/graph/useProduct.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { error, info, success, warn } from './src/log.mjs'
import { useExternalTableMutations, useExternalTableQueries } from './src/graph/useExternalTable.mjs'
import { useFileApi } from './src/graph/api/useFileApi.mjs'
import { getProductIdFromString } from './src/graph/productUtils.mjs'

const program = new Command()

program.name('covergo graph product')

async function copyProductTree(queries, mutations, sourceProduct, destinationProduct) {
	info(`graph:product:copy`, `Fetch source product tree.`)
	const productTree = await queries.fetchProductTree(sourceProduct)

	info(`graph:product:copy`, `Create tree on destination tenant.`)
	const rootNode = await mutations.createProductTree(productTree)

	success(`graph:product:copy`, `Created tree root ${chalk.bold(rootNode)}.`)

	if (!rootNode) {
		error(`graph:product:sync`, `Failed to create product tree on destination tenant.`)
		exit(1)
	}

	info(`graph:product:copy`, `Update product ID on destination tenant.`)
	await mutations.updateProductTreeIdOnProduct(destinationProduct, rootNode)

	return rootNode
}

async function copyProductSchema(queries, mutations, sourceProduct, destinationProduct, rootNodeId) {
	let schema = null
	try {
		info(`graph:product:copy`, `Fetch source product data schema.`)
		schema = await queries.fetchProductSchema(sourceProduct.productTreeId)
	} catch (e) {
		warn(`graph:product:copy`, `No data schema found.`)
		exit(1)
	}

	if (schema) {
		info(`graph:product:copy`, `Create data schema on destination tenant.`)
		const schemaId = await mutations.createProductDataSchema(rootNodeId, schema.dataSchema)

		info(`graph:product:copy`, `Create associated UI schema.`)
		const uiSchemas = schema?.uiSchemas ?? []
		for (const uiSchema of uiSchemas) {
			if (uiSchema?.name === sourceProduct.productTreeId) {
				await mutations.createProductUiDataSchema(schemaId, rootNodeId, uiSchema.schema)
			}
		}
	}
}

async function copyFile(command, queries, mutations, file) {
	info(command, `Fetch ${chalk.bold(file)}.`)

	const data = await queries.fetchFile(file)
	const [ filename, ...dirs ] = file.split('/').reverse()
	const directory = dirs.reverse().join('/')

	info(command, `Copying file ${chalk.bold(file)}.`)
	await mutations.createFile(directory, filename, data)

	success(command, `Copied ${chalk.bold(file)}!`)
}

async function copyScripts(command, sourceAlias, targetAlias, sourceProduct, destinationProduct, copyFiles = false, copyWorksheets = false, copyScripts = false) {
	info(`graph:product:copy`, `Copy scripts.`)

	const scripts = sourceProduct?.scripts ?? []
	const destinationScripts = destinationProduct?.scripts ?? []
	const findDestinationScriptByName = (name) => destinationScripts.find(item => item?.name === name)


	const productMutations = useProductMutations(await useProductApi(targetAlias))
	const productQueries = useProductQueries(await useProductApi(sourceAlias))
	const fileQueries = useExternalTableQueries(await useFileApi(sourceAlias))
	const fileMutations = useExternalTableMutations(await useFileApi(targetAlias))

	const copiedFiles = []

	for (const script of scripts) {
		info(command, `Copy script ${chalk.bold(script.name)}.`)
		const { type, name, inputSchema, outputSchema, sourceCode, referenceSourceCodeUrl, externalTableDataUrl, externalTableDataUrls, id } = script
		const foundDestinationScript = findDestinationScriptByName(name)

		if (copyFiles || copyWorksheets) {
			if (script.externalTableDataUrl && !copiedFiles.includes(script.externalTableDataUrl)) {
				await copyFile(command, fileQueries, fileMutations, script.externalTableDataUrl)
				copiedFiles.push(script.externalTableDataUrl)
			}

			if (script.externalTableDataUrls && Array.isArray(externalTableDataUrls)) {
				for (const table of script.externalTableDataUrls) {
					if (!copiedFiles.includes(table)) {
						await copyFile(command, fileQueries, fileMutations, table)
						copiedFiles.push(table)
					}
				}
			}
		}

		if (copyFiles || copyScripts) {
			if (script.referenceSourceCodeUrl && !copiedFiles.includes(script.referenceSourceCodeUrl)) {
				await copyFile(command, fileQueries, fileMutations, script.referenceSourceCodeUrl)
				copiedFiles.push(script.referenceSourceCodeUrl)
			}
		}
		
		if (foundDestinationScript) {
			const params = {
				...script,
				scriptId: foundDestinationScript?.id
			}
			await productMutations.updateScript(params)
		} else {
			const { schema } = await productQueries.fetchUiSchemas(`script-${id}`)

			const createdScript = await productMutations.createScript(type, name, inputSchema, outputSchema, sourceCode, referenceSourceCodeUrl, externalTableDataUrl, externalTableDataUrls)
			if (createdScript?.createdStatus?.id) {
				await productMutations.addScriptToProduct(destinationProduct.productId, createdScript.createdStatus.id)
				await productMutations.createUiSchema(`script-${createdScript.createdStatus.id}`, schema, { "type": "JSON_SCHEMA" })
			}
		}
	}
}

program
	.command('copy')
	.description('Copy a product including tree and data schemas.')
	.requiredOption('-s, --source <tenant>', 'Name of the source tenant.')
	.requiredOption('-d, --destination <tenant>', 'Name of the destination tenant.')
	.option('-i, --id <id>', 'Give the newly copied file a different ID from the source.')
	.option('-f, --files', 'Copy files associated with product. WARNING: Will overwrite files on target.')
	.option('-w, --worksheets', 'Copy tables associated with product. WARNING: Will overwrite table files on target.')
	.option('-S, --scripts', 'Copy scripts associated with product. WARNING: Will overwrite script files on target.')
	.argument('<id>', "The product ID to copy.")
	.action(async (sourceProductId, options) => {
		try {
			const sourceAlias = options.source
			const targetAlias = options.destination
			const targetProductId = options.id ?? sourceProductId
			const shouldCopyFiles = options.files ?? false
			const shouldCopyWorksheets = options.worksheets ?? false
			const shouldCopyScripts = options.scripts ?? false

			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const mutations = useProductMutations(targetContext)

			info(`graph:product:copy`, `Fetch product ${chalk.bold(sourceProductId)} from tenant ${chalk.bold(sourceAlias)}.`)
			const product = await queries.fetchProduct(sourceProductId)

			const newId = getProductIdFromString(targetProductId)
			const newProduct = { ...product, productId: newId }

			info(`graph:product:copy`, `Create product ${chalk.bold(targetProductId)} in tenant ${chalk.bold(targetAlias)}.`)
			const destinationProduct = await mutations.createProduct(newProduct)

			if (product.scripts) {
				await copyScripts(`graph:product:copy`, sourceAlias, targetAlias, product, destinationProduct, shouldCopyFiles, shouldCopyWorksheets, shouldCopyScripts)
			}

			if (product.productTreeId) {
				const newRoot = await copyProductTree(queries, mutations, product, destinationProduct)
				await copyProductSchema(queries, mutations, product, destinationProduct, newRoot)
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
	.option('-f, --files', 'Copy files associated with product. WARNING: Will overwrite files on target.')
	.option('-w, --worksheets', 'Copy tables associated with product. WARNING: Will overwrite table files on target.')
	.option('-S, --scripts', 'Copy scripts associated with product. WARNING: Will overwrite script files on target.')
	.argument('<from>', "The product to sync from.")
	.argument('<to>', "The product to sync to.")

	.action(async (from, to, options) => {
		try {
			const sourceAlias = options.source
			const targetAlias = options.destination
			const shouldCopyFiles = options.files ?? false
			const shouldCopyWorksheets = options.worksheets ?? false
			const shouldCopyScripts = options.scripts ?? false

			const sourceContext = await useProductApi(sourceAlias)
			const targetContext = await useProductApi(targetAlias)

			const queries = useProductQueries(sourceContext)
			const targetQueries = useProductQueries(targetContext)
			const mutations = useProductMutations(targetContext)

			info(`graph:product:sync`, `Fetch product ${chalk.bold(from)} from tenant ${chalk.bold(sourceAlias)}.`)
			const product = await queries.fetchProduct(from)

			info(`graph:product:sync`, `Fetch product ${chalk.bold(to)} from tenant ${chalk.bold(targetAlias)}.`)
			const destinationProduct = await targetQueries.fetchProduct(to)

			if (product.representation) {
				await mutations.updateProductRepresentation(destinationProduct, product.representation)
			}

			if (product.scripts) {
				await copyScripts(`graph:product:copy`, sourceAlias, targetAlias, product, destinationProduct, shouldCopyFiles, shouldCopyWorksheets, shouldCopyScripts)
			}

			if (product.productTreeId) {
				const newRoot = await copyProductTree(queries, mutations, product, destinationProduct)
				await copyProductSchema(queries, mutations, product, destinationProduct, newRoot)
			}

			success(`graph:product:sync`, `Product ${chalk.bold(from)} synced to ${chalk.bold(to)}.`)

			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program.parse()
