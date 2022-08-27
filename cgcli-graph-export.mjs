#!/usr/bin/env node

import { Command } from 'commander'
const program = new Command()

program.command('product-nodes', 'export a product tree')
program.command('product-node-types', 'export product node types')

program.parse()