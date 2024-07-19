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
         * The document chunks in the database.
         * @ignore
         */
        this.documentChunks = [];
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
     * @param minRelevance The minimum relevance of the vectors.
     * @param startingIndex The starting index of the vectors.
     * @returns The content of the k nearest vectors.
     */
    search(vector, k, minRelevance, startingIndex) {
        if (!this.index) {
            return [];
        }
        if (startingIndex !== undefined && minRelevance !== undefined) {
            const items = this.index.search(vector, 1000);
            const newItems = items.labels.map((label, index) => ({ label, distance: items.distances[index] })).filter((item) => item.label >= startingIndex);
            const filteredItems = newItems.filter((item) => item.distance >= minRelevance).slice(0, k).map((item) => item.label);
            return filteredItems.map((id) => this.documentChunks[id]);
        }
        const ids = this.index.search(vector, k).labels;
        return ids.map((id) => this.documentChunks[id]);
    }
    /**
     * Insert vectors into the database.
     * @param name The name of the document.
     * @param chunks The chunks of the document.
     * @param vectors The vectors to the document to insert.
     */
    insert(name, chunks, vectors) {
        if (vectors.length === 0) {
            return;
        }
        this.createIndex(vectors[0].length);
        this.index.add(vectors.flat());
        this.documents.push({ name, startIndex: this.documentChunks.length, length: chunks.length });
        this.documentChunks.push(...chunks);
    }
    /**
     * Remove vectors from the database.
     * @param name The name of the document.
     */
    remove(name) {
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
    createIndex(dimensions) {
        if (this.index) {
            return;
        }
        this.index = new faiss_node_1.IndexFlatIP(dimensions);
    }
}
exports.FaissVectorDatabaseConnector = FaissVectorDatabaseConnector;
