import { PromiseDelegate } from '@lumino/coreutils';

import {
  ISecret,
  ISecretsConnector,
  ISecretsList,
  ISecretsManager
} from './token';

/**
 * The secrets manager namespace.
 */
export namespace SecretsManager {
  /**
   * Secrets manager constructor's options.
   */
  export interface IOptions {
    connector: ISecretsConnector;
  }
}

/**
 * The default secrets manager implementation.
 */
export class SecretsManager implements ISecretsManager {
  /**
   * the secrets manager constructor.
   */
  constructor(options: SecretsManager.IOptions) {
    this._connector = options.connector;
    this._ready = new PromiseDelegate<void>();
    this._ready.resolve();
  }

  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Get a secret given its namespace and ID.
   */
  async get(namespace: string, id: string): Promise<ISecret | undefined> {
    return this._get(Private.buildSecretId(namespace, id));
  }

  /**
   * Set a secret given its namespace and ID.
   */
  async set(namespace: string, id: string, secret: ISecret): Promise<any> {
    return this._set(Private.buildSecretId(namespace, id), secret);
  }

  /**
   * List the secrets for a namespace as a ISecretsList.
   */
  async list(namespace: string): Promise<ISecretsList | undefined> {
    if (!this._connector.list) {
      return;
    }
    await this._ready.promise;
    return await this._connector.list(namespace);
  }

  /**
   * Remove a secret given its namespace and ID.
   */
  async remove(namespace: string, id: string): Promise<void> {
    return this._remove(Private.buildSecretId(namespace, id));
  }

  /**
   * Attach an input to the secrets manager, with its namespace and ID values.
   * An optional callback function can be attached too, which be called when the input
   * is programmatically filled.
   */
  async attach(
    namespace: string,
    id: string,
    input: HTMLInputElement,
    callback?: (value: string) => void
  ): Promise<void> {
    const attachedId = Private.buildSecretId(namespace, id);
    const attachedInput = this._attachedInputs.get(attachedId);

    // Detach the previous input.
    if (attachedInput) {
      this.detach(namespace, id);
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
      this._set(attachedId, { namespace, id, value: input.value });
    }
    input.addEventListener('input', this._onInput);
  }

  /**
   * Detach the input previously attached with its namespace and ID.
   */
  detach(namespace: string, id: string): void {
    this._detach(Private.buildSecretId(namespace, id));
  }

  /**
   * Detach all attached input for a namespace.
   */
  async detachAll(namespace: string): Promise<void> {
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
    if (!this._connector.fetch) {
      return;
    }
    await this._ready.promise;
    return this._connector.fetch(id);
  }

  /**
   * Actually save the secret using the connector.
   */
  private async _set(id: string, secret: ISecret): Promise<any> {
    if (!this._connector.save) {
      return;
    }
    return this._connector.save(id, secret);
  }

  /**
   * Actually remove the secrets using the connector.
   */
  async _remove(id: string): Promise<void> {
    if (!this._connector.remove) {
      return;
    }
    this._connector.remove(id);
  }

  private _onInput = async (e: Event): Promise<void> => {
    // Wait for an hypothetic current password saving.
    await this._ready.promise;
    // Reset the ready status.
    this._ready = new PromiseDelegate<void>();
    const target = e.target as HTMLInputElement;
    const attachedId = target.dataset.secretsId;
    if (attachedId) {
      const splitId = attachedId.split(':');
      const namespace = splitId.shift();
      const id = splitId.join(':');
      if (namespace && id) {
        await this._set(attachedId, { namespace, id, value: target.value });
      }
    }
    // resolve the ready status.
    this._ready.resolve();
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

  private _connector: ISecretsConnector;
  private _attachedInputs = new Map<string, HTMLInputElement>();
  private _ready: PromiseDelegate<void>;
}

namespace Private {
  /**
   * Build the secret id from the namespace and id.
   */
  export function buildSecretId(namespace: string, id: string): string {
    return `${namespace}:${id}`;
  }
}
