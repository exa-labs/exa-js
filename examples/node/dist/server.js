"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const metaphor_node_1 = __importDefault(require("metaphor-node"));
const metaphorClient = new metaphor_node_1.default("fcac2ebb-a2fe-4348-bf45-7470298f0055");
const app = (0, express_1.default)();
const port = 8000;
app.get("/", (req, res) => {
    const mres = metaphorClient.search("hottest ai startup");
    console.log(mres);
    res.send("Express + TypeScript Server");
});
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
