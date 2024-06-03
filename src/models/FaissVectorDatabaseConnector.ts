import { IndexFlatIP } from 'faiss-node';

import { IVectorDatabaseConnector } from '@crewdle/web-sdk-types';

/**
 * The Faiss vector database connector.
 */
export class FaissVectorDatabaseConnector implements IVectorDatabaseConnector {
  /**
   * The Faiss index.
   * @ignore
   */
  private index?: IndexFlatIP;

  /**
   * The constructor.
   */
  constructor() {}

  /**
   * Search for the k nearest vectors.
   * @param vector The vector to search for.
   * @param k The number of nearest vectors to return.
   * @returns The labels of the k nearest vectors.
   */
  search(vector: number[], k: number): number[] {
    vector = this.normalizeVector(vector);
    return this.index!.search(vector, k).labels;
  }

  /**
   * Insert vectors into the database.
   * @param vectors The vectors to insert.
   */
  insert(vectors: number[][]): void {
    this.createIndex(vectors[0].length);
    vectors = vectors.map((vector) => this.normalizeVector(vector));
    this.index!.add(vectors.flat());
  }

  /**
   * Create the Faiss index if it does not exist.
   * @param dimensions The number of dimensions.
   * @ignore
   */
  private createIndex(dimensions: number): void {
    if (this.index) {
      return;
    }
    this.index = new IndexFlatIP(dimensions);
  }

  /**
   * Normalize a vector.
   * @param vector The vector to normalize.
   * @returns The normalized vector.
   * @ignore
   */
  private normalizeVector(vector: number[]): number[] {
    const sum = vector.reduce((acc, value) => acc + value, 0);
    return vector.map((value) => value / sum);
  }
}
