#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
const program = new Command()

program
	.command('create-tenant', 'create a new tenant')
	.argument('<tenant alias>', argDescriptions.sourceAlias)
	.argument('<tenant super admin token>', 'super admin token with ability to create tenants')
	.requiredOption('-t, --tenant-id <tenant id>', 'the configured tenant id')
	.requiredOption('-u, --username <username>', 'username used to get access token for the tenant')
	.requiredOption('-e, --email <email address>', 'email address for the admin user')
	.requiredOption('-p, --password <password>', 'password used to get access token for the tenant')
	.requiredOption('-h, --host <host>', 'host name for cover-app')
	.requiredOption('-f, --fs <file system config>', 'JSON file system config')
	.action(async (name, token, options) => {
		const { getConfig } = await import("./tenant/config.mjs")
		const config = await getConfig(name)
		const { useCreateTenant } = await import("./src/graph/create-tenant.mjs")
		const createTenant = useCreateTenant(token, config.ENDPOINT)

		const fsConfig = JSON.parse(options.fs)

		const redirectUris = [
			`https://${options.host}/new-password`,
			`https://${options.host}/reset-password`
		]

		await createTenant(options.tenantId, options.email, options.username, options.password, redirectUris, fsConfig)
	})


program.parse()