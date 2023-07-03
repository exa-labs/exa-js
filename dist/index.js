"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// The Metaphor class encapsulates the API's endpoints.
class Metaphor {
    constructor(apiKey) {
        this.client = axios_1.default.create({
            baseURL: 'https://api.metaphor.systems',
            headers: {
                'x-api-key': apiKey
            }
        });
    }
    async search(request) {
        return this.client.post('/search', request);
    }
    async findSimilar(request) {
        return this.client.post('/findSimilar', request);
    }
    async getContents(request) {
        return this.client.get('/contents', { params: request });
    }
}
exports.default = Metaphor;
