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

  async set(secret: ISecret): Promise<void> {
    this._connector.save(secret.id, secret);
  }

  async remove(id: string): Promise<void> {
    this._connector.remove(id);
  }

  async list(namespace: string): Promise<string[]> {
    return (await this._connector.list(namespace)).ids;
  }

  private _connector: ISecretsConnector;
}
