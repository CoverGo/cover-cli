#!/usr/bin/env node

import { Command } from 'commander'
import { getConfig, writeConfig } from './src/config/config.mjs'
import { chalk, question } from 'zx'
import { exit } from 'node:process'
import { error, info, success, warn } from './src/log.mjs'

const program = new Command()

program.name('covergo tenant')

program
	.command('create')
	.description('Create a new tenant.')
	.argument('<name>', 'The name you want to use when referencing this tenant in other commands.')
	.option('-c, --client-id <client id>', 'The client id to use when authenticating with this tenant.', 'covergo_crm')
	.option('-y, --yes', 'Skip confirmation prompts.')
	.requiredOption('-e, --env <environment>', 'Environment this tenant belongs to.')
	.requiredOption('-t, --tenant-id <tenant id>', 'Tenant ID to authenticating with this tenant.')
	.requiredOption('-u, --username <username>', 'Username to get access token for this tenant.')
	.requiredOption('-p, --password <password>', 'Password to get access token for this tenant.')
	.action(async (name, options) => {
		const config = await getConfig()
		if (!config.environments?.[options.env]) {
			error(`tenant:create`, `Unable to find environment ${chalk.bold(options.env)}, check the environments listed in ${chalk.bold('covergo env list')}.`)
			exit(1)
		}

		const { tenantId, clientId, username, password, env } = options
		const inputs = { tenantId, clientId, username, password, environment: env }

		if (!options.yes) {
			info(`tenant:create`, `Tenant ID: ${tenantId}`)
			info(`tenant:create`, `Client ID: ${clientId}`)
			info(`tenant:create`, `Username: ${username}`)
			info(`tenant:create`, `Password: ${password}`)
			info(`tenant:create`, `Environment: ${env}`)

			const confirmation = await question(`Create ${chalk.bold(name)}? ${chalk.bold(`(y/n)`)} `)
			if (confirmation.toLowerCase() !== 'y') {
				exit(1)
			}
		}

		const tenants = config?.tenants ?? {}
		tenants[name] = inputs
		config.tenants = tenants
		await writeConfig(config)

		success(`tenant:create`, `New tenant ${chalk.bold(name)} created!`)
		exit(0)
	})

program
	.command('list')
	.description('List configured tenants.')
	.option('-e --env <env>', 'Filter to show tenants belonging to this environment.', )
	.action(async (options) => {
		const config = await getConfig()

		const tenants = config?.tenants ?? {}
		for (const [key, value] of Object.entries(tenants)) {
			if (options.env) {
				if (value.environment === options.env) {
					console.log(key)
				}
			} else {
				console.log(key)
			}
		}
	})

program
	.command('delete')
	.description('Delete a tenant configuration.')
	.option('-y, --yes', 'Skip prompt for confirmation before deletion.')
	.argument('<name>', 'The name of the environment you want information on')
	.action(async (name, options) => {
		const config = await getConfig()

		if (config.tenants?.[name]) {
			if (!options.yes) {
				const confirmation = await question(`Remove ${chalk.bold(name)} from tenants? ${chalk.bold(`(y/n)`)} `)
				if (confirmation.toLowerCase() !== 'y') {
					exit(1)
				}
			}

			delete config.tenants[name]
			await writeConfig(config)
			warn(`tenant:delete`, `Tenant ${chalk.bold(name)} deleted.`)
			exit(0)
		}

		error(`tenant:delete`, `Unable to find tenant ${chalk.bold(name)}.`)

		exit(1)
	})

program
	.command('info')
	.description('Show stored information about tenant.')
	.argument('<name>', 'The name of the tenant.')
	.action(async (name) => {
		const config = await getConfig()
		const tenants = config?.tenants ?? {}

		if (tenants[name]) {
			const tenant = tenants[name]

			console.log(tenant?.tenantId)
			console.log(tenant?.clientId)
			console.log(tenant?.username)
			console.log(tenant?.password)
			console.log(tenant?.environment)

			exit(0)
		}

		error(`tenant:info`, `Unable to find tenant ${chalk.bold(name)}.`)
		exit(1)
	})

program.parse()