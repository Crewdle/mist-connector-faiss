import { IIndex, ISearchResult, IVectorDatabaseConnector } from '@crewdle/web-sdk-types';
import { IFaissVectorDatabaseOptions } from './FaissVectorDatabaseOptions';
/**
 * The Faiss vector database connector.
 */
export declare class FaissVectorDatabaseConnector implements IVectorDatabaseConnector {
    private readonly dbKey;
    private readonly options?;
    /**
     * The Faiss index.
     * @ignore
     */
    private index?;
    /**
     * The documents in the database.
     * @ignore
     */
    private documents;
    /**
     * The indexes in the database.
     * @ignore
     */
    private indexes;
    /**
     * The base folder.
     * @ignore
     */
    private baseFolder?;
    /**
     * The constructor.
     */
    constructor(dbKey: string, options?: IFaissVectorDatabaseOptions | undefined);
    /**
     * Get the content of the database.
     * @returns The content of the database.
     */
    getBuffer(): ArrayBuffer;
    /**
     * Search for the k nearest vectors.
     * @param vector The vector to search for.
     * @param k The number of nearest vectors to return.
     * @param minRelevance The minimum relevance of the vectors (default 0).
     * @param contentSize The size of the content to return (content +/- contentSize, default 0).
     * @returns The content of the k nearest vectors.
     */
    search(vector: number[], k: number, minRelevance?: number, contentSize?: number): ISearchResult[];
    /**
     * Insert vectors into the database.
     * @param name The name of the document.
     * @param content The content.
     * @param index The index of the vectors.
     * @param vectors The vectors to the document to insert.
     */
    insert(name: string, content: string, index: IIndex[], vectors: number[][]): void;
    /**
     * Remove vectors from the database.
     * @param name The name of the document.
     */
    remove(name: string): void;
    /**
     * Save the database to disk.
     * @param version The version of the data collection.
     */
    saveToDisk(version: number): void;
    /**
     * Load the database from disk.
     * @param version The version of the data collection.
     */
    loadFromDisk(version: number): void;
    /**
     * Create the Faiss index if it does not exist.
     * @param dimensions The number of dimensions.
     * @ignore
     */
    private createIndex;
}
