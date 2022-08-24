# Cover CLI

This package provides a simple command line interface for CoverGo.

## Prerequisites

* nodejs

## Installation

Currently, only manual installation is supported. I will look into proper packaging on NPM at a later date.

```bash
git clone https://github.com/CoverGo/cover-cli
npm install 
cd cover-cli
chmod +x ./*
```

Alternatively you can give `+x` to just the cli commands you need.

## Usage

### Configuration

In order to access the GraphQL services you must first create a tenant.

Tenants can be created using the `config tenant` sub-command. Full usage can be found using the `--help` flag.

```bash
./cgcli config tenant create -t [tenant_id] -c [client_id] -u [tenant_username] -p [tenant_password] -e [graphql_endpoint] [tenant_alias]
```

Once you've created a tenant it will be stored in the `${HOME}/.config/cover-cli` directory. You will see the full path it was saved to when you execute the create command.

The most important argument provided in the previous command is the `tenant_alias` argument. You can use this to refer to the tenant in the future. For instance, if you want to see the configured tenant you can use the `tenant info` sub-command.

```bash
./cgcli tenant info [tenant_alias]
```

Finally, in order to use the GraphQL services you must fetch a token.

```bash
./cgcli tenant auth [tenant_alias]
```

### Graph Commands

There are currently three commands available. All related to moving product trees around. `import`, `export` and `copy`, the latter being a shortcut for the other two.

| Command | Description                                         | Example                                                                                     |
|---------|-----------------------------------------------------|---------------------------------------------------------------------------------------------|
| export  | Export a product tree or tree node types to stdout  | ./cgcli graph export product-nodes [tenant_alias] [tree node ID] > nodes.json               |
| import  | Import a product tree or tree node types from stdin | ./cgcli graph import product-nodes [tenant_alias] "$(<nodes.json)"                          |
| copy    | Copy a product tree or tree node types              | ./cgcli graph copy product-nodes [source tenant_alias] [target tenant alias] [tree node ID] |
