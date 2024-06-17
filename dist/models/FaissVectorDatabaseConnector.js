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
     * @param minRelevance The minimum relevance of the vectors.
     * @param startingIndex The starting index of the vectors.
     * @returns The labels of the k nearest vectors.
     */
    search(vector, k, minRelevance, startingIndex) {
        if (!this.index) {
            return [];
        }
        console.log('searching for vector', k, minRelevance, startingIndex);
        if (startingIndex !== undefined && minRelevance !== undefined) {
            const items = this.index.search(vector, 1000);
            const newItems = items.labels.map((label, index) => ({ label, distance: items.distances[index] })).filter((item) => item.label >= startingIndex);
            console.log('newItems', newItems);
            const filteredItems = newItems.filter((item) => item.distance >= minRelevance).slice(0, k).map((item) => item.label);
            console.log('filteredItems', filteredItems);
            return filteredItems;
        }
        return this.index.search(vector, k).labels;
    }
    /**
     * Insert vectors into the database.
     * @param vectors The vectors to insert.
     */
    insert(vectors) {
        if (vectors.length === 0) {
            return;
        }
        this.createIndex(vectors[0].length);
        this.index.add(vectors.flat());
    }
    /**
     * Remove vectors from the database.
     * @param ids The IDs of the vectors to remove.
     */
    remove(ids) {
        if (!this.index) {
            return;
        }
        this.index.removeIds(ids);
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
