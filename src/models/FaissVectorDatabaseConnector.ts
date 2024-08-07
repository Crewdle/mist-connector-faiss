import { IndexFlatIP } from 'faiss-node';

import { IVectorDatabaseConnector, IVectorDatabaseSearchResult } from '@crewdle/web-sdk-types';

/**
 * The interface for a Faiss Vector Database document.
 */
interface IFaissVectorDatabaseDocument {
  /**
   * The name of the document.
   */
  name: string;

  /**
   * The starting index of the document.
   */
  startIndex: number;

  /**
   * The length of the document.
   */
  length: number;
}

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
   * The documents in the database.
   * @ignore
   */
  private documents: IFaissVectorDatabaseDocument[] = [];

  /**
   * The document chunks in the database.
   * @ignore
   */
  private documentChunks: string[] = [];

  /**
   * The constructor.
   */
  constructor() {}
  
  /**
   * Get the content of the database.
   * @returns The content of the database.
   */
  getBuffer(): ArrayBuffer {
    return this.index?.toBuffer() || new ArrayBuffer(0);
  }

  /**
   * Search for the k nearest vectors.
   * @param vector The vector to search for.
   * @param k The number of nearest vectors to return.
   * @param minRelevance The minimum relevance of the vectors.
   * @param contentSize The size of the content to return (vector +/- contentSize, default 0).
   * @returns The content of the k nearest vectors.
   */
  search(vector: number[], k: number, minRelevance?: number, contentSize: number = 0): IVectorDatabaseSearchResult[] {
    if (!this.index) {
      return [];
    }

    if (k > this.index.ntotal()) {
      k = this.index.ntotal();
    }

    const search = this.index.search(vector, k);
    let ids = search.labels.map((label, index) => ({ label, distance: search.distances[index] }));

    if (minRelevance !== undefined) {
      ids = ids.filter((item) => item.distance >= minRelevance);
    }

    return ids.map((id) => {
      const document = this.documents.find((doc) => doc.startIndex <= id.label && doc.startIndex + doc.length > id.label);
      if (!document) {
        throw new Error('Document not found');
      }

      const startIndex = Math.max(document.startIndex, id.label - contentSize);
      const endIndex = Math.min(document.startIndex + document.length, id.label + contentSize + 1);
      return {
        content: this.documentChunks.slice(startIndex, endIndex).join(' '),
        relevance: id.distance,
        pathName: document.name,
      };
    });
  }

  /**
   * Insert vectors into the database.
   * @param name The name of the document.
   * @param chunks The chunks of the document.
   * @param vectors The vectors to the document to insert.
   */
  insert(name: string, chunks: string[], vectors: number[][]): void {
    if (vectors.length === 0) {
      return;
    }

    this.createIndex(vectors[0].length);
    this.index!.add(vectors.flat());
    this.documents.push({ name, startIndex: this.documentChunks.length, length: chunks.length });
    this.documentChunks.push(...chunks);
  }

  /**
   * Remove vectors from the database.
   * @param name The name of the document.
   */
  remove(name: string): void {
    if (!this.index) {
      return;
    }

    const document = this.documents.find((doc) => doc.name === name);
    if (!document) {
      return;
    }

    const startIndex = document.startIndex;
    const endIndex = startIndex + document.length;
    this.documentChunks = this.documentChunks.slice(startIndex, endIndex);
    this.index.removeIds(Array.from({ length: document.length }, (_, index) => startIndex + index));
    this.documents = this.documents.filter((doc) => doc.name !== name);
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
}
