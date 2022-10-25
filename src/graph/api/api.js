import axios from 'axios'
import { print } from 'graphql'
import { chalk } from 'zx'
import { exit } from 'node:process'
import axiosDebug from 'axios-debug-log'

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

export function getGraphEndpoint(endpoint) {
	return `${endpoint}/graphql`
}

export function createRestGetRequest(environment, token) {
	return async function request(query) {
		return await axios.get(
			`${environment.endpoint}/api/v1/${query}`,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		)
	}
}
export function createRestPostRequest(environment, token) {
	return async function request(query, data) {
		return await axios.post(
			`${environment.endpoint}/api/v1/${query}`,
			data,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		)
	}
}

export function createRequest(environment, token) {
	const instance = axios.create({ baseURL: getGraphEndpoint(environment.endpoint) })
	axiosDebug({
		request: function (debug, config) {
			debug(`${chalk.greenBright('url')}: ${config.url}`)
			debug(`${chalk.greenBright('authorization')}: ${config.headers['Authorization']}`)
			debug(`${chalk.greenBright('query')}: ${config.data.query}`)
			debug(`${chalk.greenBright('variables')}: ${JSON.stringify(config.data.variables, null, 2)}`)
		},
		response: function (debug, response) {
			debug(`${chalk.greenBright('data:')} ${JSON.stringify(response.data.variables, null, 2)}`)
		},
		error: function (debug, error) {
			if (error.response) {
				debug(`${chalk.redBright('data')}: ${error.response.data}`)
				debug(`${chalk.redBright('status')}: ${error.response.status}`)
				debug(`${chalk.redBright('headers')}: ${error.response.headers}`)
			} else if (error.request) {
				debug(`${chalk.redBright('request')}: ${JSON.stringify(error.request, null, 2)}`)
			} else {
				debug(`${chalk.redBright('general error')}: ${error.message}`)
			}
		}
	})

	return async function request(query, variables = undefined) {
		const payload = variables ? { query: print(query), variables } : { query: print(query) }

		const response = await instance.post('', payload, {
			headers: {
				Authorization: `Bearer ${token}`
			}
		})

		const errorMessage = response.data?.errors?.[0]?.message
		if (errorMessage) {
			throw new QueryError(errorMessage.trim(), print(query), variables)
		}

		return response.data.data
	}
}