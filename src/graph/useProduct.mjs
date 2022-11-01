import { chalk } from 'zx'
import { exit } from 'node:process'
import cliProgress from 'cli-progress'
import { debug, error } from '../log.mjs'

function generateId() {
	return [...Array(8)].map(() => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).join("")
}

export const useProductQueries = (apiContext) => {
	async function fetchProduct(productId) {
		try {
			const [plan, name, version] = productId.split('/')
			const result = await apiContext.fetchProduct(plan, name, version)
			handleApiMessageError(`query:fetchProduct`, result.data)

			const product = result.data.data?.products?.list?.[0]
			if (!product) {
				error(`query:fetchProduct`, `Product ${chalk.bold(productId)} not found.`)
				exit(1)
			}

			return product
		} catch (e) {
			handleErrorResponse('query:fetchProduct', error)
		}
	}

	async function fetchProductTree(product) {
		try {
			const result = await apiContext.fetchProductTreeNodes(product.productTreeId)
			handleApiMessageError('query:fetchProductTree', result.data)
			return result.data.data.listNodes
		} catch (error) {
			handleErrorResponse('query:fetchProductTree', error)
		}
	}

	async function fetchProductSchema(productTreeId) {
		try {
			const result = await apiContext.fetchProductSchema(productTreeId)
			handleApiMessageError('query:fetchProductSchema', result.data)
			return result.data.data.productSchema
		} catch (e) {
			handleErrorResponse('query:fetchProductSchema', e)
		}
	}

	function fetchAllNodeTypes() {
		try {
			return apiContext.fetchAllNodeTypes()
		} catch (e) {
			handleErrorResponse('query:fetchAllNodeTypes', e)
		}
	}

	return {
		fetchProduct,
		fetchProductTree,
		fetchProductSchema,
		fetchAllNodeTypes
	}
}

export function handleErrorResponse(command, queryError) {
	error(command, 'Unexpected Error.')
	if (queryError.response) {
		debug(`status`, queryError.response.status, { indent: true })
		debug(`response data`, JSON.stringify(queryError.response.data, null, 2), { newline: true, indent: true })
		debug(`response headers`, JSON.stringify(queryError.response.headers, null, 2), { newline: true, indent: true })
	} else if (queryError.request) {
		debug(`request`, JSON.stringify(queryError.request, null, 2), { newline: true, indent: true })
	} else {
		debug(`error`, queryError.message, { indent: true })
	}

	if (queryError.config) {
		const data = JSON.parse(queryError.config.data)
		debug(`query`, data.query, { newline: true, indent: true })
		debug(`variables`, JSON.stringify(data.variables, null, 2), { newline: true, indent: true })
		debug(`request headers`, JSON.stringify(queryError.config.headers, null, 2), { newline: true, indent: true })
	}
}

export function handleApiMessageError(command, data) {
	if (data.errors) {
		data.errors.forEach((apiError) => {
			error(command, apiError.message)
		})
		process.exit(1)
	}
}

export const useProductMutations = (apiContext) => {
	async function createProduct(product) {
		try {
			const result = await apiContext.createProduct(product)
			handleApiMessageError('mutation:createProduct', result.data)
			return result.data.data.createProduct
		} catch (error) {
			handleErrorResponse('mutation:createProduct', error)
			exit(1)
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

	function generateChildren(parent, tree) {
		return tree
			.filter(node => node.parent?.id === parent.id)
			.map(node => {
				const id = generateId()
				const { ref, alias, type, fields } = node
				return {
					id,
					ref,
					alias,
					type,
					fields,
					children: generateChildren(node, tree)
				}
			})
	}

	async function createProductTree(productTree) {
		const newRootId = generateId()
		const [firstNode, ...rest] = productTree
		try {
			const result = await apiContext.createNode(
				newRootId,
				firstNode.ref,
				firstNode.type,
				firstNode.alias,
				generateChildren(firstNode, rest),
				firstNode.fields ?? [
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
			handleApiMessageError('mutation:createProductTree', result.data)
			return result.data.data.createNode
		} catch (e) {
			handleErrorResponse(`mutation:createProductTree`, e)
		}

		return newRootId
	}

	async function updateProductTreeIdOnProduct(product, productTreeId) {
		try {
			const result = await apiContext.updateProductTreeId(product.productId, productTreeId)

			handleApiMessageError('mutation:updateProductTreeIdOnProduct', result.data)
			return result.data.data?.updateProduct?.productTreeId
		} catch (e) {
			handleErrorResponse('mutation:updateProductTreeIdOnProduct', e)
		}
	}

	async function createProductDataSchema(productTreeId, dataSchema) {
		try {
			const result = await apiContext.createProductSchema(productTreeId, dataSchema)
			handleApiMessageError('mutation:createProductDataSchema', result.data)
			return result.data.data.createProductSchema.value
		} catch (e) {
			handleErrorResponse('mutation:updateProductTreeIdOnProduct', e)
		}
	}

	async function createProductUiDataSchema(productSchemaId, productTreeId, schema) {
		try {
			const result = await apiContext.createUiProductSchema(productSchemaId, productTreeId, schema)
			handleApiMessageError('mutation:createProductUiDataSchema', result.data)
			return result.data.data.addUiSchemaToProductSchema.status
		} catch (e) {
			handleErrorResponse('mutation:createProductUiDataSchema', e)
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