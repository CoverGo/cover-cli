#!/usr/bin/env node

import { Command } from "commander";
const program = new Command();

program
  .name("covergo")
  .description("Utility scripts for interacting with the covergo platform")
  .version("2.2.11")
  .command("graph", "Interact with the graph API")
  .command("env", "Manage environments")
  .command("tenant", "Manage tenants");

program.parse();
