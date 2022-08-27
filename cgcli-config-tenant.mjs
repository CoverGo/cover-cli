#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program
	.command('create', 'configure a new tenant')
	.command('info', 'show stored information about tenant')
	.command('auth', 'get and store a new token from the API using configured credentials')

program.parse()