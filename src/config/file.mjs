import os from 'node:os'
import * as fs from 'node:fs/promises'
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
		return configDir
	}

	return configDir
}

export async function getConfigForEnv() {
	const configDir = await getConfigDir()
	return `${configDir}/config.yaml`
}
