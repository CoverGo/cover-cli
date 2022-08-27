#!/usr/bin/env node
import { Command } from 'commander'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { getConfig } from './src/config/config.mjs'

const program = new Command()

program
	.command('list', 'List all configured environments')
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