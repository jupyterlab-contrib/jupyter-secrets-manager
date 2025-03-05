import { ISecret, ISecretsConnector, ISecretsManager } from './token';

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

  async list(namespace: string): Promise<string[]> {
    return (await this._connector.list(namespace)).ids;
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
    input: HTMLInputElement
  ): Promise<void> {
    const attachedId = `${namespace}:${id}`;
    const attachedInput = this._attachedInputs.get(attachedId);

    // Do not attach the input if it is already attached.
    if (attachedInput === input) {
      return;
    }

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
    } else if (input.value && input.value !== secret?.value) {
      // Otherwise save the current input value using the data connector.
      this.set(attachedId, { namespace, id, value: input.value });
    }
    input.addEventListener('change', this._onchange);
  }

  detach(namespace: string, id: string): void {
    const attachedId = `${namespace}:${id}`;
    const input = this._attachedInputs.get(attachedId);
    if (input) {
      input.removeEventListener('change', this._onchange);
    }
    this._attachedInputs.delete(attachedId);
  }

  async detachAll(namespace: string): Promise<void> {
    const attachedIds = await this.list(namespace);
    attachedIds.forEach(id => {
      this.detach(namespace, id);
    });
  }

  private _connector: ISecretsConnector;
  private _attachedInputs = new Map<string, HTMLInputElement>();
}
