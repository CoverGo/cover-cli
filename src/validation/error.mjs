import { chalk } from 'zx'

export function displayValidationErrors(errors) {
  console.log('')
  console.log(chalk.bold.red(`Validation Errors`))

  for (const error of errors) {
    console.log(chalk.red(`- ${chalk.bold(error.path.join('.'))}: ${error.message}`))
  }
}