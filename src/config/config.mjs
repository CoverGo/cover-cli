import { getConfigForEnv, DirectoryNotAccessibleError } from './file.mjs'
import { exit } from 'node:process'
import * as fs from 'node:fs/promises'
import { chalk } from 'zx'
import { stringify, parse } from 'yaml'

export async function getConfig() {
  try {
    const path = await getConfigForEnv()
    try {
      await fs.access(path)
    } catch {
      await fs.writeFile(path, '')
    }

    const contents = await fs.readFile(path, 'utf8')
    return parse(contents) ?? {}
  } catch (e) {
    if (e instanceof DirectoryNotAccessibleError) {
      console.error(chalk.bgRed(e.message))
      exit(1)
    }

    throw e
  }
}

export async function writeConfig(config) {
  try {
    const path = await getConfigForEnv()
		const content = stringify(config)
		await fs.writeFile(path, content)
  } catch (e) {
    if (e instanceof DirectoryNotAccessibleError) {
      console.error(chalk.bgRed(e.message))
      exit(1)
    }

    console.error(e)
    exit(1)
  }
}