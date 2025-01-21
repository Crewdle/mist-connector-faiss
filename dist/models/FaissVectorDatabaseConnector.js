"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissVectorDatabaseConnector = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const faiss_node_1 = require("faiss-node");
/**
 * The Faiss vector database connector.
 */
class FaissVectorDatabaseConnector {
    /**
     * The constructor.
     */
    constructor(dbKey, options) {
        var _a;
        this.dbKey = dbKey;
        this.options = options;
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
        /**
         * The vectors in the database.
         */
        this.vectors = [];
        this.baseFolder = (_a = this.options) === null || _a === void 0 ? void 0 : _a.baseFolder;
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
     * @param keywords The keywords to search for.
     * @param vector The vector to search for.
     * @param k The number of nearest vectors to return.
     * @param minRelevance The minimum relevance of the vectors (default 0).
     * @param contentSize The size of the content to return (content +/- contentSize, default 0).
     * @returns The content of the k nearest vectors.
     */
    search(keywords, vector, k, minRelevance = 0, contentSize = 0) {
        if (!this.index || this.index.ntotal() === 0) {
            return [];
        }
        if (k > this.index.ntotal()) {
            k = this.index.ntotal();
        }
        const search = this.index.search(vector, k * 50);
        let ids = search.labels.map((label, index) => ({ label, distance: search.distances[index] })).filter((item) => item.distance >= minRelevance);
        ids.slice(0, Math.min(ids.length, k * 3)).forEach((id) => {
            const newVector = this.vectors[id.label];
            const newSearch = this.index.search(newVector, k + 1);
            const newIds = newSearch.labels.map((label, index) => ({ label, distance: newSearch.distances[index] })).filter((item) => item.distance >= minRelevance);
            newIds.forEach((newId) => {
                if (!ids.some((item) => item.label === newId.label)) {
                    ids.push(newId);
                }
            });
        });
        ids.sort((a, b) => a.label - b.label);
        const idGroups = [];
        let currentGroup;
        let currentVector;
        let currentLabel;
        const averageGap = ids.reduce((sum, id, i) => {
            if (i === 0) {
                return sum;
            }
            return sum + (Math.min(15, id.label - ids[i - 1].label));
        }, 0) / (ids.length - 1) * 1.5;
        const averageDistance = ids.reduce((sum, id) => sum + id.distance, 0) / ids.length;
        for (const id of ids) {
            const document = this.documents.find((doc) => doc.startIndex <= id.label && doc.startIndex + doc.length > id.label);
            if (!document) {
                throw new Error('Document not found');
            }
            if (currentGroup !== undefined && currentVector !== undefined && currentLabel !== undefined &&
                currentGroup.doc === document &&
                id.label - Math.max(...currentGroup.labels) <= averageGap &&
                this.cosineSimilarity(currentVector, this.vectors[id.label]) >= averageDistance &&
                id.label - currentLabel <= averageGap * 2) {
                currentGroup.labels.push(id.label);
            }
            else {
                currentLabel = id.label;
                currentVector = this.vectors[id.label];
                currentGroup = { doc: document, labels: [id.label], centroid: [], score: 0, content: '' };
                idGroups.push(currentGroup);
            }
        }
        for (const idGroup of idGroups) {
            const clusterVectors = idGroup.labels.map((label) => this.vectors[label]);
            const lowIndex = this.indexes[Math.min(...idGroup.labels)];
            const highIndex = this.indexes[Math.max(...idGroup.labels)];
            const startIndex = Math.max(0, lowIndex.startIndex - contentSize);
            const endIndex = Math.min(idGroup.doc.content.length, highIndex.startIndex + highIndex.length + contentSize);
            const content = idGroup.doc.content.substring(startIndex, endIndex);
            idGroup.content = content;
            idGroup.centroid = this.getCentroid(clusterVectors, vector);
            idGroup.score = this.getCombinedScore(clusterVectors, idGroup.centroid, vector, keywords, content);
        }
        idGroups.sort((a, b) => b.score - a.score);
        const finalGroups = idGroups.slice(0, k);
        finalGroups.forEach((group) => {
            const potentialGroups = idGroups.filter((g) => g !== group && Math.min(...g.labels) >= Math.min(...group.labels) - averageGap * 2 && Math.max(...g.labels) <= Math.max(...group.labels) + averageGap * 2);
            potentialGroups.forEach((potentialGroup) => {
                const similarity = this.cosineSimilarity(group.centroid, potentialGroup.centroid);
                if (similarity >= 0.1) {
                    group.labels.push(...potentialGroup.labels);
                }
            });
            const lowIndex = this.indexes[Math.min(...group.labels)];
            const highIndex = this.indexes[Math.max(...group.labels)];
            const startIndex = Math.max(0, lowIndex.startIndex - contentSize);
            const endIndex = Math.min(group.doc.content.length, highIndex.startIndex + highIndex.length + contentSize);
            const content = group.doc.content.substring(startIndex, endIndex);
            group.content = content;
        });
        return finalGroups.map((group) => ({
            content: group.content,
            relevance: group.score,
            pathName: group.doc.name,
        }));
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
        this.vectors.push(...vectors);
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
            this.indexes.splice(startIndex, document.length);
            this.vectors.splice(startIndex, document.length);
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
    saveToDisk(version) {
        if (!this.index || !this.baseFolder) {
            return;
        }
        const faissIndexBuffer = this.index.toBuffer();
        const faissIndexBufferLength = faissIndexBuffer.byteLength;
        const documentsBuffer = Buffer.from(JSON.stringify(this.documents));
        const documentsBufferLength = documentsBuffer.byteLength;
        const indexesBuffer = Buffer.from(JSON.stringify(this.indexes));
        const indexesBufferLength = indexesBuffer.byteLength;
        const vectorsBuffer = Buffer.from(JSON.stringify(this.vectors));
        const vectorsBufferLength = vectorsBuffer.byteLength;
        let buffer = Buffer.alloc(4 + 4 + 4 + 4);
        buffer.writeUInt32LE(faissIndexBufferLength, 0);
        buffer.writeUInt32LE(documentsBufferLength, 4);
        buffer.writeUInt32LE(indexesBufferLength, 4 + 4);
        buffer.writeUInt32LE(vectorsBufferLength, 4 + 4 + 4);
        buffer = Buffer.concat([buffer, faissIndexBuffer, documentsBuffer, indexesBuffer, vectorsBuffer]);
        try {
            const pattern = new RegExp(`^vector-${this.dbKey}-.*\.bin$`);
            const files = fs_1.default.readdirSync(this.baseFolder);
            for (const file of files) {
                if (pattern.test(file)) {
                    fs_1.default.rmSync(path_1.default.join(this.baseFolder, file), { force: true });
                }
            }
        }
        catch (err) {
            console.error('Error removing files:', err);
        }
        fs_1.default.writeFileSync(`${this.baseFolder}/vector-${this.dbKey}-${version}.bin`, buffer);
    }
    /**
     * Load the database from disk.
     * @param version The version of the data collection.
     */
    loadFromDisk(version) {
        if (!this.baseFolder) {
            return;
        }
        const buffer = fs_1.default.readFileSync(`${this.baseFolder}/vector-${this.dbKey}-${version}.bin`);
        const faissIndexBufferLength = buffer.readUInt32LE(0);
        const documentsBufferLength = buffer.readUInt32LE(4);
        const indexesBufferLength = buffer.readUInt32LE(4 + 4);
        const vectorsBufferLength = buffer.readUInt32LE(4 + 4 + 4);
        const faissIndexBuffer = buffer.subarray(4 + 4 + 4 + 4, 4 + 4 + 4 + 4 + faissIndexBufferLength);
        const documentsBuffer = buffer.subarray(4 + 4 + 4 + 4 + faissIndexBufferLength, 4 + 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength);
        const indexesBuffer = buffer.subarray(4 + 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength, 4 + 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength + indexesBufferLength);
        const vectorsBuffer = buffer.subarray(4 + 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength + indexesBufferLength, 4 + 4 + 4 + 4 + faissIndexBufferLength + documentsBufferLength + indexesBufferLength + vectorsBufferLength);
        this.index = faiss_node_1.IndexFlatIP.fromBuffer(faissIndexBuffer);
        this.documents = JSON.parse(documentsBuffer.toString());
        this.indexes = JSON.parse(indexesBuffer.toString());
        this.vectors = JSON.parse(vectorsBuffer.toString());
        if (this.indexes.length !== this.index.ntotal()) {
            this.index = undefined;
            this.documents = [];
            this.indexes = [];
            this.vectors = [];
            throw new Error('Index length mismatch');
        }
        if (this.vectors.length !== this.index.ntotal()) {
            this.index = undefined;
            this.documents = [];
            this.indexes = [];
            this.vectors = [];
            throw new Error('Vector length mismatch');
        }
        if (this.documents.length === 0 && this.indexes.length !== 0) {
            this.index = undefined;
            this.documents = [];
            this.indexes = [];
            this.vectors = [];
            throw new Error('Document length mismatch');
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
    getCombinedScore(clusterVectors, centroid, queryVector, keywords, content) {
        const centroidDistance = this.cosineSimilarity(centroid, queryVector);
        const keywordBoost = this.keywordBoost(keywords, content);
        const diversityAwareScore = this.diversityAwareScore(clusterVectors, queryVector);
        return centroidDistance * 0.6 + keywordBoost * 0.3 + diversityAwareScore * 0.1;
    }
    getCentroid(clusterVectors, queryVector) {
        const vectorLength = clusterVectors[0].length;
        const similarities = clusterVectors.map((vec) => this.cosineSimilarity(vec, queryVector));
        const transformedSimilarities = similarities.map((sim) => (sim > 0.1 ? Math.pow(sim, 2) : 0));
        const totalSimilarity = transformedSimilarities.reduce((sum, sim) => sum + sim, 0);
        const weights = transformedSimilarities.map((sim) => sim / totalSimilarity);
        const centroid = Array(vectorLength).fill(0);
        clusterVectors.forEach((vec, idx) => {
            for (let i = 0; i < vectorLength; i++) {
                centroid[i] += vec[i] * weights[idx];
            }
        });
        return centroid.map((val) => val / clusterVectors.length);
    }
    cosineSimilarity(vectorA, vectorB) {
        const dotProduct = vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0);
        const normA = Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0));
        const normB = Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0));
        if (normA === 0 || normB === 0) {
            return 0;
        }
        return dotProduct / (normA * normB);
    }
    keywordBoost(keywords, content) {
        if (keywords.length === 0) {
            return 0;
        }
        const contentLower = content.toLowerCase();
        const matches = keywords.filter((keyword) => contentLower.includes(keyword.toLowerCase())).length;
        return matches / keywords.length;
    }
    diversityAwareScore(clusterVectors, queryVector) {
        const similarities = clusterVectors.map((vec) => this.cosineSimilarity(vec, queryVector));
        const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
        const variance = similarities.reduce((sum, sim) => sum + Math.pow((sim - avgSimilarity), 2), 0) / similarities.length;
        const stdDev = Math.sqrt(variance);
        return (avgSimilarity - stdDev * 0.1) * Math.log(1 + clusterVectors.length);
    }
}
exports.FaissVectorDatabaseConnector = FaissVectorDatabaseConnector;
