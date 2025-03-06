import { ISecret, ISecretsConnector } from '../token';

/**
 * An in memory password connector to store passwords during the session.
 * Refreshing the page clear the passwords.
 *
 * This is the default implementation of ISecretsConnector.
 */
export class InMemoryConnector implements ISecretsConnector {
  async fetch(id: string): Promise<ISecret | undefined> {
    return this._secrets.get(id);
  }

  async save(id: string, value: ISecret): Promise<any> {
    this._secrets.set(id, value);
  }

  async remove(id: string): Promise<any> {
    this._secrets.delete(id);
  }

  async list(
    query?: string | undefined
  ): Promise<{ ids: string[]; values: ISecret[] }> {
    const ids: string[] = [];
    this._secrets.forEach((value, key) => {
      if (value.namespace === query) {
        ids.push(key);
      }
    });
    return { ids, values: [] };
  }

  private _secrets = new Map<string, ISecret>();
}
