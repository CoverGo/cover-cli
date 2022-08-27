#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product', 'Copy an entire product with data schemas, tree and nodes')
program.command('product-nodes', 'copy a sub tree of product nodes from one tenant to the other')
program.command('product-node-types', 'copy product types from one tenant to another')

program.parse()