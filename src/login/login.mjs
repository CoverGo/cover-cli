import gql from 'graphql-tag'
import { print } from 'graphql'
import axios from 'axios'
import {chalk} from "zx";
import {exit} from "node:process";

export async function fetchNewToken(environment, tenant) {
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
		const response = await axios.post(environment.endpoint, {
			query: print(query),
			variables: {
				tenantId: tenant.tenantId,
				clientId: tenant.clientId,
				username: tenant.username,
				password: tenant.password,
			}
		})

		const token = response.data.data?.token_2?.accessToken
		if (!token) {
			console.log(chalk.red(`Couldn't get token`))
			exit(1)
		}

		return token
	}
	catch (e) {
		console.error(e)
	}
}