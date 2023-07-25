# metaphor-node

Our official Node SDK. Uses axios under the hood.

https://www.npmjs.com/package/metaphor-node

## Installation
```
npm install metaphor-node
```

### `metaphor.search(query: string, options?: SearchOptions): Promise<SearchResponse>`
Performs a search on the Metaphor system with the given parameters.

```javascript
const response = await metaphor.search('funny article about tech culture', {
  numResults: 5,
  includeDomains: ['nytimes.com', 'wsj.com'], 
  startPublishedDate: '2023-06-12'
});
```

### `metaphor.findSimilar(url: string, options?: FindSimilarOptions): Promise<SearchResponse>`
Finds content similar to the specified URL.

```javascript
const response = await metaphor.findSimilar('https://waitbutwhy.com/2014/05/fermi-paradox.html', {
  numResults: 10
});
```

### `metaphor.getContents(ids: string[] | Result[]): Promise<GetContentsResponse>`
Retrieves the contents of the specified documents.

```javascript
const response = await metaphor.getContents(['8U71IlQ5DUTdsZFherhhYA', 'X3wd0PbJmAvhu_DQjDKA7A']);
```

# Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
