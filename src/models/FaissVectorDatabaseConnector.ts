import fs from 'fs';
import path from 'path';

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
   * The constructor.
   */
  constructor(
    private readonly dbKey: string,
    private readonly options?: IFaissVectorDatabaseOptions,
  ) {
    this.baseFolder = this.options?.baseFolder;
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
  insert(name: string, content: string, index: IIndex[], vectors: number[][]): void {
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
  }

  /**
   * Remove vectors from the database.
   * @param name The name of the document.
   */
  remove(name: string): void {
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
  }

  /**
   * Save the database to disk.
   * @param version The version of the data collection.
   */
  saveToDisk(version: string): void {
    if (!this.index || !this.baseFolder) {
      return;
    }

    const faissIndexBuffer = this.index.toBuffer();
    const faissIndexBufferLength = faissIndexBuffer.byteLength;
    const documentsBuffer = Buffer.from(JSON.stringify(this.documents));
    const documentsBufferLength = documentsBuffer.byteLength;
    const indexesBuffer = Buffer.from(JSON.stringify(this.indexes));
    const indexesBufferLength = indexesBuffer.byteLength;

    let buffer = Buffer.alloc(4 + 4 + 4);
    buffer.writeUInt32LE(faissIndexBufferLength, 0);
    buffer.writeUInt32LE(documentsBufferLength, 4);
    buffer.writeUInt32LE(indexesBufferLength, 4 + 4);
    buffer = Buffer.concat([buffer, faissIndexBuffer, documentsBuffer, indexesBuffer]);

    fs.rmSync(`${this.baseFolder}/vector-${this.dbKey}-*.bin`, { force: true });

    try {
      const pattern = new RegExp(`^vector-${this.dbKey}-.*\.bin$`);
      const files = fs.readdirSync(this.baseFolder);
      for (const file of files) {
        if (pattern.test(file)) {
          fs.rmSync(path.join(this.baseFolder, file), { force: true });
        }
      }
    } catch (err) {
      console.error('Error removing files:', err);
    }
    fs.writeFileSync(`${this.baseFolder}/vector-${this.dbKey}-${version}.bin`, buffer);
  }

  /**
   * Load the database from disk.
   * @param version The version of the data collection.
   */
  loadFromDisk(version: string): void {
    if (!this.baseFolder) {
      return;
    }

    const buffer = fs.readFileSync(`${this.baseFolder}/vector-${this.dbKey}-${version}.bin`);
    const faissIndexBufferLength = buffer.readUInt32LE(0);
    const documentsBufferLength = buffer.readUInt32LE(4);
    const indexesBufferLength = buffer.readUInt32LE(4 + 4);
    const faissIndexBuffer = buffer.subarray(4 + 4 + 4, 4 + 4 + 4 + faissIndexBufferLength);
    const documentsBuffer = buffer.subarray(4 + 4 + 4 + faissIndexBufferLength, 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength);
    const indexesBuffer = buffer.subarray(4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength, 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength + indexesBufferLength);

    this.index = IndexFlatIP.fromBuffer(faissIndexBuffer);
    this.documents = JSON.parse(documentsBuffer.toString());
    this.indexes = JSON.parse(indexesBuffer.toString());
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
