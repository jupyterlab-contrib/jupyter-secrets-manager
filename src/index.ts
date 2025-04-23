import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { SecretsManager } from './manager';
import { ISecretsManager } from './token';
import { InMemoryConnector } from './connectors';

/**
 * A basic secret connector extension, that should be disabled to provide a new
 * connector.
 */
const inMemoryConnector: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-secrets-manager:connector',
  description: 'A JupyterLab extension to manage secrets.',
  autoStart: true,
  requires: [ISecretsManager],
  activate: (app: JupyterFrontEnd, manager: ISecretsManager): void => {
    manager.setConnector(new InMemoryConnector());
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
  activate: (app: JupyterFrontEnd): ISecretsManager => {
    console.log('JupyterLab extension jupyter-secrets-manager is activated!');
    return new SecretsManager();
  }
};

export * from './connectors';
export * from './manager';
export * from './token';
export default [inMemoryConnector, manager];
