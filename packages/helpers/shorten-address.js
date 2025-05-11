"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shortenAddress = shortenAddress;
const viem_1 = require("viem");
// shorten the checksummed version of the input address to have 0x + 4 characters at start and end
function shortenAddress(address, characters = 4) {
    try {
        const parsed = (0, viem_1.getAddress)(address);
        return `${parsed.substring(0, characters + 2)}...${parsed.substring(42 - characters)}`;
    }
    catch {
        throw `Invalid 'address' parameter '${address}'.`;
    }
}
