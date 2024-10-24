import { VectorDatabaseConnectorConstructor } from '@crewdle/web-sdk-types';
import { FaissVectorDatabaseConnector } from './models/FaissVectorDatabaseConnector';
import { IFaissVectorDatabaseOptions } from './models/FaissVectorDatabaseOptions';
/**
 * Get the Faiss Vector Database connector.
 * @param options The options.
 * @returns The Faiss Vector Database connector constructor.
 */
export declare function getFaissVectorDatabaseConnector(options?: IFaissVectorDatabaseOptions): VectorDatabaseConnectorConstructor;
export { FaissVectorDatabaseConnector };
