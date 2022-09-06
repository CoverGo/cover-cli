#!/usr/bin/env node

import { Command } from 'commander'
import { argDescriptions } from './src/strings.js'
import { chalk } from 'zx'
import { exit } from 'node:process'
import { useExternalTableApi } from './src/graph/api/useExteralTableApi.mjs'
import { useExternalTableMutations, useExternalTableQueries } from './src/graph/useExternalTable.mjs'

const program = new Command()

program.name('cg graph file')

program
	.command('copy')
	.description('Copy files from one tenant to another')
	.argument('<tenant>', argDescriptions.sourceAlias)
	.argument('<filename>', argDescriptions.copyFilename)
	.argument('<tenant>', argDescriptions.targetAlias)
	.argument('<filename>', argDescriptions.destinationFilename)
	.action(async (sourceAlias, sourceFileName, targetAlias, destinationFileName) => {
		try {
			const sourceContext = await useExternalTableApi(sourceAlias)
			const targetContext = await useExternalTableApi(targetAlias)
			const queries = useExternalTableQueries(sourceContext)
			const mutations = useExternalTableMutations(targetContext)

			console.log(chalk.blue(`Fetching file \`${sourceFileName}\` from tenant \`${sourceAlias}\``))
			const data = await queries.fetchFile(sourceFileName)
			const [ filename, ...dirs ] = destinationFileName.split('/').reverse()
			const directory = dirs.reverse().join('/')
			console.log(chalk.blue(`Uploading file \`${destinationFileName}\` to tenant \`${targetAlias}\``))
			await mutations.createFile(directory, filename, data)

			console.log(chalk.green.bold(`File \`${sourceFileName}\` copied to \`${destinationFileName}\`.`))
			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}
	})

program.parse()