import axios from "axios"
import gql from "graphql-tag"

function generateTypeQueries(types) {
	return types.map(type => {
		const fields = type.fields ? type.fields : []
		return `mutation importType {
			defineNodeType(typeName: "${type.type}", fields: [
				${fields.map(field => {
					let resolver = null
					if (field?.resolver) {
						resolver = `{
								text: "${JSON.stringify(field.resolver.text).slice(1, -1)}"
								language: ${field?.resolver?.language ?? "CONSTANT"}
							}`
						}
		
					return `
						{
							ref: "${field.ref}"
							type: "${field.type}"
							alias: "${field.alias}"
							resolver: ${resolver}
						}
					`
				})}
			])
		}`
	})
}

function generateId() {
	return [...Array(8)].map(() => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)).join("")
}

function generateNodeQueries(nodes) {
	const idMap = {}
	let rootNode = null

	const generated = nodes.map(node => {
		const id = generateId()
		if (!rootNode) {
			rootNode = id
		}

		idMap[node.id] = id

		let position = ``
		if (node.parent && node.parent.id) {
			position = `position: {
				parentId: "${idMap[node.parent.id]}"
			}`
		}

		const fields = node.fields ? node.fields : []

		return [
			`mutation importNode {
				createNode(node: {
				  id: "${id}"
				  ref: "${node.ref}"
				  type: "${node.type}"
				  alias: "${node.alias}"
				  fields: [
				    {
				      type: "String"
				      ref: "meta"
				      alias: "Meta"
				      resolver: {
				        text: "",
				        language: CONSTANT
				      }
				    }
				  ]
				  ${position}
				})
			}`,
			...fields.map(field => {
				return `
					mutation attachFieldResolvers {
						attachNodeFieldResolver(
							nodeId: "${id}"
							input: {
								fieldName: "${field.ref}"
								resolver: {
									text: "${JSON.stringify(field.resolver.text).slice(1, -1)}"
									language: ${field.resolver.language}
								}
							}
						)
					}
				`
			})
		]
	}).flat()

	return {
		rootNode,
		generated
	}
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

async function executeMutation(query, token, endpoint, reties = 10) {
	while (reties > 0) {
		const response = await axios.post(
			endpoint,
			{
				query: query
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				}
			}
		)

		if (response.data.errors) {
			console.error('Error! Retrying...')
			reties--
		} else {
			return
		}
	}

	throw new Error(`Error executing query ${query}.`)
}

async function executeQueries(queries = [], token, endpoint) {
	console.log(`Executing ${queries.length} queries...`)
	let number = 1
	for (const query of queries) {
		console.log(`${((number / queries.length) * 100).toFixed(2)}%`)
		await executeMutation(query, token, endpoint)
		await sleep(400)
		number++
	}
	console.log(`Done!`)
}

export async function importTypes(types, token, endpoint) {
	const converted = generateTypeQueries(types)
	await executeQueries(converted, token, endpoint)
}

export async function importNodes(nodes, token, endpoint) {
	const { rootNode, generated } = generateNodeQueries(nodes)
	await executeQueries(generated, token, endpoint)

	return rootNode
}
