import { IndexFlatIP } from 'faiss-node';

import { IVectorDatabaseConnector } from '@crewdle/web-sdk-types';

export class FaissVectorDatabaseConnector implements IVectorDatabaseConnector {
  private index?: IndexFlatIP;

  constructor() {}

  search(vector: number[], k: number): number[] {
    vector = this.normalizeVector(vector);
    return this.index!.search(vector, k).labels;
  }

  insert(vectors: number[][]): void {
    this.createIndex(vectors[0].length);
    vectors = vectors.map((vector) => this.normalizeVector(vector));
    this.index!.add(vectors.flat());
  }

  private createIndex(dimensions: number): void {
    if (this.index) {
      return;
    }
    this.index = new IndexFlatIP(dimensions);
  }

  private normalizeVector(vector: number[]): number[] {
    const sum = vector.reduce((acc, value) => acc + value, 0);
    return vector.map((value) => value / sum);
  }
}
