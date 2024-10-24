"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissVectorDatabaseConnector = void 0;
const fs_1 = __importDefault(require("fs"));
const faiss_node_1 = require("faiss-node");
/**
 * The Faiss vector database connector.
 */
class FaissVectorDatabaseConnector {
    /**
     * The constructor.
     */
    constructor(dbKey, collectionVersion, lastTransactionId, options) {
        var _a;
        this.dbKey = dbKey;
        this.collectionVersion = collectionVersion;
        this.lastTransactionId = lastTransactionId;
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
        this.baseFolder = (_a = this.options) === null || _a === void 0 ? void 0 : _a.baseFolder;
        this.loadFromDisk();
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
    insert(name, content, index, vectors, transactionId) {
        this.lastTransactionId = transactionId;
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
        this.saveToDisk();
    }
    /**
     * Remove vectors from the database.
     * @param name The name of the document.
     * @param transactionId The transaction ID.
     */
    remove(name, transactionId) {
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
    createIndex(dimensions) {
        if (this.index) {
            return;
        }
        this.index = new faiss_node_1.IndexFlatIP(dimensions);
    }
    saveToDisk() {
        return __awaiter(this, void 0, void 0, function* () {
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
                fs_1.default.writeFileSync(`${this.baseFolder}/vector-${this.dbKey}.bin`, finalBuffer);
            }, 30000);
        });
    }
    loadFromDisk() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.baseFolder) {
                return;
            }
            try {
                const buffer = fs_1.default.readFileSync(`${this.baseFolder}/vector-${this.dbKey}.bin`);
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
                this.index = faiss_node_1.IndexFlatIP.fromBuffer(indexBuffer);
            }
            catch (error) {
                console.error(error);
            }
        });
    }
}
exports.FaissVectorDatabaseConnector = FaissVectorDatabaseConnector;
