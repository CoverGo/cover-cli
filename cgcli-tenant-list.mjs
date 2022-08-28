#!/usr/bin/env node
import { Command } from 'commander'
import { chalk } from 'zx'
import { getConfig } from './src/config/config.mjs'
const program = new Command()

program
	.command('list', 'List tenants')
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

program.parse()