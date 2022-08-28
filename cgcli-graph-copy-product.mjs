#!/usr/bin/env zx
import { Command } from 'commander'
import { getTenantWithEnvironment } from './src/config/config.mjs'
import { useGraphProduct } from './src/graph/product.mjs'
import { exit } from 'node:process'
import { fetchNewToken } from "./src/login/login.mjs"
import { chalk } from 'zx'
import cliProgress from 'cli-progress'

const program = new Command()

program.command('product-nodes', 'Copy an entire product with data schemas, tree and nodes')
	.argument('<tenant source alias>', 'Alias of a tenant to copy node types from')
	.argument('<tenant target alias>', 'Alias of a tenant to copy node types to`')
	.argument('<productId>', 'The product id you wish to copy (name/type/version)')
	.action(async (sourceAlias, targetAlias, productId) => {
		try {
			const sourceTenant = await getTenantWithEnvironment(sourceAlias)
			const targetTenant = await getTenantWithEnvironment(targetAlias)

			const sourceToken = await fetchNewToken(sourceTenant.environment, sourceTenant)
			const targetToken = await fetchNewToken(targetTenant.environment, targetTenant)

			const sourceContext = useGraphProduct(sourceTenant.environment.endpoint, sourceToken)
			const targetContext = useGraphProduct(targetTenant.environment.endpoint, targetToken)

			const [plan, name, version] = productId.split('/')

			const product = await sourceContext.fetchProduct(plan, name, version)
			if (!product) {
				console.log(chalk.red(`Product \`${productId}\` not found on tenant \`${sourceAlias}\`.`))
				exit(1)
			}

			console.log(chalk.green(`Creating product \`${productId}\` on tenant \`${targetAlias}\`.`))
			// const productCopy = await targetContext.createProduct(product)
			const productTree = await sourceContext.fetchProductTreeNodes(product.productTreeId)

			console.log(chalk.green(`Copying ${productTree.length} nodes from product \`${productId}\` to tenant \`${targetAlias}\`.`))
			if (productTree.length) {
				const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)
				bar.start(productTree.length, 0)
				let completed = 0

				// make sure we execute these one at a time, do not spam the server with requests
				for (const node of productTree) {
					await targetContext.createNode(
						node.id,
						node.ref,
						node.alias,
						node.parent ? { parentId: node } : null,
						[
							{
								type: "String",
								ref: "meta",
								alias: "Meta",
								resolver: {
									text: "",
									language: "CONSTANT"
								}
							}
						]
					)

					completed++
					bar.update(completed)

					const fields = node.fields ? node.fields : []
					for (const field of fields) {
						await targetContext.attachFieldResolver(node.id, field.ref, field.resolver.text, field.resolver.language)
						completed++
						bar.update(completed)
					}
				}
				bar.stop()
			}
			console.log(chalk.green(`Done copying ${productTree.length} nodes from product \`${productId}\` to tenant \`${targetAlias}\`.`))

			exit(0)
		} catch (e) {
			console.error(chalk.red.bold(e.message))
			exit(1)
		}

		// const { getConfig } = await import("./tenant/config.mjs")
		// const { exportProductBuilderTree } = await import("./graph/export.mjs");
		// const { importNodes } = await import("./graph/import.mjs");

		// const sourceConfig = await getConfig(sourceName)
		// const targetConfig = await getConfig(targetName)
		// const nodes = await exportProductBuilderTree(nodeId, sourceConfig.TOKEN, sourceConfig.ENDPOINT)
		// const rootNode = await importNodes(nodes, targetConfig.TOKEN, targetConfig.ENDPOINT)

		// console.log("Import complete!")
		// console.log(`New imported root node: ${rootNode}`)
	})

program.parse()