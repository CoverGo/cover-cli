#!/usr/bin/env node

import { Command } from 'commander'
import { getConfig, writeConfig } from './src/config/config.mjs'
import { chalk, question } from 'zx'
import { exit } from 'node:process'
import { z } from 'zod'
import { displayValidationErrors } from './src/validation/error.mjs'
const program = new Command()

program
	.command('config')
	.description('Configure a new tenant')
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
			console.error(chalk.bold.red(`Unable to find environment \`${env}\`, check the environments listed in \`cgcli env list\`.`))
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
			console.log(chalk.blue(`${chalk.bold('Tenant ID')}: ${tenantId}`))
			console.log(chalk.blue(`${chalk.bold('Client ID')}: ${clientId}`))
			console.log(chalk.blue(`${chalk.bold('Username')}: ${username}`))
			console.log(chalk.blue(`${chalk.bold('Password')}: ${password}`))
			console.log(chalk.blue(`${chalk.bold('Environment')}: ${env}`))

			const confirmation = await question(`Do you wish to create this tenant? ${chalk.bold(`(y/n)`)} `)
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
		exit(0)
	})

program
	.command('list')
	.description('List tenants')
	.option('-e --env <env>', 'Only show tenants belonging to this environment', )
	.action(async (options) => {
		const config = await getConfig()

		const tenants = config?.tenants ?? {}
		for (const [key, value] of Object.entries(tenants)) {
			if (options.env) {
				if (value.environment === options.env) {
					console.log(chalk.blue(key))
				}
			} else {
				console.log(chalk.blue(key))
			}
		}
	})

program
	.command('delete')
	.description('Delete a tenant configuration')
	.option('-y, --yes', 'Do not prompt for confirmation before deletion')
	.argument('<alias>', 'The alias of the environment you want information on')
	.action(async (alias, options) => {
		const config = await getConfig()

		if (config.tenants?.[alias]) {
			if (!options.yes) {
				const confirmation = await question(`Do you wish to remove \`${alias}\` from configured tenants? ${chalk.bold(`(y/n)`)} `)
				if (confirmation.toLowerCase() !== 'y') {
					exit(1)
				}
			}

			delete config.tenants[alias]
			await writeConfig(config)
			console.log(chalk.green.bold(`Tenant \`${alias}\` deleted!`))
			exit(0)
		}

		console.error(chalk.bold.red(`Unable to find tenant \`${alias}\`.`))

		exit(1)
	})

program
	.command('info')
	.description('show stored information about tenant')
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