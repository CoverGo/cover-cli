import gql from 'graphql-tag'
import { createRequest } from './api.js'
import { getTenantWithEnvironment } from '../../config/config.mjs'
import { fetchNewToken } from '../../login/login.mjs'

export async function useProductApi(alias) {
	const tenant = await getTenantWithEnvironment(alias)
	const token = await fetchNewToken(tenant.environment, tenant)
	const request = createRequest(tenant.environment, token)

	async function fetchAllNodeTypes() {
		const query = gql`
			query nodeTypes {
				nodeTypes {
					id
					ref
					alias
					type
					fields {
						ref
						alias
						type
						resolver {
							text
							language
						}
					}
				}
			}
		`

		return await request(query)
	}

	async function createNodeType(nodeType) {
		const query = gql`
			mutation importNodeType($typeName: String!, $fields: [NodeFieldInput!]) {
				defineNodeType(typeName: $typeName, fields: $fields)
			}
		`

		const fields = (nodeType.fields ?? [])
			.map(field => {
				const resolver = field?.resolver
					? {
						text: field.resolver.text,
						language: field.resolver.language
					}
					: {
						text: "",
						language: "CONSTANT"
					}

				return {
					ref: field.ref,
					type: field.type,
					alias: field.alias,
					resolver
				}
			})

		const variables = {
			typeName: nodeType.type,
			fields: fields
		}

		return await request(query, variables)
	}

	async function createProduct(product) {
		const query = gql`
			mutation createProduct(
				$productId: productIdInput!,
				$lifecycleStage: String = null,
				$productTreeId: String = null,
				$name: String!,
				$productIdKey: String!,
			) {
				createProduct(product: {
					productId: $productId,
					lifecycleStage: $lifecycleStage,
					productTreeId: $productTreeId
				}) {
					productId {
						plan
						type
						version
					}
					name
					lifecycleStage
					productTreeId
				}
				upsertL10n(l10n: {
					locale: "en-US",
					key: $productIdKey,
					value: $name
				}) {
					status
					errors
				}
			}
		`

		return await request(query, {
			...product,
			productIdKey: `products-${product.productId.plan}|${product.productId.version}|${product.productId.type}-name`
		})
	}

	async function createNode(id, ref, type, alias, children, fields) {
		const query = gql`
			mutation importNode(
				$id: ID!,
				$ref: String!,
				$type: String!,
				$alias: String!,
				$children: [CreateNodeInput!],
				$fields: [NodeFieldInput!],
			) {
				createNode(node: {
					id: $id
					ref: $ref
					type: $type
					alias: $alias
					children: $children,
					fields: $fields
				})
			}
		`

		const variables = {
			id,
			ref,
			type,
			alias,
			children,
			fields
		}

		return await request(query, variables)
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

		return await request(query, variables)
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

		return await request(query, variables)
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
					name
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

		const variables = {
			where: {
				productId: {
					plan,
					type,
					version
				}
			}
		}

		return await request(query, variables)
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

		return await request(query, variables)
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

		return await request(query, variables)
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
			productSchemaId,
			name: productTreeId,
			schema: schema,
		}

		return await request(query, variables)
	}

	return {
		createProduct,
		updateProductTreeId,
		fetchProductTreeNodes,
		fetchProduct,
		createNode,
		createProductSchema,
		createUiProductSchema,
		fetchProductSchema,
		fetchAllNodeTypes,
		createNodeType,
	}
}