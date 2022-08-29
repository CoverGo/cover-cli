#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-nodes', 'import a product tree')
program.command('product-node-types', 'import a product-tree-types')

program.parse()