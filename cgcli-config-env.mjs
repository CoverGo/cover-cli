#!/usr/bin/env node
import { $, question } from 'zx'

import { Command } from 'commander'
const program = new Command()

program
	.command('create', 'Configure a new environment')
	.action(async () => {
		const alias = await question(`What should we call this environment?`)
		const endpoint = await question(`What's the endpoint for this environment?`)

		$`echo ${alias}: ${endpoint}`
	})

program.parse()