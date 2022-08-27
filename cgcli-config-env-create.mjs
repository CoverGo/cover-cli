#!/usr/bin/env node
import { Command } from 'commander'
import { chalk, question } from 'zx'
import { exit } from 'node:process'
import { z } from 'zod'
import { stringify } from 'yaml'
import { displayValidationErrors } from './src/validation/error.mjs'
import { getConfig, writeConfig } from './src/config/config.mjs'

const program = new Command()

program
	.command('create', 'Configure a new environment')
	.argument('<alias>', 'The alias you want to use when referencing this environment in other commands')
	.option('-e, --endpoint <endpoint>', 'Graphql endpoint for this environment')
	.action(async (alias, options) => {
		const endpoint = options.endpoint
			? options.endpoint
			: await question(chalk.bold.blue(`What's the endpoint for this environment? `))

		const validation = z.object({
			alias: z.string().min(1).regex(/[a-zA-Z0-9\-:_]/, { message: "Alias can only contain alphanumeric, -, : and _" }),
			endpoint: z.string().url(),
		})

		const inputs = {
			alias,
			endpoint
		}

		try {
			validation.parse(inputs)
		} catch (e) {
			displayValidationErrors(e.issues)
			exit(1)
		}

		const config = getConfig()
		const environments = config?.environments ?? {}
		environments[alias] = { endpoint }
		config.environments = environments
		await writeConfig(config)

		console.log('')
		console.log(chalk.green.bold(`New environment \`${alias}\` created!`))
		console.log(chalk.green(stringify(environments[alias])))
		exit(0)
	})

program.parse()