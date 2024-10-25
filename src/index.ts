import { VectorDatabaseConnectorConstructor } from '@crewdle/web-sdk-types';

import { FaissVectorDatabaseConnector } from './models/FaissVectorDatabaseConnector';
import { IFaissVectorDatabaseOptions } from './models/FaissVectorDatabaseOptions';

/**
 * Get the Faiss Vector Database connector.
 * @param options The options.
 * @returns The Faiss Vector Database connector constructor.
 */
export function getFaissVectorDatabaseConnector(
  options?: IFaissVectorDatabaseOptions
): VectorDatabaseConnectorConstructor {
  if (!options) {
    return FaissVectorDatabaseConnector;
  }

  return class FaissVectorDatabaseConnectorWithInjectedOptions extends FaissVectorDatabaseConnector {
    constructor(dbKey: string) {
      super(dbKey, options);
    }
  };
}

export { FaissVectorDatabaseConnector };
