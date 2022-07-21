import os from 'node:os'
import * as fs from 'node:fs/promises';
import mkdirp from 'mkdirp'

const userHomeDir = os.homedir()
const configDir = `${userHomeDir}/.config/cover-cli`

class ConfigNotExistsError extends Error {
	constructor(alias, path) {
		super(`Config for alias \`${alias}\` at expected path \`${path}\` does not exist.`)
	}
}

function getPathForAlias(name) {
	return `${configDir}/${name}.tenant`
}

export async function createConfig(name, config) {
	const {
		tenantId: TENANT_ID,
		username: USERNAME,
		password: PASSWORD,
		clientId: CLIENT_ID = "covergo_crm",
	} = config

	const env = {
		TENANT_ID,
		USERNAME,
		PASSWORD,
		CLIENT_ID,
	}

	let line = []
	for (const entry of Object.entries(env)) {
		line.push(entry.join('='))
	}

	await mkdirp(configDir)
	const path = getPathForAlias(name)
	await fs.writeFile(getPathForAlias(name), line.join("\n"))

	return path
}

export async function readConfig(name) {
	const path = getPathForAlias(name)

	try {
		await fs.access(path)
	} catch {
		throw new ConfigNotExistsError(name, path)
	}

	return await fs.readFile(getPathForAlias(name), 'utf8')
}
