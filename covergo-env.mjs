#!/usr/bin/env node
import { Command } from "commander"
import { chalk } from "zx"
import { exit } from "node:process"
import { getConfig, writeConfig } from "./src/config/config.mjs"
import { error, info, success } from "./src/log.mjs"

const program = new Command()

program.name("covergo env")

program
	.command("create")
	.description("Create a new environment.")
	.requiredOption(
		"-n, --name <name>",
		"Name of the environment you want to create. This will be used as an alias for other commands."
	)
	.requiredOption("-e, --endpoint <endpoint>", "Base URL for the GraphQL API. e.g. https://api.example.com.")
	.action(async (options) => {
		const config = await getConfig()
		const environments = config?.environments ?? {}
		environments[options.name] = { endpoint: options.endpoint }
		config.environments = environments
		await writeConfig(config)

		success(`env:create`, `Created environment ${chalk.bold(options.name)}.`)
		exit(0)
	})

program
	.command("info")
	.description("Show details of a configured environment.")
	.argument("<name>", "Name of the environment.")
	.action(async (name) => {
		const config = await getConfig()
		const environments = config?.environments ?? {}

		if (environments[name]) {
			console.log(name)
			console.log(environments[name].endpoint)
			exit(0)
		}

		error(`env:info`, `Environment ${chalk.bold(name)} does not exist.`)
		exit(1)
	})

program
	.command("delete")
	.description("Remove an environment configuration.")
	.argument("<name>", "The name of the endpoint you want to delete")
	.action(async (name) => {
		const config = await getConfig()

		if (config?.environments?.[name]) {
			delete config.environments[name]
			await writeConfig(config)

			success(`env:delete`, `Deleted environment ${chalk.bold(name)}.`)
			exit(0)
		}

		error(`env:delete`, `Environment ${chalk.bold(name)} does not exist.`)
		exit(1)
	})

program
	.command("list")
	.description("Show a list of all environment aliases")
	.action(async () => {
		const config = await getConfig()
		const environments = config?.environments ?? {}

		const envs = Object.keys(environments)
		for (const env of envs) {
			console.log(env)
		}

		exit(0)
	})

program.parse()
