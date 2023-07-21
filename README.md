# metaphor-node

Our official Node SDK. Uses axios under the hood.

https://www.npmjs.com/package/metaphor-node

## Installation
```
npm install metaphor-node
```

## `metaphor.search(request: SearchRequest): Promise<SearchResponse>`
Performs a search on the Metaphor system with the given parameters.

```javascript
const response = await metaphor.search({
  query: 'global warming',
  numResults: 5,
  includeDomains: ['example.com'],
  excludeDomains: ['excludedomain.com']
});
```

## `metaphor.findSimilar(request: FindSimilarRequest): Promise<SearchResponse>`
Finds content similar to the specified URL.

```javascript
const response = await metaphor.findSimilar({
  url: 'https://example.com/some-article',
  numResults: 3
});
```

## metaphor.getContents(request: GetContentsRequest): Promise<GetContentsResponse>
Retrieves the contents of the specified documents.

const response = await metaphor.getContents({
  ids: ['doc1', 'doc2']
});

# Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
