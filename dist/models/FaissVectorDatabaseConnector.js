"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissVectorDatabaseConnector = void 0;
const faiss_node_1 = require("faiss-node");
class FaissVectorDatabaseConnector {
    constructor() { }
    search(vector, k) {
        vector = this.normalizeVector(vector);
        return this.index.search(vector, k).labels;
    }
    insert(vectors) {
        this.createIndex(vectors[0].length);
        vectors = vectors.map((vector) => this.normalizeVector(vector));
        this.index.add(vectors.flat());
    }
    createIndex(dimensions) {
        if (this.index) {
            return;
        }
        this.index = new faiss_node_1.IndexFlatIP(dimensions);
    }
    normalizeVector(vector) {
        const sum = vector.reduce((acc, value) => acc + value, 0);
        return vector.map((value) => value / sum);
    }
}
exports.FaissVectorDatabaseConnector = FaissVectorDatabaseConnector;
