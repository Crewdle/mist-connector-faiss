"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissVectorDatabaseConnector = void 0;
const faiss_node_1 = require("faiss-node");
/**
 * The Faiss vector database connector.
 */
class FaissVectorDatabaseConnector {
    /**
     * The constructor.
     */
    constructor() {
        /**
         * The documents in the database.
         * @ignore
         */
        this.documents = [];
        /**
         * The indexes in the database.
         * @ignore
         */
        this.indexes = [];
    }
    /**
     * Get the content of the database.
     * @returns The content of the database.
     */
    getBuffer() {
        var _a;
        return ((_a = this.index) === null || _a === void 0 ? void 0 : _a.toBuffer()) || new ArrayBuffer(0);
    }
    /**
     * Search for the k nearest vectors.
     * @param vector The vector to search for.
     * @param k The number of nearest vectors to return.
     * @param minRelevance The minimum relevance of the vectors (default 0).
     * @param contentSize The size of the content to return (content +/- contentSize, default 0).
     * @returns The content of the k nearest vectors.
     */
    search(vector, k, minRelevance = 0, contentSize = 0) {
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
    insert(name, content, index, vectors) {
        if (vectors.length === 0) {
            return;
        }
        this.createIndex(vectors[0].length);
        this.index.add(vectors.flat());
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
    remove(name) {
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
     * Create the Faiss index if it does not exist.
     * @param dimensions The number of dimensions.
     * @ignore
     */
    createIndex(dimensions) {
        if (this.index) {
            return;
        }
        this.index = new faiss_node_1.IndexFlatIP(dimensions);
    }
}
exports.FaissVectorDatabaseConnector = FaissVectorDatabaseConnector;
