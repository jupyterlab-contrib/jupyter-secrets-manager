import {
  ISecret,
  ISecretsConnector,
  ISecretsList,
  ISecretsManager
} from './token';

export namespace SecretsManager {
  export interface IOptions {
    connector: ISecretsConnector;
  }
}
export class SecretsManager implements ISecretsManager {
  constructor(options: SecretsManager.IOptions) {
    this._connector = options.connector;
  }

  async get(id: string): Promise<ISecret | undefined> {
    return this._connector.fetch(id);
  }

  async set(id: string, secret: ISecret): Promise<void> {
    this._connector.save(id, secret);
  }

  async remove(id: string): Promise<void> {
    this._connector.remove(id);
  }

  async list(namespace: string): Promise<ISecretsList> {
    return await this._connector.list(namespace);
  }

  private _onchange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    const attachedId = target.dataset.secretsId;
    if (attachedId) {
      const splitId = attachedId.split(':');
      const namespace = splitId.shift();
      const id = splitId.join(':');
      if (namespace && id) {
        this.set(attachedId, { namespace, id, value: target.value });
      }
    }
  };

  async attach(
    namespace: string,
    id: string,
    input: HTMLInputElement,
    callback?: (value: string) => void
  ): Promise<void> {
    const attachedId = `${namespace}:${id}`;
    const attachedInput = this._attachedInputs.get(attachedId);

    // Detach the previous input.
    if (attachedInput) {
      this.detach(namespace, id);
    }
    this._attachedInputs.set(attachedId, input);

    input.dataset.secretsId = attachedId;
    const secret = await this.get(attachedId);
    if (!input.value && secret) {
      // Fill the password if the input is empty and a value is fetched by the data
      // connector.
      input.value = secret.value;
      input.dispatchEvent(new Event('change'));
      if (callback) {
        callback(secret.value);
      }
    } else if (input.value && input.value !== secret?.value) {
      // Otherwise save the current input value using the data connector.
      this.set(attachedId, { namespace, id, value: input.value });
    }
    input.addEventListener('change', this._onchange);
  }

  detach(namespace: string, id: string): void {
    const attachedId = `${namespace}:${id}`;
    this._detach(attachedId);
  }

  async detachAll(namespace: string): Promise<void> {
    for (const id of this._attachedInputs.keys()) {
      if (id.startsWith(`${namespace}:`)) {
        this._detach(id);
      }
    }
  }

  private _detach(attachedId: string): void {
    const input = this._attachedInputs.get(attachedId);
    if (input) {
      input.removeEventListener('change', this._onchange);
    }
    this._attachedInputs.delete(attachedId);
  }

  private _connector: ISecretsConnector;
  private _attachedInputs = new Map<string, HTMLInputElement>();
}
