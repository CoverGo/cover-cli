#!/usr/bin/env node
import { Command } from 'commander'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { getConfig } from './src/config/config.mjs'

const program = new Command()

program
	.command('info', 'Show information about this environment')
	.argument('<alias>', 'The alias of the environment you want information on')
	.action(async (alias) => {
		const config = await getConfig()
		const tenants = config?.tenants ?? {}

		if (tenants[alias]) {
			const tenant = tenants[alias]
			console.log(chalk.blue(`${chalk.bold('Tenant ID')}: ${tenant?.tenantId ?? ''}`))
			console.log(chalk.blue(`${chalk.bold('Client ID')}: ${tenant?.clientId ?? ''}`))
			console.log(chalk.blue(`${chalk.bold('Username')}: ${tenant?.username ?? ''}`))
			console.log(chalk.blue(`${chalk.bold('Password')}: ${tenant?.password ?? ''}`))
			console.log(chalk.blue(`${chalk.bold('Environment')}: ${tenant?.environment ?? ''}`))

			exit(0)
		}

		console.error(chalk.bold.red(`Tenant \`${alias}\` not found!`))
		exit(1)
	})

program.parse()