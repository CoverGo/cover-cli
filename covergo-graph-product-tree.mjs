#!/usr/bin/env node

import { Command } from "commander"
import { chalk } from "zx"
import { useProductApi } from "./src/graph/api/useProductApi.mjs"
import { useProductMutations, useProductQueries } from "./src/graph/useProduct.mjs"
import { exit, cwd } from "node:process"
import { error, info, success } from "./src/log.mjs"
import * as fs from "node:fs/promises"
import { join } from "node:path"

const program = new Command()

program.name("covergo graph product-tree")

program
	.command("copy")
	.description("Copy product tree")
	.requiredOption("-s, --source <tenant>", "Name of the source tenant.")
	.requiredOption("-d, --destination <tenant>", "Name of the destination tenant.")
	.argument("<id>", "The product ID to copy the tree from.")
	.action(async (productId, options) => {
		const sourceAlias = options.source
		const targetAlias = options.destination

		info(`graph:product-tree:copy`, `Copying product tree from ${chalk.bold(sourceAlias)} to ${chalk.bold(targetAlias)}.`)

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)

		const queries = useProductQueries(sourceContext)
		const mutations = useProductMutations(targetContext)

		const product = await queries.fetchProduct(productId)
		const productTree = await queries.fetchProductTree(product)
		const rootId = await mutations.createProductTree(productTree)

		if (!rootId) {
			error(`graph:product-tree:copy`, `Unable to create tree.`)
			exit(1)
		}

		success(`graph:product-tree:copy`, `Product tree copied with ID ${chalk.bold(rootId)}.`)
	})

program
	.command("import")
	.description("Import previously exported data")
	.requiredOption("-t, --tenant <tenant>", "Tenant import the tree to.")
	.option("-f, --file <file>", "Path to file containing node structure.")
	.action(async (options) => {
		info(`graph:product-tree:import`, `Importing product tree to ${options.tenant}.`)

		const targetContext = await useProductApi(options.tenant)
		const mutations = useProductMutations(targetContext)
		const filePath = join(cwd(), options.file)

		try {
			await fs.access(filePath)
			const nodes = await fs.readFile(filePath, { encoding: "utf-8" })

			const rootId = await mutations.createProductTree(JSON.parse(nodes))
			if (!rootId) {
				error(`graph:product-tree:import`, `Unable to create tree.`)
				exit(1)
			}

			success(`graph:product-tree:import`, `Product tree copied with ID ${chalk.bold(rootId)}.`)
		} catch {
			error(`graph:product-tree:import`, `Can't access path ${chalk.bold(filePath)}.`)
			exit(1)
		}

		exit(0)
	})

program
	.command("export")
	.description("Export product tree nodes")
	.requiredOption("-t, --tenant <tenant>", "Tenant export the tree from.")
	.requiredOption("-o, --out <tenant>", "Tenant export the tree from.")
	.argument("<id>", "The product ID to export the tree from.")
	.action(async (productId, options) => {
		const sourceContext = await useProductApi(options.tenant)
		const queries = useProductQueries(sourceContext)

		const product = await queries.fetchProduct(productId)
		const productTree = await queries.fetchProductTree(product)

		if (options.out) {
			const outDir = cwd()
			const outFile = join(outDir, options.out)

			try {
				await fs.access(outDir)
				await fs.writeFile(outFile, JSON.stringify(productTree))
				success(`graph:product-tree:export`, `Product tree written to file ${chalk.bold(outFile)}.`)
			} catch {
				error(`graph:product-tree:export`, `Can't access path ${chalk.bold(outFile)}.`)
				exit(1)
			}
		} else {
			exit(0)
		}
	})

program.parse()
