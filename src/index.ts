import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the jupyter-secrets-manager extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-secrets-manager:plugin',
  description: 'A JupyterLab extension to manage secrets.',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension jupyter-secrets-manager is activated!');
  }
};

export default plugin;
