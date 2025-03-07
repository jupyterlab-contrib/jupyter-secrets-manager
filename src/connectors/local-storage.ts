import { ISecret, ISecretsConnector, ISecretsList } from '../token';

/**
 * Example connector that save the secrets to the local storage.
 *
 * WARNING: It should not be used in production, since the passwords are stored as plain
 * text in the local storage of the browser.
 */
export class LocalStorageConnector implements ISecretsConnector {
  storage = 'jupyter-secrets:secrets';

  constructor() {
    console.warn(`
The secret connector used currently should not be used in production, since the
passwords are stored as plain text in the local storage of the browser'
    `);
  }

  async fetch(id: string): Promise<ISecret | undefined> {
    const secrets = JSON.parse(localStorage.getItem(this.storage) ?? '{}');
    if (!secrets || !secrets[id]) {
      return;
    }
    return secrets[id];
  }

  async save(id: string, value: ISecret): Promise<any> {
    const secrets = JSON.parse(localStorage.getItem(this.storage) ?? '{}');
    secrets[id] = value;
    localStorage.setItem(this.storage, JSON.stringify(secrets));
  }

  async remove(id: string): Promise<any> {
    const secrets = JSON.parse(localStorage.getItem(this.storage) ?? '{}');
    delete secrets[id];
    localStorage.setItem(this.storage, JSON.stringify(secrets));
  }

  async list(query?: string | undefined): Promise<ISecretsList> {
    const secrets = JSON.parse(localStorage.getItem(this.storage) ?? '{}');
    const initialValue: ISecretsList = { ids: [], values: [] };
    return Object.keys(secrets)
      .filter(key => secrets[key].namespace === query)
      .reduce((acc, cur) => {
        acc.ids.push(cur);
        acc.values.push(secrets[cur]);
        return acc;
      }, initialValue);
  }
}
