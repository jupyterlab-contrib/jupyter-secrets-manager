import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { SecretsManager } from './manager';
import { ISecretsConnector, ISecretsManager } from './token';
import { InMemoryConnector } from './connectors';
import { SecretsManagerWidget } from './components/SecretsPanel';
import { Panel } from '@lumino/widgets';
import { lockIcon } from '@jupyterlab/ui-components';

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
    const secretsManager = new SecretsManager({ connector });
    const panel = new Panel();
    panel.id = 'jupyter-secrets-manager:panel';
    panel.title.icon = lockIcon;
    const secretsManagerWidget = new SecretsManagerWidget({
      manager: secretsManager
    });
    panel.addWidget(secretsManagerWidget);
    app.shell.add(panel, 'left');

    return secretsManager;
  }
};

export * from './connectors';
export * from './token';
export default [inMemoryConnector, manager];
