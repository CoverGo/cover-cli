import os from "node:os"
import * as fs from "node:fs/promises"
import { mkdirp } from "mkdirp"

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
		await mkdirp(configDir)
		return configDir
	}

	return configDir
}

export async function getConfigForEnv() {
	const configDir = await getConfigDir()
	const config = `${configDir}/config.yaml`
	try {
		await fs.access(config)
	} catch {
		const time = new Date()
		try {
			await fs.utimes(config, time, time)
		} catch (err) {
			if ("ENOENT" !== err.code) {
				throw err
			}
			let fh = await fs.open(config, "a")
			await fh.close()
		}
	}

	return config
}
