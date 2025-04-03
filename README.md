# jupyter_secrets_manager

[![Github Actions Status](https://github.com/jupyterlab-contrib/jupyter-secrets-manager/workflows/Build/badge.svg)](https://github.com/jupyterlab-contrib/jupyter-secrets-manager/actions/workflows/build.yml)

A JupyterLab extension to manage secrets.

> [!WARNING]
> This extension is still very much experimental. Features and APIs are subject to change quickly.

## Overview

The two main plugins of this extension are the `SecretsManager` and the `SecretsConnector`.

### Secrets manager

The manager be the only interface for extensions / users to retrieve secrets.

It knows only one connector, its role is to act as an interface between an extension / user / input
and the secrets connector.

Extension should not query directly the secrets connector. All requests for secrets must go through the manager.

### Secrets connector

The secrets connector is the one that fetches and saves secrets. It partially implements the `Jupyterlab`
[IDataConnector](https://github.com/jupyterlab/jupyterlab/blob/a911ae622d507313e26da77f1adc042c0b60b962/packages/statedb/src/dataconnector.ts#L28).
Given a secrets ID, the connector should return the associated secrets.

By default, the extension provides an 'in memory' secrets connector: secrets are stored only during the current session.

The secrets connector is provided by a plugin (with a token). This means that a third party extension can disable the
default one and provide a new connector (to fetch secrets from a remote server for example).

## Features

### Associating inputs and secrets

Any third party extension can associate an HTML input element to a secret, using the `attach()` method of the manager.
It requires a `namespace` and `id` to link the input with a "unique" ID.
This association should be done when the input is attached to the DOM.

Associating an input to an `namespace`/`id` triggers a fetch on the secrets connector. If a secrets is fetched, the
input is filled with the value of that secret.

When the user updates manually the input, it triggers a save of the secret by the secrets connector.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyter_secrets_manager
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyter_secrets_manager
```

## Contributing

### Development install

Note: You will need NodeJS to build the extension package.

The `jlpm` command is JupyterLab's pinned version of
[yarn](https://yarnpkg.com/) that is installed with JupyterLab. You may use
`yarn` or `npm` in lieu of `jlpm` below.

```bash
# Clone the repo to your local environment
# Change directory to the jupyter_secrets_manager directory
# Install package in development mode
pip install -e "."
# Link your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite
# Rebuild extension Typescript source after making changes
jlpm build
```

You can watch the source directory and run JupyterLab at the same time in different terminals to watch for changes in the extension's source and automatically rebuild the extension.

```bash
# Watch the source directory in one terminal, automatically rebuilding when needed
jlpm watch
# Run JupyterLab in another terminal
jupyter lab
```

With the watch command running, every saved change will immediately be built locally and available in your running JupyterLab. Refresh JupyterLab to load the change in your browser (you may need to wait several seconds for the extension to be rebuilt).

By default, the `jlpm build` command generates the source maps for this extension to make it easier to debug using the browser dev tools. To also generate source maps for the JupyterLab core extensions, you can run the following command:

```bash
jupyter lab build --minimize=False
```

### Development uninstall

```bash
pip uninstall jupyter_secrets_manager
```

In development mode, you will also need to remove the symlink created by `jupyter labextension develop`
command. To find its location, you can run `jupyter labextension list` to figure out where the `labextensions`
folder is located. Then you can remove the symlink named `jupyter-secrets-manager` within that folder.

### Testing the extension

#### Frontend tests

This extension is using [Jest](https://jestjs.io/) for JavaScript code testing.

To execute them, execute:

```sh
jlpm
jlpm test
```

#### Integration tests

This extension uses [Playwright](https://playwright.dev/docs/intro) for the integration tests (aka user level tests).
More precisely, the JupyterLab helper [Galata](https://github.com/jupyterlab/jupyterlab/tree/master/galata) is used to handle testing the extension in JupyterLab.

More information are provided within the [ui-tests](./ui-tests/README.md) README.

### Packaging the extension

See [RELEASE](RELEASE.md)
