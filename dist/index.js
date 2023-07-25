"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// The Metaphor class encapsulates the API's endpoints.
class Metaphor {
    constructor(apiKey, baseURL = 'https://api.metaphor.systems') {
        this.client = axios_1.default.create({ baseURL,
            headers: {
                'x-api-key': apiKey
            }
        });
    }
    async search(query, options) {
        const response = await this.client.post('/search', { query, ...options });
        return response.data;
    }
    async findSimilar(url, options) {
        const response = await this.client.post('/findSimilar', { url, ...options });
        return response.data;
    }
    async getContents(ids) {
        let requestIds;
        // Check if the first element is a string or not. If it's a string, it's an ID array.
        if (typeof ids[0] === 'string') {
            requestIds = ids;
        }
        else {
            // If it's not a string, then it's a Result array.
            requestIds = ids.map(result => result.id);
        }
        const response = await this.client.get('/contents', { params: { ids: requestIds } });
        return response.data;
    }
}
exports.default = Metaphor;
