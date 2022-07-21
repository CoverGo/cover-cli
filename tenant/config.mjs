import * as fs from 'node:fs/promises';
import {getConfigForTenant} from "./file.mjs";
import {gql} from "graphql-request";
import axios from "axios";

class ConfigNotExistsError extends Error {
	constructor(alias, path) {
		super(`Config for alias \`${alias}\` at expected path \`${path}\` does not exist.`)
	}
}

async function saveConfig(name, content) {
	const path = await getConfigForTenant(name)
	await fs.writeFile(path, content)
	return path
}

export async function createConfig(name, config) {
	const {
		tenantId: TENANT_ID,
		username: USERNAME,
		password: PASSWORD,
		endpoint: ENDPOINT,
		clientId: CLIENT_ID = "covergo_crm",
	} = config

	const env = {
		TENANT_ID,
		USERNAME,
		PASSWORD,
		CLIENT_ID,
		ENDPOINT,
	}

	let line = []
	for (const entry of Object.entries(env)) {
		line.push(entry.join('='))
	}

	return await saveConfig(name, line.join("\n"))
}

export async function fetchNewToken(name) {
	const config = await getConfig(name)
	const query = gql`
		query token($tenantId: String!, $clientId: String!, $username: String!, $password: String!) {
			token_2(
				tenantId: $tenantId,
				clientId: $clientId,
				username: $username,
				password: $password
			){
				accessToken
			}
		}
	`

	try {
		const graphqlQuery = {
			query,
			variables: {
				tenantId: config.TENANT_ID,
				clientId: config.CLIENT_ID,
				username: config.USERNAME,
				password: config.PASSWORD
			}
		}

		const response = await axios({
			url: config.ENDPOINT,
			method: 'post',
			data: graphqlQuery
		})

		return response.data.data.token_2.accessToken
	}
	catch (e) {
		console.error(e)
	}
}

export async function saveToken(name, token) {
	const config = await readConfig(name)
	const lines = config.split("\n").filter(line => line)

	const excludingToken = lines.filter(line => {
		const [key] = line.split("=")
		return key !== "TOKEN"
	})

	excludingToken.push(`TOKEN=${token}`)
	await saveConfig(name, excludingToken.join("\n"))
}

export async function readConfig(name) {
	const path = await getConfigForTenant(name)

	try {
		await fs.access(path)
	} catch {
		throw new ConfigNotExistsError(name, path)
	}

	return await fs.readFile(path, 'utf8')
}

export async function getConfig(name) {
	const contents = await readConfig(name)
	return contents.split("\n")
		.filter(line => line)
		.reduce((acc, line) => {
			const [key, value] = line.split('=')
			acc[key] = value
			return acc
		}, {})
}
