import { IVectorDatabaseConnector } from '@crewdle/web-sdk-types';
/**
 * The Faiss vector database connector.
 */
export declare class FaissVectorDatabaseConnector implements IVectorDatabaseConnector {
    /**
     * The Faiss index.
     * @ignore
     */
    private index?;
    /**
     * The constructor.
     */
    constructor();
    /**
     * Search for the k nearest vectors.
     * @param vector The vector to search for.
     * @param k The number of nearest vectors to return.
     * @returns The labels of the k nearest vectors.
     */
    search(vector: number[], k: number): number[];
    /**
     * Insert vectors into the database.
     * @param vectors The vectors to insert.
     */
    insert(vectors: number[][]): void;
    /**
     * Create the Faiss index if it does not exist.
     * @param dimensions The number of dimensions.
     * @ignore
     */
    private createIndex;
    /**
     * Normalize a vector.
     * @param vector The vector to normalize.
     * @returns The normalized vector.
     * @ignore
     */
    private normalizeVector;
}
