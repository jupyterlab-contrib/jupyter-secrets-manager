import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';

import {
  ISecret,
  ISecretsConnector,
  ISecretsList,
  ISecretsManager
} from './token';
import { ISignal, Signal } from '@lumino/signaling';

interface IOptions {
  showSecretFields?: boolean;
}

/**
 * The default secrets manager.
 */
export class SecretsManager implements ISecretsManager {
  /**
   * The secrets manager constructor.
   */
  constructor(options: IOptions) {
    this._storing = new PromiseDelegate<void>();
    this._storing.resolve();
    Private.setSecretFieldsVisibility(options.showSecretFields ?? false);

    // If the secret fields are hidden from constructor, this setting comes from
    // PageConfig, we need to lock the fields visibility.
    if (options.showSecretFields === false) {
      Private.lockFieldsVisibility();
    }
  }

  /**
   * Set the connector to use with the manager.
   *
   * NOTE:
   * If several extensions try to set the connector, the manager will be locked.
   * This is to prevent misconfiguration of competing plugins or MITM attacks.
   */
  setConnector(value: ISecretsConnector): void {
    Private.setConnector(value);
    this._ready.resolve();
  }

  /**
   * A promise that resolves when the connector is set.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * A promise that locks the connector access during storage.
   */
  protected get storing(): Promise<void> {
    return this._storing.promise;
  }

  /**
   * A signal emitting when the field visibility setting has changed.
   */
  get fieldVisibilityChanged(): ISignal<this, boolean> {
    return this._fieldsVisibilityChanged;
  }

  /**
   * Get the visibility of the secret fields.
   */
  get secretFieldsVisibility(): boolean {
    return Private.getSecretFieldsVisibility();
  }

  /**
   * Set the visibility of the secret fields.
   * The visibility cannot be set if it is locked (from page config).
   */
  set secretFieldsVisibility(value: boolean) {
    if (Private.setSecretFieldsVisibility(value)) {
      this._fieldsVisibilityChanged.emit(Private.getSecretFieldsVisibility());
    }
  }

  /**
   * Get a secret given its namespace and ID.
   */
  async get(
    token: symbol,
    namespace: string,
    id: string
  ): Promise<ISecret | undefined> {
    Private.checkNamespace(token, namespace);
    await Promise.all([this.ready, this.storing]);
    return Private.get(Private.buildConnectorId(namespace, id));
  }

  /**
   * Set a secret given its namespace and ID.
   */
  async set(
    token: symbol,
    namespace: string,
    id: string,
    secret: ISecret
  ): Promise<any> {
    Private.checkNamespace(token, namespace);
    await this.ready;
    return Private.set(Private.buildConnectorId(namespace, id), secret);
  }

  /**
   * List the secrets for a namespace as a ISecretsList.
   */
  async list(
    token: symbol,
    namespace: string
  ): Promise<ISecretsList | undefined> {
    Private.checkNamespace(token, namespace);
    await Promise.all([this.ready, this.storing]);
    return Private.list(namespace);
  }

  /**
   * Remove a secret given its namespace and ID.
   */
  async remove(token: symbol, namespace: string, id: string): Promise<void> {
    Private.checkNamespace(token, namespace);
    await this.ready;
    return Private.remove(Private.buildConnectorId(namespace, id));
  }

  /**
   * Attach an input to the secrets manager, with its namespace and ID values.
   * An optional callback function can be attached too, which be called when the input
   * is programmatically filled.
   */
  async attach(
    token: symbol,
    namespace: string,
    id: string,
    input: HTMLInputElement,
    callback?: (value: string) => void
  ): Promise<void> {
    Private.checkNamespace(token, namespace);
    const attachedId = Private.buildConnectorId(namespace, id);
    const attachedInput = Private.inputs.get(attachedId);

    // Detach the previous input.
    if (attachedInput) {
      this.detach(token, namespace, id);
    }
    Private.inputs.set(attachedId, input);
    Private.secretPath.set(input, { namespace, id });
    const secret = await Private.get(attachedId);
    if (!input.value && secret) {
      // Fill the password if the input is empty and a value is fetched by the data
      // connector.
      input.value = secret.value;
      input.dispatchEvent(new Event('input'));
      if (callback) {
        callback(secret.value);
      }
    } else if (input.value && input.value !== secret?.value) {
      // Otherwise save the current input value using the data connector.
      await this.ready;
      Private.set(attachedId, { namespace, id, value: input.value });
    }
    input.addEventListener('input', this._onInput);
  }

  /**
   * Detach the input previously attached with its namespace and ID.
   */
  async detach(token: symbol, namespace: string, id: string): Promise<void> {
    Private.checkNamespace(token, namespace);
    this._detach(Private.buildConnectorId(namespace, id));
  }

  /**
   * Detach all attached input for a namespace.
   */
  async detachAll(token: symbol, namespace: string): Promise<void> {
    Private.checkNamespace(token, namespace);
    for (const path of Private.secretPath.values()) {
      if (path.namespace === namespace) {
        this._detach(Private.buildConnectorId(path.namespace, path.id));
      }
    }
  }

  private _onInput = async (e: Event): Promise<void> => {
    // Wait for an hypothetic current password storing.
    await this.storing;
    // Reset the storing status.
    this._storing = new PromiseDelegate<void>();
    const target = e.target as HTMLInputElement;
    const { namespace, id } = Private.secretPath.get(target) ?? {};
    if (namespace && id) {
      const attachedId = Private.buildConnectorId(namespace, id);
      await this.ready;
      await Private.set(attachedId, { namespace, id, value: target.value });
    }
    // resolve the storing status.
    this._storing.resolve();
  };

  /**
   * Actually detach of an input.
   */
  private _detach(attachedId: string): void {
    const input = Private.inputs.get(attachedId);
    if (!input) {
      return;
    }
    input.removeEventListener('input', this._onInput);
    Private.secretPath.delete(input);
    Private.inputs.delete(attachedId);
  }

  private _ready = new PromiseDelegate<void>();
  private _storing: PromiseDelegate<void>;
  private _fieldsVisibilityChanged = new Signal<this, boolean>(this);
}

/**
 * Freeze the secrets manager methods, to prevent extensions from overwriting them.
 */
Object.freeze(SecretsManager.prototype);

/**
 * The secrets manager namespace.
 */
export namespace SecretsManager {
  /**
   * A function that protects the secrets namespace of the signed plugin from
   * other plugins.
   *
   * @param id - the secrets namespace, which must match the plugin ID to prevent an
   * extension to use an other extension namespace.
   * @param factory - a plugin factory, taking a symbol as argument and returning a
   * plugin.
   * @returns - the plugin to activate.
   */
  export function sign<T>(
    id: string,
    factory: ISecretsManager.PluginFactory<T>
  ): JupyterFrontEndPlugin<T> {
    const { lock, isLocked, namespaces: plugins, symbols } = Private;
    const { isDisabled } = PageConfig.Extension;
    if (isLocked()) {
      throw new Error('Secrets manager is locked, check errors.');
    }
    if (isDisabled('jupyter-secrets-manager:manager')) {
      // If the secrets manager is disabled, we need to lock the manager, but not
      // throw an error, to let the plugin get activated anyway.
      console.warn('Secrets manager is disabled.');
      lock();
    }
    if (isDisabled(id)) {
      lock(`Sign error: plugin ${id} is disabled.`);
    }
    if (symbols.has(id)) {
      lock(`Sign error: another plugin signed as "${id}".`);
    }
    const token = Symbol(id);
    const plugin = factory(token);
    if (id !== plugin.id) {
      lock(`Sign error: plugin ID mismatch "${plugin.id}"≠"${id}".`);
    }
    plugins.set(token, id);
    symbols.set(id, token);
    return plugin;
  }
}

namespace Private {
  /**
   * Internal 'locked' status.
   */
  let locked: boolean = false;

  /**
   * The namespace associated to a symbol.
   */
  export const namespaces = new Map<symbol, string>();

  /**
   * The symbol associated to a namespace.
   */
  export const symbols = new Map<string, symbol>();

  /**
   * Lock the manager.
   *
   * @param message - the error message to throw.
   */
  export function lock(message?: string): void {
    locked = true;
    if (message) {
      throw new Error(message);
    }
  }

  /**
   * Check if the manager is locked.
   *
   * @returns - whether the manager is locked or not.
   */
  export function isLocked(): boolean {
    return locked;
  }

  /**
   *
   * @param token - the token associated to the extension when signin.
   * @param namespace - the namespace to check with this token.
   */
  export function checkNamespace(token: symbol, namespace: string): void {
    if (isLocked() || namespaces.get(token) !== namespace) {
      throw new Error(
        `The secrets namespace ${namespace} is not available with the provided token`
      );
    }
  }

  /**
   * Connector used by the manager.
   */
  let connector: ISecretsConnector | null = null;

  /**
   * Set the connector.
   */
  export function setConnector(value: ISecretsConnector) {
    if (connector !== null) {
      lock('A secrets manager connector already exists.');
    }
    connector = value;
  }

  /**
   * Fetch the secret from the connector.
   */
  export async function get(id: string): Promise<ISecret | undefined> {
    if (!connector?.fetch) {
      return;
    }
    return connector.fetch(id);
  }

  /**
   * List the secret from the connector.
   */
  export async function list(
    namespace: string
  ): Promise<ISecretsList | undefined> {
    if (!connector?.list) {
      return;
    }
    return connector.list(namespace);
  }
  /**
   * Save the secret using the connector.
   */
  export async function set(id: string, secret: ISecret): Promise<any> {
    if (!connector?.save) {
      return;
    }
    return connector.save(id, secret);
  }

  /**
   * Remove the secrets using the connector.
   */
  export async function remove(id: string): Promise<void> {
    if (!connector?.remove) {
      return;
    }
    return connector.remove(id);
  }

  /**
   * Lock the fields visibility value.
   */
  let fieldsVisibilityLocked = false;
  export function lockFieldsVisibility() {
    fieldsVisibilityLocked = true;
  }

  /**
   * Get/set the fields visibility.
   */
  let secretFieldsVisibility = false;
  export function getSecretFieldsVisibility(): boolean {
    return secretFieldsVisibility;
  }
  export function setSecretFieldsVisibility(value: boolean): boolean {
    if (!fieldsVisibilityLocked && value !== secretFieldsVisibility) {
      secretFieldsVisibility = value;
      return true;
    }
    return false;
  }

  /**
   * The secret path type.
   */
  export type SecretPath = {
    namespace: string;
    id: string;
  };

  /**
   * The inputs elements attached to the manager.
   */
  export const inputs = new Map<string, HTMLInputElement>();

  /**
   * The secret path associated to an input.
   */
  export const secretPath = new Map<HTMLInputElement, SecretPath>();

  /**
   * Build the secret id from the namespace and id.
   */
  export function buildConnectorId(namespace: string, id: string): string {
    return `${namespace}:${id}`;
  }
}
