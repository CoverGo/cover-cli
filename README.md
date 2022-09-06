# Cover CLI

This package provides a simple command line interface for CoverGo APIs.

## Prerequisites

* nodejs
* a shell that can execute bash scripts

## Installation

Currently, only manual installation is supported. We will be looking into proper packaging on NPM at a later date.

### Yarn (Recommended)

```shell
git clone https://github.com/CoverGo/cover-cli 
cd cover-cli
yarn
yarn global add "file:$PWD"
```

### NPM

```shell
git clone https://github.com/CoverGo/cover-cli 
cd cover-cli
npm install
npm link
```

This will install the dependencies and link the `cg` script into your npm `bin` directory. As long as your system paths are set up correctly you should now be able to run `cg` and get this output:

```shell
Usage: cg [options] [command]

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

## Usage

### Configuration

#### Setting up an environment

In order to access the GraphQL services you must first create an environment and a tenant.

Environments are just GraphQL endpoints but one environment can have many tenants. To configure a new environment you can run:

```shell
cg env config my-env
```

This will then ask you to enter an endpoint and create a configuration file in your home directory under `.config/cover-cli`. You may also provide the endpoint as a flag to use in automation, check the command help for more information.

There are a few utility commands to manage environments, most should be fairly self-explanatory but if you get stuck you can always use the `-h` flag on any subcommand.

```shell
Usage: cg env [options] [command]

Options:
  -h, --help                display help for command

Commands:
  config [options] <alias>  Configure a new environment
  info <alias>              Show details of a specific environment
  delete <alias>            Remove and environment configuration
  list                      Show a list of all environment aliases
  help [command]            display help for command
```

#### Creating a tenant

Once you have an environment you can use it to create a new tenant using the environment alias you provided in the previous step.

```shell
cg tenant config my-tenant my-env
```

You will be asked for:

* Tenant ID
* Login
* Password

For some more advanced use cases (like some superadmin tenants) you may also need to provide a `client id` you can do this using the `-c` flag.

```shell
cg tenant config my-tenant my-env -c admin
```

Again, there are a bunch of utility methods for managing tenants and the `config` command can be automated using various flags.

```shell
➜ cg tenant config -h
Usage: cg tenant config [options] <alias> <env>

Configure a new tenant

Arguments:
  alias                        The alias you want to use when referencing this tenant in other commands
  env                          The environment this tenant relates to

Options:
  -t, --tenant-id <tenant id>  The configured tenant id
  -y, --yes                    Do not prompt for confirmation before creation
  -u, --username <username>    Username used to get access token for this tenant
  -p, --password <password>    Password used to get access token for this tenant
  -c --client-id <client id>   The client id to use when accessing this client (default: "covergo_crm")
  -h, --help        
```

```shell           display help for command
➜ cg tenant -h
Usage: cg tenant [options] [command]

Options:
  -h, --help                      display help for command

Commands:
  config [options] <alias> <env>  Configure a new tenant
  list [options]                  List tenants
  delete [options] <alias>        Delete a tenant configuration
  info <alias>                    show stored information about tenant
  help [command]                  display help for command
```

### Graph Commands

Currently, the main focus of the library is automating management of products. This can all be found under the `cg graph` subcommand.

```shell
➜ cg graph -h
Usage: cg graph [options] [command]

Options:
  -h, --help         display help for command

Commands:
  product            Manage products
  product-node-type  Manage product node types
  product-tree       Manage product trees
  product-schema     Manage product schemas
  tenant             Manage tenants on the API
  help [command]     display help for command
```

#### Node Types

Products using the new product builder are dependent on the correct node types being available in order for them to work. This shouldn't change very often, but it can be useful to copy or modify node types, like if a new field is added to a node.

> **Warning**
> Copy and import **can** overwrite existing node definitions, double-check before you run these commands

There are three operations available for dealing with node types: `copy`, `export` and `import`.

Copy should be used when we simply want to sync between tenants or environments. Most often this is used when creating new tenants.

```shell
cg graph product-node-types copy tenant-a tenant-b
```

Export will give use the JSON definitions of the node types so that they can be edited and re-imported.

```shell
cg graph product-node-types export tenant-a > node-types.json
```

Once you've edited and made your changes you can either re-import to the same tenant or copy it somewhere else.

```shell
cg graph product-node-types import tenant-a "$(<node-types.json)"
```

#### Product Trees

It's also sometimes useful to be able to copy over entire node trees between environments. As before we have `copy`, `export` and `import` but this time on the `product-tree` subcommand. Depending on the size of the tree this can sometimes take a while.

> **Note**
> Copying a tree does not associate it with a product. Pay attention to the root node output when the command finishes running, we will use that in the next step.

Copying a product tree:

```shell
cg graph product-tree copy tenant-a tenant-b "product/type/version"
```

As with product nodes you can also export/import in order to manipulate the tree in JSON form rather than having to do it via API calls. Useful for mass transformations.

```shell
cg graph product-tree export tenant-a "product/type/version" > nodes.json
```

```shell
cg graph product-tree import tenant-b "$(<nodes.json)"
```

Once we have a new tree imported or copied the script will provide you with the root ID in the final output.

```shell
➜ cg graph product-tree copy dev dev "product/type/version"
Copy product tree `product/type/version` from tenant `dev` to `dev`.

 ████████████████████████████████████████ 100% | ETA: 0s | 44/44

Newly created root node: 65aca46d8a95a4b9f88d98efb0276889

Done!
```

You can then assign this tree to a product using the `cg graph product assign-tree` subcommand detailed in the "Product" subheading below.

#### Product Schema

There's only one option for product schemas and that is `copy` which will take the product schema and associated product ui schema and then copy it to another product.

```shell
cg graph product-schema copy dev product/type/1 uat product/type/1
```

This will 

#### Product

The `cg graph product` subcommand is used for copying entire products between environments. This will include, trees, schemas and of course the product itself.

The product ID provided on the target environment must not exist and the node types the tree is based on must also be there for this to work.

```shell
cg graph product copy dev product/type/1 uat product/type/1
```

Sometimes you may need to reassign a product tree to a given product (including product schemas) so for that there is one more utility method `assign-tree`.

```shell
cg graph product assign-tree dev product/type/version 65aca46d8a95a4b9f88d98efb0276889
```
