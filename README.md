# metaphor-node

Our official Node SDK. Uses axios under the hood.

https://www.npmjs.com/package/metaphor-node

## Usage

```
npm install metaphor-node
```

```
import Metaphor from 'metaphor-node';

const metaphor = Metaphor('your_api_key');

const searchResults = await metaphor.search({query: 'Here is an article about the state of search:'});
```
