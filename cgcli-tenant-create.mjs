#!/usr/bin/env node
import { Command } from 'commander'
import { stringify } from 'yaml'
import { $, chalk, question } from 'zx'
import { z } from 'zod'
import { exit } from 'node:process'
import { getConfig, writeConfig } from './src/config/config.mjs'
import { displayValidationErrors } from './src/validation/error.mjs'
const program = new Command()

program
	.command('create', 'Configure a new tenant')
	.argument('<alias>', 'The alias you want to use when referencing this tenant in other commands')
	.argument('<env>', 'The environment this tenant relates to')
	.option('-t, --tenant-id <tenant id>', 'The configured tenant id')
	.option('-y, --yes', 'Do not prompt for confirmation before creation')
	.option('-u, --username <username>', 'Username used to get access token for this tenant')
	.option('-p, --password <password>', 'Password used to get access token for this tenant')
	.option('-c --client-id <client id>', 'The client id to use when accessing this client', 'covergo_crm')
	.action(async (alias, env, options) => {
		const config = await getConfig()
		if (!config.environments?.[env]) {
			console.error(chalk.bold.red(`Unable to find environment \`${env}\`, check the environments listed in \`cgcli config env list\`.`))
			exit(1)
		}

		const tenantId = options.tenantId
			? options.tenantId
			: await question(chalk.bold.blue(`What is this tenants ID? `))

		const username = options.username
			? options.username
			: await question(chalk.bold.blue(`What is this tenants login? `))

		const password = options.password
			? options.password
			: await question(chalk.bold.blue(`What is the password for this login? `))

		const clientId = options.clientId

		const validation = z.object({
			tenantId: z.string().min(1),
			username: z.string().min(1),
			password: z.string().min(1),
			clientId: z.string().min(1),
		})

		const inputs = {
			tenantId,
			username,
			password,
			clientId
		}

		try {
			validation.parse(inputs)
		} catch (e) {
			displayValidationErrors(e.issues)
			exit(1)
		}

		if (!options.yes) {
			console.log(chalk.green(`${chalk.bold('Tenant ID')}: ${tenantId}`))
			console.log(chalk.green(`${chalk.bold('Client ID')}: ${clientId}`))
			console.log(chalk.green(`${chalk.bold('Username')}: ${username}`))
			console.log(chalk.green(`${chalk.bold('Password')}: ${password}`))
			console.log(chalk.green(`${chalk.bold('Environment')}: ${env}`))

			const confirmation = await question(`(y/n) Do you wish to create this tenant? `)
			if (confirmation.toLowerCase() !== 'y') {
				exit(1)
			}
		}

		const tenants = config?.tenants ?? {}
		tenants[alias] = { ...inputs, environment: env }
		config.tenants = tenants
		await writeConfig(config)

		console.log('')
		console.log(chalk.green.bold(`New tenant \`${alias}\` created!`))
		console.log(chalk.green(stringify(tenants[alias])))
		exit(0)
	})

program.parse()