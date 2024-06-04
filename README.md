# Crewdle Mist Faiss Vector Database Connector

## Introduction

The Crewdle Mist Faiss Vector Database Connector is a solution designed for seamless and efficient indexing and searching of content using vector databases. This connector enables the Crewdle SDK to leverage the capabilities of the Faiss vector database, providing robust and high-performance content indexing and search functionality. With its easy integration and reliable data handling, it's an ideal choice for developers looking to implement scalable and effective content search and indexing solutions within their ecosystem, perfectly complementing the Generative AI Worker Connector for advanced AI-driven applications.

## Getting Started

Before diving in, ensure you have installed the [Crewdle Mist SDK](https://www.npmjs.com/package/@crewdle/web-sdk).

## Installation

```bash
npm install @crewdle/mist-connector-faiss
```

## Usage

```TypeScript
import { FaissVectorDatabaseConnector } from '@crewdle/mist-connector-faiss';

const sdk = await SDK.getInstance(config.vendorId, config.accessToken, {
  vectorDatabaseConnector: FaissVectorDatabaseConnector,
}, config.secretKey);
```

## Need Help?

Reach out to support@crewdle.com or raise an issue in our repository for any assistance.

## Join Our Community

For an engaging discussion about your specific use cases or to connect with fellow developers, we invite you to join our Discord community. Follow this link to become a part of our vibrant group: [Join us on Discord](https://discord.gg/XJ3scBYX).
