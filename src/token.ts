import { IDataConnector } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';

/**
 * The secret object interface.
 */
export interface ISecret {
  namespace: string;
  id: string;
  value: string;
}

/**
 * The secret connector interface.
 */
export interface ISecretsConnector extends Partial<IDataConnector<ISecret>> {}

/**
 * The secrets list interface.
 */
export interface ISecretsList<T = ISecret> {
  ids: string[];
  values: T[];
}

/**
 * The secrets connector token.
 */
export const ISecretsConnector = new Token<ISecretsConnector>(
  'jupyter-secret-manager:connector',
  'The secrets connector'
);

/**
 * The secrets manager interface.
 */
export interface ISecretsManager {
  /**
   * Get a secret given its namespace and ID.
   */
  get(namespace: string, id: string): Promise<ISecret | undefined>;
  /**
   * Set a secret given its namespace and ID.
   */
  set(namespace: string, id: string, secret: ISecret): Promise<any>;
  /**
   * Remove a secret given its namespace and ID.
   */
  remove(namespace: string, id: string): Promise<void>;
  /**
   * List the secrets for a namespace as a ISecretsList.
   */
  list(namespace: string): Promise<ISecretsList | undefined>;
  /**
   * Attach an input to the secrets manager, with its namespace and ID values.
   * An optional callback function can be attached too, which be called when the input
   * is programmatically filled.
   */
  attach(
    namespace: string,
    id: string,
    input: HTMLInputElement,
    callback?: (value: string) => void
  ): Promise<void>;
  /**
   * Detach the input previously attached with its namespace and ID.
   */
  detach(namespace: string, id: string): void;
  /**
   * Detach all attached input for a namespace.
   */
  detachAll(namespace: string): Promise<void>;
}

/**
 * The secrets manager token.
 */
export const ISecretsManager = new Token<ISecretsManager>(
  'jupyter-secret-manager:manager',
  'The secrets manager'
);
