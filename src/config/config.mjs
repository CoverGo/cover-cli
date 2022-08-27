import { getConfigForEnv } from './file.mjs'
import { exit } from 'node:process'
import { access, writeFile, readFile } from 'node:fs/promises'
import { DirectoryNotAccessibleError } from './file.mjs'
import { chalk } from 'zx'
import { stringify, parse } from 'yaml'

export async function getConfig() {
  try {
    const path = await getConfigForEnv()
    try {
      await access(path)
    } catch {
      await writeFile(path, '')
    }

    const contents = await readFile(path, 'utf8')
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
		await writeFile(path, content)
  } catch (e) {
    if (e instanceof DirectoryNotAccessibleError) {
      console.error(chalk.bgRed(e.message))
      exit(1)
    }

    throw e
  }
}