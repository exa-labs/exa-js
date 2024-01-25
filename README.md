# exa-js

Our official Javscript SDK. Uses `cross-fetch` under the hood.

https://www.npmjs.com/package/exa-js

## Installation
```
npm install exa-js
```

## Initialization 
```js
import Exa from "exa-node"

const exa = new Exa(process.env.EXA_API_KEY)
```

### `exa.search(query: string, options?: SearchOptions): Promise<SearchResponse>`
Performs a search on the Exa system with the given parameters.

```javascript
const response = await exa.search('funny article about tech culture', {
  numResults: 5,
  includeDomains: ['nytimes.com', 'wsj.com'], 
  startPublishedDate: '2023-06-12'
});
```

### `exa.findSimilar(url: string, options?: FindSimilarOptions): Promise<SearchResponse>`
Finds content similar to the specified URL.

```javascript
const response = await exa.findSimilar('https://waitbutwhy.com/2014/05/fermi-paradox.html', {
  numResults: 10
});
```

### `exa.getContents(ids: string[] | Result[]): Promise<GetContentsResponse>`
Retrieves the contents of the specified documents.

```javascript
const response = await exa.getContents(['8U71IlQ5DUTdsZFherhhYA', 'X3wd0PbJmAvhu_DQjDKA7A']);
```

# Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
