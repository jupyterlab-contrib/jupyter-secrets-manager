import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { SecretsManager } from './manager';
import { ISecretsConnector, ISecretsManager } from './token';
import { InMemoryConnector } from './connectors';

/**
 * A basic secret connector extension, that should be disabled to provide a new
 * connector.
 */
const inMemoryConnector: JupyterFrontEndPlugin<ISecretsConnector> = {
  id: 'jupyter-secrets-manager:connector',
  description: 'A JupyterLab extension to manage secrets.',
  autoStart: true,
  provides: ISecretsConnector,
  activate: (app: JupyterFrontEnd): ISecretsConnector => {
    return new InMemoryConnector();
  }
};

/**
 * The secret manager extension.
 */
const manager: JupyterFrontEndPlugin<ISecretsManager> = {
  id: 'jupyter-secrets-manager:manager',
  description: 'A JupyterLab extension to manage secrets.',
  autoStart: true,
  provides: ISecretsManager,
  requires: [ISecretsConnector],
  activate: (
    app: JupyterFrontEnd,
    connector: ISecretsConnector
  ): ISecretsManager => {
    console.log('JupyterLab extension jupyter-secrets-manager is activated!');
    return new SecretsManager({ connector });
  }
};

export * from './connectors';
export * from './token';
export default [inMemoryConnector, manager];
