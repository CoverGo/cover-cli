import axios from 'axios'
import { print } from 'graphql'
import { chalk } from 'zx'
import { exit } from 'node:process'

export class QueryError extends Error {
	query = ''
	variables = {}

	constructor(message, query, variables) {
		super(message)
		this.query = query
		this.variables = variables
	}
}

export function handleExceptionInQuery(e) {
	console.log('')
	console.log('')
	console.log(chalk.red(e.message))

	if (e instanceof QueryError) {
		console.log('')
		console.log(chalk.blue(e.query))
		console.log(chalk.blue(JSON.stringify(e.variables)))
	}

	exit(1)
}

export function createRequest(environment, token) {
	return async function request(query, variables = undefined) {
		const payload = variables ? { query: print(query), variables } : { query: print(query) }

		const response = await axios.post(
			environment.endpoint,
			payload,
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
}