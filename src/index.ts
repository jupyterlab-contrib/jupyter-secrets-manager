import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { SecretsManager } from './manager';
import { ISecretsConnector, ISecretsManager } from './token';

/**
 * Initialization data for the jupyter-secrets-manager extension.
 */
const plugin: JupyterFrontEndPlugin<ISecretsManager> = {
  id: 'jupyter-secrets-manager:plugin',
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

export * from './token';
export default plugin;
