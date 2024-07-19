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
     * The documents in the database.
     * @ignore
     */
    private documents;
    /**
     * The document chunks in the database.
     * @ignore
     */
    private documentChunks;
    /**
     * The constructor.
     */
    constructor();
    /**
     * Get the content of the database.
     * @returns The content of the database.
     */
    getBuffer(): ArrayBuffer;
    /**
     * Search for the k nearest vectors.
     * @param vector The vector to search for.
     * @param k The number of nearest vectors to return.
     * @param minRelevance The minimum relevance of the vectors.
     * @param startingIndex The starting index of the vectors.
     * @returns The content of the k nearest vectors.
     */
    search(vector: number[], k: number, minRelevance?: number, startingIndex?: number): string[];
    /**
     * Insert vectors into the database.
     * @param name The name of the document.
     * @param chunks The chunks of the document.
     * @param vectors The vectors to the document to insert.
     */
    insert(name: string, chunks: string[], vectors: number[][]): void;
    /**
     * Remove vectors from the database.
     * @param name The name of the document.
     */
    remove(name: string): void;
    /**
     * Create the Faiss index if it does not exist.
     * @param dimensions The number of dimensions.
     * @ignore
     */
    private createIndex;
}
