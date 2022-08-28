#!/usr/bin/env node
import { Command } from 'commander'
import { getConfig, writeConfig } from './src/config/config.mjs'
import { chalk } from 'zx'
import { exit } from 'node:process'
import {fetchNewToken} from "./src/login/login.mjs";

const program = new Command()

program
	.command('login', 'Configure a new environment')
	.argument('<alias>', 'Tenant alias')
	.action(async (alias) => {
		const config = await getConfig()
		const tenants = config?.tenants ?? {}

		if (tenants[alias]) {
			const tenant = tenants[alias]
			const envName = tenant.environment
			const env = config.environments[envName]

			if (!env) {
				console.error(chalk.bold.red(`Environment \`${envName}\` not found!`))
				exit(1)
			}

			const token = await fetchNewToken(env, tenant)
			config.login = {
				tenant: alias,
				token: token
			}

			await writeConfig(config)

			console.log(chalk.green(`Logged in as ${alias} with token \`${token}\`.`))
			exit(0)
		}

		console.error(chalk.bold.red(`Tenant \`${alias}\` not found!`))
		exit(1)
	})

program.parse()