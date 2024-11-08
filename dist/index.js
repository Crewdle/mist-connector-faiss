"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaissVectorDatabaseConnector = void 0;
exports.getFaissVectorDatabaseConnector = getFaissVectorDatabaseConnector;
const FaissVectorDatabaseConnector_1 = require("./models/FaissVectorDatabaseConnector");
Object.defineProperty(exports, "FaissVectorDatabaseConnector", { enumerable: true, get: function () { return FaissVectorDatabaseConnector_1.FaissVectorDatabaseConnector; } });
/**
 * Get the Faiss Vector Database connector.
 * @param options The options.
 * @returns The Faiss Vector Database connector constructor.
 */
function getFaissVectorDatabaseConnector(options) {
    if (!options) {
        return FaissVectorDatabaseConnector_1.FaissVectorDatabaseConnector;
    }
    return class FaissVectorDatabaseConnectorWithInjectedOptions extends FaissVectorDatabaseConnector_1.FaissVectorDatabaseConnector {
        constructor(dbKey) {
            super(dbKey, options);
        }
    };
}
