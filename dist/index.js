"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// The Metaphor class encapsulates the API's endpoints.
class Metaphor {
    constructor(apiKey, baseURL = "https://api.metaphor.systems") {
        this.baseURL = baseURL;
        this.headers = new Headers({
            "x-api-key": apiKey,
            "Content-Type": "application/json",
        });
    }
    async request(endpoint, method, body) {
        const response = await fetch(this.baseURL + endpoint, {
            method,
            headers: this.headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        return await response.json();
    }
    async search(query, options) {
        return await this.request("/search", "POST", { query, ...options });
    }
    async findSimilar(url, options) {
        return await this.request("/findSimilar", "POST", { url, ...options });
    }
    async getContents(ids) {
        let requestIds;
        if (typeof ids[0] === "string") {
            requestIds = ids;
        }
        else {
            requestIds = ids.map((result) => result.id);
        }
        // Using URLSearchParams to append the parameters to the URL
        const params = new URLSearchParams({ ids: requestIds.join(",") });
        return await this.request(`/contents?${params}`, "GET");
    }
}
exports.default = Metaphor;
