#!/usr/bin/env node

import { Command } from "commander"
import { chalk } from "zx"
import { useProductApi } from "./src/graph/api/useProductApi.mjs"
import { useProductMutations, useProductQueries } from "./src/graph/useProduct.mjs"
import { exit } from "node:process"
import { error, info, success, warn } from "./src/log.mjs"

const program = new Command()

program.name("covergo graph product-schema")

program
	.command("copy")
	.description("Copy a product schema and product UI schemas with to a new product tree")
	.requiredOption("-s, --source <tenant>", "Name of the source tenant.")
	.requiredOption("-d, --destination <tenant>", "Name of the destination tenant.")
	.option("-i, --id <id>", "Assign this data schema to a different ID from the source.")
	.argument("<id>", "The product ID to copy.")
	.action(async (sourceProductId, options) => {
		const sourceAlias = options.source
		const targetAlias = options.destination
		const targetProductId = options.id ?? sourceProductId

		const sourceContext = await useProductApi(sourceAlias)
		const targetContext = await useProductApi(targetAlias)

		const sourceQueries = useProductQueries(sourceContext)
		const targetQueries = useProductQueries(targetContext)
		const mutations = useProductMutations(targetContext)

		info(`graph:product-schema:copy`, `Fetch product ${chalk.bold(sourceProductId)} from tenant ${chalk.bold(sourceAlias)}.`)
		const sourceProduct = await sourceQueries.fetchProduct(sourceProductId)

		info(
			`graph:product-schema:copy`,
			`Fetch target product ${chalk.bold(sourceProduct.productTreeId)} from tenant ${chalk.bold(sourceAlias)}.`
		)
		const targetProduct = await targetQueries.fetchProduct(targetProductId)

		if (!targetProduct.productTreeId) {
			error(`graph:product-schema:copy`, `Target product tree ${chalk.bold(targetProductId)} does not have a product tree ID.`)
			exit(1)
		}

		let schema = null
		try {
			info(`graph:product:copy`, `Fetch source product data schema.`)
			schema = await sourceQueries.fetchProductSchema(sourceProduct.productTreeId)
		} catch (e) {
			warn(`graph:product:copy`, `No data schema found for product ${chalk.bold(sourceProductId)}.`)
			exit(0)
		}

		if (schema) {
			info(`graph:product:copy`, `Create data schema on destination tenant.`)
			const schemaId = await mutations.createProductDataSchema(targetProduct.productTreeId, schema.dataSchema)

			info(`graph:product:copy`, `Create associated UI schema.`)
			const uiSchemas = schema?.uiSchemas ?? []
			for (const uiSchema of uiSchemas) {
				if (uiSchema?.name === sourceProduct.productTreeId) {
					await mutations.createProductUiDataSchema(schemaId, targetProduct.productTreeId, uiSchema.schema)
				}
			}
		}

		success(
			`graph:product-schema:copy`,
			`Product schema ${chalk.bold(sourceProductId)} copied to ${chalk.bold(targetProductId)}.`
		)

		exit(0)
	})

program.parse()
