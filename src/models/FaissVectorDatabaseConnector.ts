import fs from 'fs';

import { IndexFlatIP } from 'faiss-node';

import { IIndex, ISearchResult, IVectorDatabaseConnector } from '@crewdle/web-sdk-types';

import { IFaissVectorDatabaseOptions } from './FaissVectorDatabaseOptions';

/**
 * The interface for a Faiss Vector Database document.
 */
interface IFaissVectorDatabaseDocument {
  /**
   * The name of the document.
   */
  name: string;

  /**
   * The content of the document.
   */
  content: string;

  /**
   * The starting index of the document.
   */
  startIndex: number;

  /**
   * The length of the document.
   */
  length: number;
}

interface IFaissVectorDatabaseIndex {
  /**
   * The starting index of the content.
   */
  startIndex: number;

  /**
   * The length of the content.
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
   * The indexes in the database.
   * @ignore
   */
  private indexes: IFaissVectorDatabaseIndex[] = [];

  /**
   * The base folder.
   * @ignore
   */
  private baseFolder?: string;

  /**
   * The save to disk debounce.
   * @ignore
   */
  private saveToDiskDebounce?: NodeJS.Timeout;

  /**
   * The constructor.
   */
  constructor(
    private readonly dbKey: string,
    private readonly collectionVersion: number,
    private lastTransactionId: string,
    private readonly options?: IFaissVectorDatabaseOptions,
  ) {
    this.baseFolder = this.options?.baseFolder;
    this.loadFromDisk();
  }
  
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
   * @param minRelevance The minimum relevance of the vectors (default 0).
   * @param contentSize The size of the content to return (content +/- contentSize, default 0).
   * @returns The content of the k nearest vectors.
   */
  search(vector: number[], k: number, minRelevance: number = 0, contentSize: number = 0): ISearchResult[] {
    if (!this.index) {
      return [];
    }

    if (k > this.index.ntotal()) {
      k = this.index.ntotal();
    }

    const search = this.index.search(vector, k);
    let ids = search.labels.map((label, index) => ({ label, distance: search.distances[index] })).filter((item) => item.distance >= minRelevance);

    const results = ids.map((id) => {
      const document = this.documents.find((doc) => doc.startIndex <= id.label && doc.startIndex + doc.length > id.label);
      if (!document) {
        throw new Error('Document not found');
      }

      const index = this.indexes[id.label];
      const startIndex = Math.max(0, index.startIndex - contentSize);
      const endIndex = Math.min(document.content.length, index.startIndex + index.length + contentSize);
      const content = document.content.substring(startIndex, endIndex);

      return {
        content,
        relevance: id.distance,
        pathName: document.name,
      };
    });

    const uniqueResults = results.filter((result, index) => results.findIndex((r, i) => r.content === result.content && i !== index) === -1);

    return uniqueResults;
  }

  /**
   * Insert vectors into the database.
   * @param name The name of the document.
   * @param content The content.
   * @param index The index of the vectors.
   * @param vectors The vectors to the document to insert.
   */
  insert(name: string, content: string, index: IIndex[], vectors: number[][], transactionId: string): void {
    this.lastTransactionId = transactionId;
    if (vectors.length === 0) {
      return;
    }

    this.createIndex(vectors[0].length);
    this.index!.add(vectors.flat());
    this.documents.push({
      name,
      content,
      startIndex: this.indexes.length,
      length: index.length
    });
    this.indexes.push(...index.map((idx) => ({ startIndex: idx.start, length: idx.length })));

    this.saveToDisk();
  }

  /**
   * Remove vectors from the database.
   * @param name The name of the document.
   * @param transactionId The transaction ID.
   */
  remove(name: string, transactionId: string): void {
    this.lastTransactionId = transactionId;

    if (!this.index) {
      return;
    }

    const documents = this.documents.filter((doc) => doc.name === name);
    if (documents.length === 0) {
      return;
    }

    for (const document of documents) {
      const startIndex = document.startIndex;
      const endIndex = startIndex + document.length;
      this.indexes = this.indexes.slice(startIndex, endIndex);
      this.index.removeIds(Array.from({ length: document.length }, (_, index) => startIndex + index));
      this.documents = this.documents.filter((doc) => doc !== document);
      for (const doc of this.documents) {
        if (doc.startIndex > startIndex) {
          doc.startIndex -= document.length;
        }
      }
    }

    this.saveToDisk();
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

  private async saveToDisk(): Promise<void> {
    if (!this.index || !this.baseFolder) {
      return;
    }

    if (this.saveToDiskDebounce) {
      clearTimeout(this.saveToDiskDebounce);
    }

    this.saveToDiskDebounce = setTimeout(() => {
      if (!this.index) {
        return;
      }

      this.saveToDiskDebounce = undefined;
      const buffer = this.index.toBuffer();

      const transactionIdBuffer = Buffer.from(this.lastTransactionId);
      const transactionIdLengthBuffer = Buffer.alloc(4);
      transactionIdLengthBuffer.writeUInt32LE(transactionIdBuffer.length);
      const versionBuffer = Buffer.alloc(4);
      versionBuffer.writeUInt32LE(this.collectionVersion);
      const finalBuffer = Buffer.concat([transactionIdLengthBuffer, transactionIdBuffer, versionBuffer, Buffer.from(buffer)]);

      fs.writeFileSync(`${this.baseFolder}/vector-${this.dbKey}.bin`, finalBuffer);
    }, 30000);
  }

  private async loadFromDisk(): Promise<void> {
    if (!this.baseFolder) {
      return;
    }

    try {
      const buffer = fs.readFileSync(`${this.baseFolder}/vector-${this.dbKey}.bin`);
      const transactionIdLength = buffer.readUInt32LE(0);
      const transactionId = buffer.subarray(4, 4 + transactionIdLength).toString();
      const version = buffer.readUInt32LE(4 + transactionIdLength);
      const indexBuffer = buffer.subarray(8 + transactionIdLength);

      if (transactionId !== this.lastTransactionId) {
        return;
      }

      if (version !== this.collectionVersion) {
        return;
      }

      this.index = IndexFlatIP.fromBuffer(indexBuffer);
    } catch (error) {
      console.error(error);
    }
  }
}
