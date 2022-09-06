#!/usr/bin/env node
import { Command } from 'commander'
import { chalk, question } from 'zx'
import { z } from 'zod'
import { displayValidationErrors } from './src/validation/error.mjs'
import { exit } from 'node:process'
import { getConfig, writeConfig } from './src/config/config.mjs'
import { argDescriptions } from './src/strings.js'

const program = new Command()

program.name('cg env')

program
	.command('config')
	.description('Configure a new environment')
	.argument('<alias>', argDescriptions.alias)
	.option('-e, --endpoint <endpoint>', argDescriptions.endpoint)
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

		const config = await getConfig()
		const environments = config?.environments ?? {}
		environments[alias] = { endpoint }
		config.environments = environments
		await writeConfig(config)

		console.log('')
		console.log(chalk.green.bold(`New environment \`${alias}\` created!`))
		console.log(chalk.blue(`${chalk.bold('Endpoint')}: ${endpoint}`))
		exit(0)
	})

program.command('info')
	.description('Show details of a specific environment')
	.argument('<alias>', argDescriptions.alias)
	.action(async (alias) => {
		const config = await getConfig()
		const environments = config?.environments ?? {}

		if (environments[alias]) {
			console.log(chalk.blue(`${chalk.bold('Endpoint')}: ${environments[alias]?.endpoint ?? ''}`))
			exit(0)
		}

		console.error(chalk.bold.red(`Environment \`${alias}\` not found!`))
		exit(1)
	})

program.command('delete')
	.description('Remove and environment configuration')
	.argument('<alias>', argDescriptions.alias)
	.action(async (alias) => {
		const config = await getConfig()

		if (config?.environments?.[alias]) {
			delete config.environments[alias]
			await writeConfig(config)

			console.log(chalk.green.bold(`Environment \`${alias}\` removed!`))
			exit(0)
		}

		console.error(chalk.bold.red(`Environment \`${alias}\` not found!`))
		exit(1)
	})

program.command('list')
	.description('Show a list of all environment aliases')
	.action(async () => {
		const config = await getConfig()
		const environments = config?.environments ?? {}

		const envs = Object.keys(environments)
		for (const env of envs) {
			console.log(chalk.blue(env))
		}

		exit(0)
	})

program.parse()