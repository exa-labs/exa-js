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
        const response = await this.client.post('/search', request);
        return response.data;
    }
    async findSimilar(request) {
        const response = await this.client.post('/findSimilar', request);
        return response.data;
    }
    async getContents(request) {
        const response = await this.client.get('/contents', { params: request });
        return response.data;
    }
}
exports.default = Metaphor;
