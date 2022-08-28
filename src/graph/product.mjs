import gql from 'graphql-tag'
import { print } from 'graphql'
import axios from 'axios'
import cliProgress from 'cli-progress'

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

		const response = await axios.post(endpoint, {
			query: print(query),
			variables: {
				...product,
			}
		}, {
			headers: {
				Authorization: `Bearer ${token}`,
			}
		})

		if (response.data.errors) {
			throw new Error(response.data.errors?.[0].message)
		}

		return response.data.data.createProduct
	}

	// async function defineType() {
	// 	const quye
	// }

	async function createNode(id, ref, alias, position, fields) {
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
					alias,
					position,
					fields,
					type: 'string'
				}
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (response.data.errors) {
			throw new Error(response.data.errors?.[0].message)
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

		const response = await axios.post(
			endpoint,
			{
				query: print(query),
				variables: {
					nodeId,
					fieldName,
					text,
					language
				}
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (response.data.errors) {
			throw new Error(response.data.errors?.[0].message)
		}

		return response.data.data.attachFieldResolver
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

		try {
			const response = await axios.post(
				endpoint,
				{
					query: print(query),
					variables: {
						parentNodeId: productTreeId
					}
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					}
				}
			)

			return response.data.data.listNodes
		}
		catch (e) {
			console.error(e)
		}
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

	return {
		createProduct,
		fetchProductTreeNodes,
		fetchProduct,
		createNode,
		attachFieldResolver,
	}
}