import { chalk } from 'zx'

export function info(command, text) {
	console.log(chalk.blue(`${chalk.bold(command)} ${text}`));
}

export function error(command, text) {
	console.error(chalk.red(`${chalk.bold(command)} ${text}`));
}

export function success(command, text) {
	console.log(chalk.green(`${chalk.bold(command)} ${text}`));
}

export function warn(command, text) {
	console.warn(chalk.yellow(`${chalk.bold(command)} ${text}`));
}

export function debug(command, text, options) {
	if (options?.newline) {
		text = `\n ${text}`.replace(/^/gm, "  ");
	}

	let output = `${chalk.bold(command)} ${text}`

	if (options?.indent) {
		output = output.replace(/^/gm, "  ");
	}

	console.log(chalk.white(output));
}