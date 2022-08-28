import gql from "graphql-tag"
import { print } from "graphql"
import axios from "axios"

export async function exportProductBuilderTree(nodeId, token, endpoint) {
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
					parentNodeId: nodeId
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

export async function exportProductBuilderTypes(token, endpoint) {
	const query = gql`
		query {
			nodeTypes {
				id
				ref
				alias
				type
				parent {
					id
				}
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

	try {
		const response = await axios.post(
			endpoint,
			{
				query: print(query)
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		return response.data.data.nodeTypes
	} catch (e) {
		console.error(e)
	}
}