import os from "node:os";
import * as fs from 'node:fs/promises';
import mkdirp from 'mkdirp'

const userHomeDir = os.homedir()
const configDir = `${userHomeDir}/.config/cover-cli`

export class DirectoryNotAccessibleError extends Error {
	constructor(path) {
		super(`Directory at \`${path}\` does is not accessible.`)
	}
}

export async function getConfigDir() {
	try {
		await fs.access(configDir)
	} catch {
		mkdirp(configDir)
	}

	// try again
	try {
		await fs.access(configDir)
	} catch {
		throw new DirectoryNotAccessibleError(configDir)
	}

	return configDir
}

export async function getConfigForTenant(alias) {
	const configDir = await getConfigDir()
	return `${configDir}/${alias}.tenant`
}

export async function getConfigForEnv() {
	const configDir = await getConfigDir()
	return `${configDir}/env.yaml`
}
