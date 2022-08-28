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
		const environments = config?.environments ?? {}

		if (environments[alias]) {
			console.log(chalk.blue(`${chalk.bold('Endpoint')}: ${environments[alias]?.endpoint ?? ''}`))
			exit(0)
		}

		console.error(chalk.bold.red(`Environment \`${alias}\` not found!`))
		exit(1)
	})

program.parse()