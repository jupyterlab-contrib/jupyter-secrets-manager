import React, { useState, useEffect } from 'react';
import { ReactWidget } from '@jupyterlab/apputils';

import '../../style/base.css';
import { ISecret, ISecretsManager } from '../token';

interface ISecretsPanelProps {
  manager: ISecretsManager;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
  </svg>
);

const SecretsPanel: React.FC<ISecretsPanelProps> = ({ manager }) => {
  const [secrets, setSecrets] = useState<ISecret[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [currentNamespace, setCurrentNamespace] = useState('default');
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  const fetchNamespaces = async () => {
    try {
      const namespacesList = await manager.listNamespaces();
      if (namespacesList) {
        setNamespaces(namespacesList);
      }
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    }
  };

  const fetchSecrets = async () => {
    try {
      const secretsList = await manager.list(currentNamespace);
      if (secretsList) {
        setSecrets(secretsList.values);
      }
    } catch (error) {
      console.error('Error fetching secrets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNamespaces();
  }, []);

  useEffect(() => {
    fetchSecrets();
  }, [currentNamespace]);

  const toggleSecretVisibility = (secretId: string) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(secretId)) {
        newSet.delete(secretId);
      } else {
        newSet.add(secretId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return <div>Loading secrets...</div>;
  }

  return (
    <div className="jp-SecretsPanel">
      <div className="jp-SecretsPanel-header">
        <h2>Secrets Manager</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="jp-SecretsPanel-namespace-select"
            value={currentNamespace}
            onChange={e => setCurrentNamespace(e.target.value)}
          >
            {namespaces.map(namespace => (
              <option key={namespace} value={namespace}>
                {namespace}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="jp-SecretsPanel-content">
        {secrets.length === 0 ? (
          <div className="jp-SecretsPanel-empty">No secrets found.</div>
        ) : (
          <ul className="jp-SecretsPanel-list">
            {secrets.map(secret => (
              <li key={secret.id} className="jp-SecretsPanel-list-item">
                <span className="jp-SecretsPanel-secret-name">{secret.id}</span>
                <span
                  className={`jp-SecretsPanel-secret-value ${!visibleSecrets.has(secret.id) ? 'hidden' : ''}`}
                >
                  {visibleSecrets.has(secret.id) ? secret.value : '••••••••'}
                </span>
                <button
                  className="jp-SecretsPanel-eye-button"
                  onClick={() => toggleSecretVisibility(secret.id)}
                  title={
                    visibleSecrets.has(secret.id)
                      ? 'Hide secret'
                      : 'Show secret'
                  }
                >
                  {visibleSecrets.has(secret.id) ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export interface ISecretsManagerWidgetOptions {
  manager: ISecretsManager;
}

export class SecretsManagerWidget extends ReactWidget {
  constructor(options: ISecretsManagerWidgetOptions) {
    super();
    this.addClass('jp-SecretsManagerWidget');
    this._manager = options.manager;
  }

  render(): JSX.Element {
    return <SecretsPanel manager={this._manager} />;
  }

  private _manager: ISecretsManager;
}
