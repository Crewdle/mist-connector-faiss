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
    constructor() { }
    /**
     * Search for the k nearest vectors.
     * @param vector The vector to search for.
     * @param k The number of nearest vectors to return.
     * @returns The labels of the k nearest vectors.
     */
    search(vector, k) {
        vector = this.normalizeVector(vector);
        return this.index.search(vector, k).labels;
    }
    /**
     * Insert vectors into the database.
     * @param vectors The vectors to insert.
     */
    insert(vectors) {
        this.createIndex(vectors[0].length);
        vectors = vectors.map((vector) => this.normalizeVector(vector));
        this.index.add(vectors.flat());
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
    /**
     * Normalize a vector.
     * @param vector The vector to normalize.
     * @returns The normalized vector.
     * @ignore
     */
    normalizeVector(vector) {
        const sum = vector.reduce((acc, value) => acc + value, 0);
        return vector.map((value) => value / sum);
    }
}
exports.FaissVectorDatabaseConnector = FaissVectorDatabaseConnector;
