#!/usr/bin/env node
import { Command } from 'commander'
import { chalk, question } from 'zx'
import { exit } from 'node:process'
import { z } from 'zod'
import { parse, stringify } from 'yaml'
import * as fs from 'node:fs/promises';
import { displayValidationErrors } from './src/validation/error.mjs'
import { DirectoryNotAccessibleError, getConfigForEnv } from './tenant/file.mjs'

const program = new Command()

program
	.command('create', 'Configure a new environment')
	.argument('<alias>', 'The alias you want to use when referencing this environment in other commands')
	.option('-e, --endpoint <endpoint>', 'The endpoint to use for the graphql API')
	.action(async (alias, options) => {
		const endpoint = options.endpoint
			? options.endpoint
			: await question(chalk.bold.blue(`What's the endpoint for this environment? `))

		const validation = z.object({
			alias: z.string().min(1).regex(/[a-zA-Z0-9\-:_]/, { message: "Alias can only contain alphanumeric, -, : and _" }),
			endpoint: z.string().url()
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

		try {
			const path = await getConfigForEnv()

			try {
				await fs.access(path)
			} catch {
				await fs.writeFile(path, '')
			}

			const contents = await fs.readFile(path, 'utf8')
			const config = parse(contents) ?? {}
			const environments = config?.environments ?? {}
			environments[alias] = { endpoint }
			config.environments = environments
			const content = stringify(config)
			await fs.writeFile(path, content)

			console.log('')
			console.log(chalk.green.bold(`New environment \`${alias}\` created!`))
			console.log(chalk.green(content))
			exit(0)
		} catch (e) {
			if (e instanceof DirectoryNotAccessibleError) {
				console.error(chalk.bgRed(e.message))
				exit(1)
			}

			throw e
		}
	})

program.parse()