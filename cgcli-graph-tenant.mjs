#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { getTenantWithEnvironment } from './src/config/config.mjs'
import { fetchNewToken } from './src/login/login.mjs'
import { createRequest } from './src/graph/api/api.js'
import { useTenantApi } from './src/graph/api/useTenantApi.mjs'
import { chalk } from 'zx'
const program = new Command()

program.command('initialize')
	.description('Initialize a new tenant')
	.argument('<admin tenant>', argDescriptions.superAdminTenant)
	.requiredOption('-t, --tenant-id <tenant id>', 'The configured tenant id')
	.requiredOption('-u, --username <username>', 'Username used to get access token for the tenant')
	.requiredOption('-e, --email <email address>', 'Email address for the admin user')
	.requiredOption('-p, --password <password>', 'Password used to get access token for the tenant')
	.requiredOption('-h, --host <host>', 'Hostname for cover-app')
	.requiredOption('-f, --fs <file system config>', 'JSON file system config')
	.action(async (alias, options) => {
		const tenant = await getTenantWithEnvironment(alias)
		const token = await fetchNewToken(tenant.environment, tenant)
		const request = createRequest(tenant.environment, token)

		const superApi = useTenantApi(request)
		const fsConfig = JSON.parse(options.fs)

		const redirectUris = [
			`https://${options.host}/new-password`,
			`https://${options.host}/reset-password`
		]

		const {
			tenantId,
			email,
			username,
			password,
		} = options

		console.log(chalk.blue(`${chalk.bold(`1/6:`)} Create new tenant \`${tenantId}\`.`))
		await superApi.createTenant(tenantId, email, username, password, redirectUris, fsConfig)

		console.log(chalk.blue(`${chalk.bold(`2/6:`)} Fetch token for new tenant.`))
		const tenantToken = await fetchNewToken(tenant.environment, {
			tenantId: tenant.tenantId,
			clientId: "covergo_crm",
			username: tenant.username,
			password: tenant.password,
		})

		const tenantRequest = createRequest(tenant.environment, tenantToken)
		const tenantApi = useTenantApi(tenantRequest)

		console.log(chalk.blue(`${chalk.bold(`3/6:`)} Create default mail templates.`))
		await tenantApi.createMailTemplate()

		console.log(chalk.blue(`${chalk.bold(`4/6:`)} Update new password template association.`))
		const templateId = await tenantApi.listTemplates()
		await tenantApi.updateTemplate(templateId)

		console.log(chalk.blue(`${chalk.bold(`5/6:`)} Create default data schemas.`))
		const schemas = await tenantApi.createSchemas()
		await tenantApi.updateTenantSchemas(schemas?.individualFields, schemas?.uiIndividualFields, schemas?.companyDynamicFields, schemas?.companyDynamicFields)

		console.log(chalk.blue(`${chalk.bold(`5/6:`)} Set default permissions.`))
		const groupId = await tenantApi.createPermissionsGroup(tenantToken)
		await tenantApi.setAdminPermissions(groupId)
	})

program.parse()