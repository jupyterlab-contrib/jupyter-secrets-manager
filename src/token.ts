import { IDataConnector } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';

export interface ISecret {
  namespace: string;
  id: string;
  value: string;
}

export interface ISecretsConnector extends Partial<IDataConnector<ISecret>> {}
export interface ISecretsList<T = ISecret> {
  ids: string[];
  values: T[];
}

export const ISecretsConnector = new Token<ISecretsConnector>(
  'jupyter-secret-manager:connector',
  'The secrets manager connector'
);

export interface ISecretsManager {
  get(id: string): Promise<ISecret | undefined>;
  set(id: string, secret: ISecret): Promise<void>;
  remove(id: string): Promise<void>;
  list(namespace: string): Promise<ISecretsList | undefined>;
  attach(
    namespace: string,
    id: string,
    input: HTMLInputElement,
    callback?: (value: string) => void
  ): Promise<void>;
  detach(namespace: string, id: string): void;
  detachAll(namespace: string): Promise<void>;
}

export const ISecretsManager = new Token<ISecretsManager>(
  'jupyter-secret-manager:manager',
  'The secrets manager'
);
