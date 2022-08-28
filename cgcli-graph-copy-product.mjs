#!/usr/bin/env zx
import { Command } from 'commander'
import { getTenantWithEnvironment } from './src/config/config.mjs'
import {QueryError, useGraphProduct} from './src/graph/product.mjs'
import { exit } from 'node:process'
import { fetchNewToken } from "./src/login/login.mjs"
import { chalk } from 'zx'
import cliProgress from 'cli-progress'
import {stringify} from "yaml";

const program = new Command()

function generateId() {
	return [...Array(8)].map(() => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).join("")
}

async function fetchSourceProduct(productId, sourceContext, sourceAlias) {
	const [plan, name, version] = productId.split('/')
	console.log(chalk.blue(`${chalk.bold(`1/8:`)} Fetch \`${productId}\` from tenant \`${sourceAlias}\`.`))
	const product = await sourceContext.fetchProduct(plan, name, version)
	if (!product) {
		console.log(chalk.red(`Product \`${productId}\` not found on tenant \`${sourceAlias}\`.`))
		exit(1)
	}

	return product
}

async function createTargetProduct(product, productId, targetContext, targetAlias) {
	console.log(chalk.blue(`${chalk.bold(`2/8:`)} Creating product \`${productId}\` on tenant \`${targetAlias}\`.`))
	return await targetContext.createProduct(product)
}

async function fetchSourceProductTree(product, sourceContext, sourceAlias) {
	console.log(chalk.blue(`${chalk.bold(`3/8:`)} Fetch product tree \`${product.productTreeId}\` from tenant \`${sourceAlias}\`.`))
	return await sourceContext.fetchProductTreeNodes(product.productTreeId)
}

async function createTargetProductTree(productTree, productId, targetContext, targetAlias) {
	const totalQueries = productTree.length + productTree.reduce((acc, cur) => acc + cur?.fields?.length ?? 0, 0)
	const idMap = {}
	let rootNode = null

	console.log(chalk.blue(`${chalk.bold(`4/8:`)} Copying ${totalQueries} node(s) from product \`${productId}\` to tenant \`${targetAlias}\`.`))

	try {
		if (productTree.length) {
			console.log('')
			const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
			bar.start(totalQueries, 0)

			let completed = 0

			// make sure we execute these one at a time, do not spam the server with requests
			for (const node of productTree) {
				const id = generateId()
				if (!rootNode) {
					rootNode = id
				}

				idMap[node.id] = id

				await targetContext.createNode(
					id,
					node.ref,
					node.type,
					node.alias,
					node?.parent?.id ? {parentId: idMap[node.parent.id]} : null,
					[
						{
							type: "String",
							ref: "meta",
							alias: "Meta",
							resolver: {
								text: "",
								language: "CONSTANT"
							}
						}
					]
				)

				completed++

				bar.update(completed)
				const fields = node.fields ? node.fields : []
				for (const field of fields) {
					await targetContext.attachFieldResolver(idMap[node.id], field.ref, field.resolver.text, field.resolver.language)
					completed++
					bar.update(completed)
				}
			}

			bar.stop()
		}
	} catch (e) {
		console.log('')
		console.log('')
		console.log(chalk.red(e.message))

		if (e instanceof QueryError) {
			console.log('')
			console.log(chalk.blue(e.query))
			console.log('')
			console.log(chalk.blue(JSON.stringify(e.variables)))
		}

		exit(1)
	}

	console.log('')
	console.log(chalk.green(`${chalk.bold('New root node:')} ${rootNode}`))

	return rootNode
}

async function updateProductTreeId(product, productTreeId, targetContext, targetAlias) {
	const productId =`${product.productId.plan}/${product.productId.type}/${product.productId.version}`
	console.log(chalk.blue(`${chalk.bold(`5/8:`)} Updating \`${productId}\` with productTreeId \`${productTreeId}\` on \`${targetAlias}\`.`))
	return await targetContext.updateProductTreeId(product.productId, productTreeId)
}

async function fetchProductSchema(sourceContext, productTreeId) {
	console.log(chalk.blue(`${chalk.bold(`6/8:`)} Fetching data schemas for \`${productTreeId}\`).`))
	return await sourceContext.fetchProductSchema(productTreeId)
}

async function createProductDataSchemas(targetContext, productTreeId, dataSchema) {
	console.log(chalk.blue(`${chalk.bold(`7/8:`)} Create product schema for tree \`${productTreeId}\`.`))
	return await targetContext.createProductSchema(productTreeId, dataSchema)
}

async function createProductUiDataSchemas(targetContext, productSchemaId, productTreeId, schema) {
	console.log(chalk.blue(`${chalk.bold(`8/8:`)} Create product UI schema for tree \`${productTreeId}\`.`))
	return await targetContext.createUiProductSchema(productSchemaId, productTreeId, schema)
}

program.command('product-nodes', 'Copy an entire product with data schemas, tree and nodes')
	.argument('<tenant source alias>', 'Alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'Alias of a tenant to copy node types to`')
	.argument('<productId>', 'The product id you wish to copy (name/type/version)')
	.action(async (sourceAlias, targetAlias, productId) => {
		try {
			const sourceTenant = await getTenantWithEnvironment(sourceAlias)
			const targetTenant = await getTenantWithEnvironment(targetAlias)

			const sourceToken = await fetchNewToken(sourceTenant.environment, sourceTenant)
			const targetToken = await fetchNewToken(targetTenant.environment, targetTenant)

			const sourceContext = useGraphProduct(sourceTenant.environment.endpoint, sourceToken)
			const targetContext = useGraphProduct(targetTenant.environment.endpoint, targetToken)

			const product = await fetchSourceProduct(productId, sourceContext, sourceAlias)
			const productCopy = await createTargetProduct(product, productId, targetContext, targetAlias)
			const productTree = await fetchSourceProductTree(product, sourceContext, sourceAlias)
			const rootNode = await createTargetProductTree(productTree, productId, targetContext, targetAlias)
			await updateProductTreeId(product, rootNode, targetContext, targetAlias)
			const schema = await fetchProductSchema(sourceContext, product.productTreeId)
			const schemaId = await createProductDataSchemas(targetContext, rootNode, schema.dataSchema)

			const uiSchemas = schema?.uiSchemas ?? []
			for (const uiSchema of uiSchemas) {
				if (uiSchema?.name === productCopy.productTreeId) {
					await createProductUiDataSchemas(targetContext, schemaId, rootNode, uiSchema.schema)
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