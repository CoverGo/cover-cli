import { chalk } from 'zx'
import { exit } from 'node:process'
import cliProgress from 'cli-progress'
import { handleExceptionInQuery } from './api/api.js'

function generateId() {
	return [...Array(8)].map(() => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).join("")
}

export const useProductQueries = (apiContext) => {
	async function fetchProduct(productId) {
		try {
			const [plan, name, version] = productId.split('/')
			const product = await apiContext.fetchProduct(plan, name, version)
			if (!product) {
				console.log(chalk.red(`Product \`${productId}\` not found.`))
				exit(1)
			}

			return product
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	function fetchProductTree(product) {
		try {
			return apiContext.fetchProductTreeNodes(product.productTreeId)
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	function fetchProductSchema(productTreeId) {
		try {
			return apiContext.fetchProductSchema(productTreeId)
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	function fetchAllNodeTypes() {
		try {
			return apiContext.fetchAllNodeTypes()
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	return {
		fetchProduct,
		fetchProductTree,
		fetchProductSchema,
		fetchAllNodeTypes
	}
}

export const useProductMutations = (apiContext) => {
	function createProduct(product) {
		try {
			return apiContext.createProduct(product)
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	async function createNodeTypes(productNodeTypes) {
		const totalQueries = productNodeTypes.length

		try {
			if (productNodeTypes.length) {
				console.log('')
				const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
				bar.start(totalQueries, 0)

				let completed = 0

				// make sure we execute these one at a time, do not spam the server with requests
				for (const type of productNodeTypes) {
					await apiContext.createNodeType(type)

					completed++
					bar.update(completed)
				}

				bar.stop()
			}
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	async function createProductTree(productTree) {
		const totalQueries = productTree.length + productTree.reduce((acc, cur) => acc + cur?.fields?.length ?? 0, 0)
		const idMap = {}
		let rootNode = null

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

					await apiContext.createNode(
						id,
						node.ref,
						node.type,
						node.alias,
						node?.parent?.id ? { parentId: idMap[node.parent.id] } : null,
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
						await apiContext.attachFieldResolver(idMap[node.id], field.ref, field.resolver.text, field.resolver.language)
						completed++
						bar.update(completed)
					}
				}

				bar.stop()
			}
		} catch (e) {
			console.error(chalk.red(`Failed to create product tree. Product has not been created. Try again and if the problem persists, contact support.`))
			handleExceptionInQuery(e)
		}

		console.log('')
		console.log(chalk.green(`${chalk.bold('Newly created root node:')} ${rootNode}`))

		return rootNode
	}

	function updateProductTreeIdOnProduct(product, productTreeId) {
		try {
			return apiContext.updateProductTreeId(product.productId, productTreeId)
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	function createProductDataSchema(productTreeId, dataSchema) {
		try {
			return apiContext.createProductSchema(productTreeId, dataSchema)
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	function createProductUiDataSchema(productSchemaId, productTreeId, schema) {
		try {
			return apiContext.createUiProductSchema(productSchemaId, productTreeId, schema)
		} catch (e) {
			handleExceptionInQuery(e)
		}
	}

	return {
		createProduct,
		createProductTree,
		updateProductTreeIdOnProduct,
		createProductDataSchema,
		createProductUiDataSchema,
		createNodeTypes,
	}
}