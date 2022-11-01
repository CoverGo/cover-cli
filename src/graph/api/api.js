import axios from 'axios'
import { print } from 'graphql'

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
	return async function request(query, variables = undefined) {
		const payload = variables ? { query: print(query), variables } : { query: print(query) }

		return await axios.post(
			getGraphEndpoint(environment.endpoint),
			payload,
			{
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		)
	}
}