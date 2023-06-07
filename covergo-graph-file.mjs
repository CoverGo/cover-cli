#!/usr/bin/env node

import { Command } from 'commander'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { useFileApi } from './src/graph/api/useFileApi.mjs'
import { useExternalTableMutations, useExternalTableQueries } from './src/graph/useExternalTable.mjs'
import { info, success } from './src/log.mjs'

const program = new Command()

program.name('covergo graph file')

program
	.command('copy')
	.description('Copy a file from one tenant to another.')
	.requiredOption('-s, --source <tenant>', 'Name of the source tenant.')
	.requiredOption('-d, --destination <tenant>', 'Name of the destination tenant.')
	.requiredOption('-f, --file <file>', 'Full path of the file to copy.')
	.option('-m, --move <file>', 'Move the newly copied file to a different location.')
	.action(async (options) => {
		try {
			const sourceContext = await useFileApi(options.source)
			const targetContext = await useFileApi(options.destination)

			const queries = useExternalTableQueries(sourceContext)
			const mutations = useExternalTableMutations(targetContext)

			info(`graph:copy:file`, `Fetch file ${chalk.bold(options.file)} from tenant ${chalk.bold(options.source)}.`)

			const data = await queries.fetchFile(options.file)
			const destinationFileName = options.move ? options.move : options.file
			const [ filename, ...dirs ] = destinationFileName.split('/').reverse()
			const directory = dirs.reverse().join('/')

			info(`graph:copy:file`, `Uploading file ${chalk.bold(destinationFileName)} to ${chalk.bold(options.destination)}.`)
			await mutations.createFile(directory, filename, data)

			success(`graph:copy:file`, `Copied ${chalk.bold(destinationFileName)}!`)
			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program.parse()