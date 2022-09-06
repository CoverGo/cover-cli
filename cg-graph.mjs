#!/usr/bin/env node

import { Command } from 'commander'

const program = new Command()

program.name('cg graph')

program.command('product', 'Manage products')
program.command('product-node-type', 'Manage product node types')
program.command('product-tree', 'Manage product trees')
program.command('product-schema', 'Manage product schemas')
program.command('file', 'Manage external tables')
program.command('tenant', 'Manage tenants on the API')

program.parse()
