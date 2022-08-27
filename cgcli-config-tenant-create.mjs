#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program
	.command('create', 'configure a new tenant')
	.argument('<name>', 'the alias you want to use when referencing this tenant in other commands')
	.requiredOption('-t, --tenant-id <tenant id>', 'the configured tenant id')
	.requiredOption('-u, --username <username>', 'username used to get access token for the tenant')
	.requiredOption('-p, --password <password>', 'password used to get access token for the tenant')
	.requiredOption('-e, --endpoint <endpoint>', 'the endpoint for the graphql API')
	.option('-c --client-id <client id>', 'the client id to use when accessing this client', 'covergo_crm')
	.action(async (name, options) => {
		const {createConfig} = await import("./tenant/config.mjs");
		const path = await createConfig(name, options)

		console.log(`file ${path} written and tenant ${name} now ready for use`)
	})

program.parse()