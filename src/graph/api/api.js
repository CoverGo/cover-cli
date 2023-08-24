import axios from "axios"
import { print } from "graphql"

export function getGraphEndpoint(endpoint) {
	return `${endpoint}/graphql`
}

// Helps to avoid issue when user defined tenant with graphql in api url
function getRestEndpoint(endpoint, query) {
	return `${endpoint.endsWith("/graphql") ? endpoint.slice(0, -8) : endpoint}/api/v1/${query}`
}

export function createRestGetRequest(environment, token) {
	return async function request(query) {
		return await axios.get(getRestEndpoint(environment.endpoint, query), {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
	}
}
export function createRestPostRequest(environment, token) {
	return async function request(query, data) {
		return await axios.post(getRestEndpoint(environment.endpoint, query), data, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
	}
}

export function createRequest(environment, token) {
	return async function request(query, variables = undefined) {
		const payload = variables ? { query: print(query), variables } : { query: print(query) }

		return await axios.post(getGraphEndpoint(environment.endpoint), payload, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
	}
}
