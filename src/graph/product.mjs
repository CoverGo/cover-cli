import gql from 'graphql-tag'
import { print } from 'graphql'
import axios from 'axios'
import cliProgress from 'cli-progress'

export class QueryError extends Error {
	query = ''
	variables = {}

	constructor(message, query, variables) {
		super(message)
		this.query = query
		this.variables = variables
	}
}

export function useGraphProduct(endpoint, token) {

	async function createProduct(product) {
		const query = gql`
			mutation cloneProduct(
				$productId: productIdInput!,
				$lifecycleStage: String = null,
				$productTreeId: String = null,
			) {
				createProduct(product: {
					productId: $productId,
					lifecycleStage: $lifecycleStage,
					productTreeId: $productTreeId,
				}) {
					productId {
						plan
						type
						version
					}
					lifecycleStage
					productTreeId
				}
			}
		`

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables: {
					...product,
				}
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (response.data.errors) {
			throw new QueryError(response.data.errors?.[0].message.trim(), print(query), product)
		}

		return response.data.data.createProduct
	}

	async function createNode(id, ref, type, alias, position, fields) {
		const query = gql`
			mutation importNode(
				$id: ID!,
				$ref: String!,
				$type: String!,
				$alias: String!,
				$position: NodePositionInput,
				$fields: [NodeFieldInput!]
			) {
				createNode(node: {
					id: $id
					ref: $ref
					type: $type
					alias: $alias
					position: $position
					fields: $fields
				})
			}
		`

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables: {
					id,
					ref,
					type,
					alias,
					position,
					fields
				}
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (response.data.errors) {
			throw new QueryError(response.data.errors?.[0].message)
		}

		return response.data.data.createNode
	}

	async function attachFieldResolver(nodeId, fieldName, text, language) {
		const query = gql`
			mutation attachResolver($nodeId: ID!, $fieldName: String!, $text: String!, $language: Language!) {
				attachOrReplaceNodeFieldResolver(nodeId: $nodeId, input: {
					fieldName: $fieldName,
					resolver: {
						text: $text,
						language: $language
					}
				})
			}
		`

		const variables = {
			nodeId,
			fieldName,
			text,
			language
		}

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables,
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (response.data.errors) {
			throw new QueryError(response.data.errors?.[0].message.trim(), print(query), variables)
		}

		return response.data.data.attachFieldResolver
	}

	async function updateProductTreeId(productId, productTreeId) {
		const query = gql`
			mutation updateProductTree($productId: productIdInput!, $productTreeId: String!) {
				updateProduct(productId: $productId, input: { productTreeId: $productTreeId }) {
					productTreeId
				}
			}
		`

		const variables = {
			productId,
			productTreeId
		}

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables,
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		const errorMessage = response.data?.errors?.[0]?.message
		if (errorMessage) {
			throw new QueryError(errorMessage.trim(), print(query), variables)
		}

		return response.data.data?.updateProduct?.productTreeId
	}

	async function fetchProductTreeNodes(productTreeId) {
		const query = gql`
			query listNodes($parentNodeId: ID!) {
				listNodes(parentNodeId: $parentNodeId) {
					ref
					id
					alias
					type
					parent {
						ref
						id
					}
					fields {
						ref
						alias
						type
						resolver {
							text language
						}
					}
				}
			}
		`

		const variables = {
			parentNodeId: productTreeId
		}

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		const errorMessage = response.data?.errors?.[0]?.message
		if (errorMessage) {
			throw new QueryError(errorMessage.trim(), print(query), variables)
		}

		return response.data.data.listNodes
	}

	async function fetchProduct(plan, type, version) {
		const query = gql`
			fragment result on products {
				list {
					productId {
						plan
						type
						version
					}
					lifecycleStage
					productTreeId
				}
			}

			query products($skip: Int, $limit: Int, $sort: sortInput, $where: productWhereInput, $values: [keyValueInput]) {
				products: products_2(skip: $skip, limit: $limit, sort: $sort, where: $where, values: $values) {
					...result
				}
			}
		`

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables: {
					where: {
						productId: {
							plan,
							type,
							version
						}
					}
				}
			},
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		)

		const product = response.data.data?.products?.list?.[0]
		if (product) {
			return product
		}
	}

	async function fetchProductSchema(productTreeId) {
		const query = gql`
			query productSchema($nodeId: ID!) {
				productSchema(nodeId: $nodeId) {
					id
					nodeId
					dataSchema
					uiSchemas {
						name
						schema
					}
				}
			}
		`

		const variables = {
			nodeId: productTreeId
		}

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables
			},
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		)

		const errorMessage = response.data?.errors?.[0]?.message
		if (errorMessage) {
			throw new QueryError(errorMessage.trim(), print(query), variables)
		}

		return response.data.data.productSchema
	}

	async function request(endpoint, query, variables) {
		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables
			},
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		)

		const errorMessage = response.data?.errors?.[0]?.message
		if (errorMessage) {
			throw new QueryError(errorMessage.trim(), print(query), variables)
		}

		return response.data.data
	}

	async function createProductSchema(productTreeId, dataSchema) {
		const query = gql`
			mutation updateSchema($nodeId: ID!, $dataSchema: String!) {
				createProductSchema(input: {
					nodeId: $nodeId,
					dataSchema: $dataSchema
				}) {
					value
					status
				}
			}
		`

		const variables = {
			nodeId: productTreeId,
			dataSchema
		}

		const response = await request(endpoint, query, variables)
		return response?.createProductSchema?.value
	}

	async function createUiProductSchema(productSchemaId, productTreeId, schema) {
		const query = gql`
			mutation updateSchema($productSchemaId: ID!, $name: String!, $schema: String!) {
				addUiSchemaToProductSchema(
					productSchemaId: $productSchemaId
					input: {
						name: $name,
						schema: $schema
					}
				) {
					status
					errors
				}
			}
		`

		const variables = {
			productSchemaId: productTreeId,
			name: productTreeId,
			schema: schema,
		}

		const response = await request(endpoint, query, variables)
		return response?.addUiSchemaToProductSchema?.status
	}

	return {
		createProduct,
		updateProductTreeId,
		fetchProductTreeNodes,
		fetchProduct,
		createNode,
		attachFieldResolver,
		createProductSchema,
		createUiProductSchema,
		fetchProductSchema,
	}
}