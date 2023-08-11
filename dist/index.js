"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importStar(require("node-fetch"));
// The Metaphor class encapsulates the API's endpoints.
class Metaphor {
    constructor(apiKey, baseURL = 'https://api.metaphor.systems') {
        this.baseURL = baseURL;
        this.headers = new node_fetch_1.Headers({
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'metaphor-node 1.0.19',
        });
    }
    async request(endpoint, method, body) {
        const response = await (0, node_fetch_1.default)(this.baseURL + endpoint, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const message = (await response.json()).error;
            throw new Error(`Request failed with status ${response.status}. ${message}`);
        }
        return await response.json();
    }
    async search(query, options) {
        return await this.request('/search', 'POST', { query, ...options });
    }
    async findSimilar(url, options) {
        return await this.request('/findSimilar', 'POST', { url, ...options });
    }
    async getContents(ids) {
        if (ids.length === 0) {
            throw new Error('Must provide at least one ID');
        }
        let requestIds;
        if (typeof ids[0] === 'string') {
            requestIds = ids;
        }
        else {
            requestIds = ids.map((result) => result.id);
        }
        // Using URLSearchParams to append the parameters to the URL
        const params = new URLSearchParams({ ids: requestIds.join(',') });
        return await this.request(`/contents?${params}`, 'GET');
    }
}
exports.default = Metaphor;
