import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IDataConnector } from '@jupyterlab/statedb';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';

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
 * The secrets manager interface.
 */
export interface ISecretsManager {
  /**
   * Set the connector to use with the manager.
   *
   * NOTE:
   * If several extensions try to set the connector, the manager will be locked.
   * This is to prevent misconfiguration of competing plugins or MITM attacks.
   */
  setConnector(value: ISecretsConnector): void;
  /**
   * A signal emitting when the field visibility setting has changed.
   */
  readonly fieldVisibilityChanged: ISignal<ISecretsManager, boolean>;
  /**
   * Get the visibility of the secret fields.
   */
  readonly secretFieldsVisibility: boolean;
  /**
   * Get a secret given its namespace and ID.
   */
  get(
    token: symbol,
    namespace: string,
    id: string
  ): Promise<ISecret | undefined>;
  /**
   * Set a secret given its namespace and ID.
   */
  set(
    token: symbol,
    namespace: string,
    id: string,
    secret: ISecret
  ): Promise<any>;
  /**
   * Remove a secret given its namespace and ID.
   */
  remove(token: symbol, namespace: string, id: string): Promise<void>;
  /**
   * List the secrets for a namespace as a ISecretsList.
   */
  list(token: symbol, namespace: string): Promise<ISecretsList | undefined>;
  /**
   * Attach an input to the secrets manager, with its namespace and ID values.
   * An optional callback function can be attached too, which be called when the input
   * is programmatically filled.
   */
  attach(
    token: symbol,
    namespace: string,
    id: string,
    input: HTMLInputElement,
    callback?: (value: string) => void
  ): Promise<void>;
  /**
   * Detach the input previously attached with its namespace and ID.
   */
  detach(token: symbol, namespace: string, id: string): Promise<void>;
  /**
   * Detach all attached input for a namespace.
   */
  detachAll(token: symbol, namespace: string): Promise<void>;
}

export namespace ISecretsManager {
  /**
   * The plugin factory.
   * The argument of the factory is a symbol (unique identifier), and it returns a
   * plugin.
   */
  export type PluginFactory<T> = (token: symbol) => JupyterFrontEndPlugin<T>;
}

/**
 * The secrets manager token.
 */
export const ISecretsManager = new Token<ISecretsManager>(
  'jupyter-secret-manager:manager',
  'The secrets manager'
);
