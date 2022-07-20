import { gql } from "graphql-request";
import axios from "axios";

export async function exportProductBuilderTree(nodeId, options) {
	const token = options.token
	const endpoint = options.endpoint

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

		console.log(JSON.stringify(response.data.data.listNodes))
	}
	catch (e) {
		console.error(e)
	}
}

export async function exportProductBuilderTypes(options) {
	const token = options.token
	const endpoint = options.endpoint

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
		});

		console.log(JSON.stringify(response.data.data.nodeTypes))
	}
	catch (e) {
		console.error(e)
	}
}