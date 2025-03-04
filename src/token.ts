import { IDataConnector } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';

export interface ISecret {
  id: string;
  value: string;
  namespace: string;
}

export interface ISecretsConnector extends IDataConnector<ISecret> {}

export const ISecretsConnector = new Token<ISecretsConnector>(
  'jupyter-secret-manager:connector',
  'The secrets manager connector'
);

export interface ISecretsManager {
  get(id: string): Promise<ISecret | undefined>;
  set(secret: ISecret): Promise<void>;
  remove(id: string): Promise<void>;
  list(namespace: string): Promise<string[]>;
}

export const ISecretsManager = new Token<ISecretsManager>(
  'jupyter-secret-manager:manager',
  'The secrets manager'
);
