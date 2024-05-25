import { IVectorDatabaseConnector } from '@crewdle/web-sdk-types';
export declare class FaissVectorDatabaseConnector implements IVectorDatabaseConnector {
    private index?;
    constructor();
    search(vector: number[], k: number): number[];
    insert(vectors: number[][]): void;
    private createIndex;
    private normalizeVector;
}
