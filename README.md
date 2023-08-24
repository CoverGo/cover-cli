# Cover CLI

This package provides a simple command line interface for CoverGo APIs.

## Prerequisites

- Node.js
- A shell that can execute bash scripts (WSL on Windows)

## Installation

```
npm install -g @covergo/cli
```

```shell
Usage: covergo [options] [command]

Utility scripts for interacting with the covergo platform

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  graph           Interact with the graph API
  env             Manage environments
  tenant          Manage tenants
  help [command]  display help for command
```

## Concepts

| Concept     | Description                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Environment | A server running the CoverGo GraphQl API. There can be many tenants associated with a single environment. |
| Tenant      | A self-contained instance of an environment with it's own configured products, users, quotes, etc...      |
| Graph       | In the context of the CLI "graph" operations relate to API operations.                                    |

## Usage

### Configuration

#### 1. Setting up an environment

In order to access the GraphQL services you must first create an environment and a tenant.

```shell
> covergo env create --name my-env --endpoint https://exmaple.com
env:create Created environment my-env.
```

There are a few utility commands to manage environments, most should be fairly self-explanatory but if you get stuck you can always use the `--help` flag on any subcommand.

```shell
> covergo env --help
Usage: covergo env [options] [command]

Options:
  -h, --help        display help for command

Commands:
  create [options]  Create a new environment.
  info <name>       Show details of a configured environment.
  delete <name>     Remove an environment configuration.
  list              Show a list of all environment aliases
  help [command]    display help for command
```

#### 2. Creating a tenant

Once you have an environment you can create a new tenant assigned to it.

```shell
> covergo tenant create --env my-env --tenant-id my_tenant --client-id cover_crm --username admin@example.com --password supersecretsafepassword my_tenant@my-env
tenant:create Tenant ID: my_tenant
tenant:create Client ID: cover_crm
tenant:create Username: admin@example.com
tenant:create Password: supersecretsafepassword
tenant:create Environment: my-env
Create my-env:my_tenant? (y/n) y
tenant:create New tenant my_tenant@my-env created!
```

We recommend setting up a convention for your tenant aliases. In this example I have named the tenant `my_tenant@my-env` which is a combination of the tenant ID and the environment name. You are free to use whatever convention you like, however.

As before, there are a bunch of utility methods for managing tenants.

```shell
> Usage: covergo tenant [options] [command]

Options:
  -h, --help               display help for command

Commands:
  create [options] <name>  Create a new tenant
  list [options]           List configured tenants.
  delete [options] <name>  Delete a tenant configuration.
  info <name>              Show stored information about tenant.
  help [command]           display help for command
```

### Graph Commands

Currently, the main focus of the library is automating management of products. These features can all be found under the `covergo graph` subcommands.

```shell
> covergo graph --help
Usage: covergo graph [options] [command]

Options:
  -h, --help         display help for command

Commands:
  product            Manage products
  product-node-type  Manage product node types
  product-tree       Manage product trees
  product-schema     Manage product schemas
  file               Manage external tables
  help [command]     display help for command
```

#### Node Types

Products using the new product builder are dependent on the correct node types being available in order for them to work. This shouldn't change very often, but it can be useful to copy or modify node types, like if a new field is added to a node.

> **Warning!**
> Copy and import **can** overwrite existing node definitions, double-check before you run these commands

There are three operations available for dealing with node types: `copy`, `export` and `import`.

Copy should be used when we simply want to sync between tenants or environments. Most often this is used when creating new tenants.

```shell
> covergo graph product-node-type copy --source my_tenant@my-env-dev --destination my_tenant@my-env-uat
graph:product-node-type:copy Copying node types from my_tenant@my-env-dev to my_tenant@my-env-uat.

 ████████████████████████████████████████ 100% | ETA: 0s | 25/25

graph:product-node-type:copy Types copied!
```

Export will give use the JSON definitions of the node types so that they can be edited and re-imported.

```shell
> covergo graph product-node-type export --tenant my_tenant@my-env-dev > node-types.json
```

Once you've edited and made your changes you can either re-import to the same tenant or copy it somewhere else.

```shell
> covergo graph product-node-type import --tenant my_tenant@my-env-dev "$(<node-types.json)"
```

#### Product Trees

It's also sometimes useful to be able to copy over product trees between environments. As before we have `copy`, `export` and `import` but this time on the `product-tree` subcommand.

> **Note!**
> Copying a tree does not associate it with a product. Pay attention to the root node output when the command finishes running, we will use that in the next step.

```shell
> covergo graph product-tree copy --source tenant-a --destination tenant-b "product/type/version" # the last param is a product ID e.g. "home/building/1.0"
graph:product-tree:copy Copying product tree from tenant-a to tenant-b.
graph:product-tree:copy Product tree copied with ID c2b46a83ee6f7ac13de66095ca9bed7e.
```

As with product nodes you can also export/import in order to manipulate the tree in JSON form rather than having to do it via API calls. Useful for mass transformations.

```shell
> covergo graph product-tree export --tenant tenant-a "product/type/version" > nodes.json
```

```shell
> covergo graph product-tree import --tenant tenant-b "$(<nodes.json)"
```

Once we have a new tree imported or copied the script will provide you with the root ID in the final output.

You can then assign this tree to a product using the `covergo graph product assign-tree` subcommand detailed in the "Product" section below.

#### Product Schema

There's only one option for product schemas and that is `copy` which will take the product schema and associated product UI schema and then... copy it to another product.

```shell
> covergo graph product-schema copy --source tenant-a --destination tenant-b --id test/Test/1.0 test/Test/2.0
graph:product-schema:copy Fetch product test/Test/2.0 from tenant tenant-a.
graph:product-schema:copy Fetch target product tree b4436b3af32182882eacc4e4d8ffdf78 from tenant tenant-b.
graph:product:copy Fetch source product data schema.
graph:product:copy Create data schema on destination tenant.
graph:product:copy Create associated UI schema.
graph:product-schema:copy Product schema test/Test/2.0 copied to test/Test/1.0.
```

The `--id` parameter is the product ID of the product you want to copy the schema to. If it's not provided it will default to the source product ID.

#### Files

Copying a file from one tenant to another.

```shell
> covergo graph file copy --source tenant-a --destination tenant-b --file externalTables/my-table.txt
graph:copy:file Fetch file externalTables/my-table.txt from tenant tenant-a.
graph:copy:file Uploading file externalTables/my-table.txt to tenant-b.
graph:copy:file Copied externalTables/my-table.txt!
```

#### Product

The `covergo graph product` subcommand is used for copying entire products between environments. This will include, trees, schemas and of course the product itself. The product ID provided on the target environment must not exist and the node types the tree is based on must also be there for this to work.

```shell
> covergo graph product copy --source tenant-a --destination tenant-b --id testcli/Test/2.0 testcli/Test/1.0
graph:product:copy Fetch product testcli/Test/1.0 from tenant tenant-a.
graph:product:copy Create product testcli/Test/2.0 in tenant tenant-b.
graph:product:copy Fetch source product tree.
graph:product:copy Create tree on destination tenant.
graph:product:copy Created tree root a09ac97e330494ceb5d9bb42e83df5c8.
graph:product:copy Update product ID on destination tenant.
graph:product:copy Fetch source product data schema.
graph:product:copy Create data schema on destination tenant.
graph:product:copy Create associated UI schema.
graph:product:copy Product testcli/Test/1.0 copied to testcli/Test/2.0.
```

Sometimes you may need to reassign a product tree to a given product so for that there is one more utility method `assign-tree`.

```shell
> covergo graph product assign-tree --tenant tenant-a testcli/Test/2.0 a09ac97e330494ceb5d9bb42e83df5c8
graph:product:assign-tree Fetch product testcli/Test/2.0 from tenant tenant-a.
graph:product:assign-tree Update product tree ID on product testcli/Test/2.0.
graph:product:assign-tree Product testcli/Test/2.0 assigned to tree a09ac97e330494ceb5d9bb42e83df5c8.
```
