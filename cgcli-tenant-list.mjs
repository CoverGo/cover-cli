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