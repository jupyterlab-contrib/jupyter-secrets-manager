import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PageConfig } from '@jupyterlab/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';

import {
  ISecret,
  ISecretsConnector,
  ISecretsList,
  ISecretsManager
} from './token';

/**
 * The default secrets manager.
 */
export class SecretsManager implements ISecretsManager {
  /**
   * the secrets manager constructor.
   */
  constructor() {
    this._storing = new PromiseDelegate<void>();
    this._storing.resolve();
  }

  /**
   * Set the connector to use with the manager.
   *
   * NOTE:
   * If several extensions try to set the connector, the manager will be locked.
   * This is to prevent malicious extensions to get passwords when they are saved.
   */
  setConnector(value: ISecretsConnector): void {
    Private.setConnector(value);
    this._ready.resolve();
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Get a secret given its namespace and ID.
   */
  async get(
    token: symbol,
    namespace: string,
    id: string
  ): Promise<ISecret | undefined> {
    this._check(token, namespace);
    await Promise.all([this._ready.promise, await this._storing.promise]);
    return this._get(Private.buildConnectorId(namespace, id));
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
    this._check(token, namespace);
    await this._ready.promise;
    return this._set(Private.buildConnectorId(namespace, id), secret);
  }

  /**
   * List the secrets for a namespace as a ISecretsList.
   */
  async list(
    token: symbol,
    namespace: string
  ): Promise<ISecretsList | undefined> {
    this._check(token, namespace);
    await Promise.all([this._ready.promise, await this._storing.promise]);
    const connector = Private.getConnector();
    if (!connector?.list) {
      return;
    }
    await this._ready.promise;
    return connector.list(namespace);
  }

  /**
   * Remove a secret given its namespace and ID.
   */
  async remove(token: symbol, namespace: string, id: string): Promise<void> {
    this._check(token, namespace);
    await this._ready.promise;
    return this._remove(Private.buildConnectorId(namespace, id));
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
    this._check(token, namespace);
    const attachedId = Private.buildConnectorId(namespace, id);
    const attachedInput = this._attachedInputs.get(attachedId);

    // Detach the previous input.
    if (attachedInput) {
      this.detach(token, namespace, id);
    }
    this._attachedInputs.set(attachedId, input);

    input.dataset.secretsId = attachedId;
    const secret = await this._get(attachedId);
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
      await this._ready.promise;
      this._set(attachedId, { namespace, id, value: input.value });
    }
    input.addEventListener('input', this._onInput);
  }

  /**
   * Detach the input previously attached with its namespace and ID.
   */
  detach(token: symbol, namespace: string, id: string): void {
    this._check(token, namespace);
    this._detach(Private.buildConnectorId(namespace, id));
  }

  /**
   * Detach all attached input for a namespace.
   */
  async detachAll(token: symbol, namespace: string): Promise<void> {
    this._check(token, namespace);
    for (const id of this._attachedInputs.keys()) {
      if (id.startsWith(`${namespace}:`)) {
        this._detach(id);
      }
    }
  }

  /**
   * Actually fetch the secret from the connector.
   */
  private async _get(id: string): Promise<ISecret | undefined> {
    const connector = Private.getConnector();
    if (!connector?.fetch) {
      return;
    }
    return connector.fetch(id);
  }

  /**
   * Actually save the secret using the connector.
   */
  private async _set(id: string, secret: ISecret): Promise<any> {
    const connector = Private.getConnector();
    if (!connector?.save) {
      return;
    }
    return connector.save(id, secret);
  }

  /**
   * Actually remove the secrets using the connector.
   */
  async _remove(id: string): Promise<void> {
    const connector = Private.getConnector();
    if (!connector?.remove) {
      return;
    }
    return connector.remove(id);
  }

  private _onInput = async (e: Event): Promise<void> => {
    // Wait for an hypothetic current password storing.
    await this._storing.promise;
    // Reset the storing status.
    this._storing = new PromiseDelegate<void>();
    const target = e.target as HTMLInputElement;
    const attachedId = target.dataset.secretsId;
    if (attachedId) {
      const splitId = attachedId.split(':');
      const namespace = splitId.shift();
      const id = splitId.join(':');
      if (namespace && id) {
        await this._ready.promise;
        await this._set(attachedId, { namespace, id, value: target.value });
      }
    }
    // resolve the storing status.
    this._storing.resolve();
  };

  /**
   * Actually detach of an input.
   */
  private _detach(attachedId: string): void {
    const input = this._attachedInputs.get(attachedId);
    if (input) {
      input.removeEventListener('input', this._onInput);
    }
    this._attachedInputs.delete(attachedId);
  }

  private _check(token: symbol, namespace: string): void {
    if (Private.isLocked() || Private.namespace.get(token) !== namespace) {
      throw new Error(
        `The secrets namespace ${namespace} is not available with the provided token`
      );
    }
  }

  private _attachedInputs = new Map<string, HTMLInputElement>();
  private _ready = new PromiseDelegate<void>();
  private _storing: PromiseDelegate<void>;
}

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
    const { lock, isLocked, namespace: plugins, symbols } = Private;
    const { isDisabled } = PageConfig.Extension;
    if (isLocked()) {
      throw new Error('Secrets manager is locked, check errors.');
    }
    if (isDisabled('jupyter-secrets-manager:manager')) {
      lock('Secret registry is disabled.');
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
  export const namespace = new Map<symbol, string>();

  /**
   * The symbol associated to a namespace.
   */
  export const symbols = new Map<string, symbol>();

  /**
   * Lock the manager.
   *
   * @param message - the error message to throw.
   */
  export function lock(message: string) {
    locked = true;
    throw new Error(message);
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
   * Get the connector.
   */
  export function getConnector(): ISecretsConnector | null {
    return connector;
  }

  /**
   * Build the secret id from the namespace and id.
   */
  export function buildConnectorId(namespace: string, id: string): string {
    return `${namespace}:${id}`;
  }
}
