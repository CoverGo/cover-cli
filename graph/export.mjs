import gql from "graphql-tag"
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

	const headers = {
		Authorization: `Bearer ${token}`,
	}

	try {
		const graphqlQuery = {
			query,
			variables: {
				parentNodeId: nodeId
			}
		}

		const response = await axios({
			url: endpoint,
			method: 'post',
			headers: headers,
			data: graphqlQuery
		})

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

	const headers = {
		Authorization: `Bearer ${token}`,
	}

	try {
		const graphqlQuery = {
			query,
			variables: {}
		};

		const response = await axios({
			url: endpoint,
			method: 'post',
			headers: headers,
			data: graphqlQuery
		})

		return response.data.data.nodeTypes
	}
	catch (e) {
		console.error(e)
	}
}