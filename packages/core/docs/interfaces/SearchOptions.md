[metaphor-node](../README.md) / [Exports](../modules.md) / SearchOptions

# Interface: SearchOptions

Search options for performing a search query.

## Table of contents

### Properties

- [endCrawlDate](SearchOptions.md#endcrawldate)
- [endPublishedDate](SearchOptions.md#endpublisheddate)
- [excludeDomains](SearchOptions.md#excludedomains)
- [includeDomains](SearchOptions.md#includedomains)
- [numResults](SearchOptions.md#numresults)
- [startCrawlDate](SearchOptions.md#startcrawldate)
- [startPublishedDate](SearchOptions.md#startpublisheddate)
- [type](SearchOptions.md#type)
- [useAutoprompt](SearchOptions.md#useautoprompt)

## Properties

### endCrawlDate

• `Optional` **endCrawlDate**: `string`

End date for results based on crawl date.

#### Defined in

[index.ts:21](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L21)

___

### endPublishedDate

• `Optional` **endPublishedDate**: `string`

End date for results based on published date.

#### Defined in

[index.ts:23](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L23)

___

### excludeDomains

• `Optional` **excludeDomains**: `string`[]

List of domains to exclude in the search.

#### Defined in

[index.ts:19](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L19)

___

### includeDomains

• `Optional` **includeDomains**: `string`[]

List of domains to include in the search.

#### Defined in

[index.ts:18](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L18)

___

### numResults

• `Optional` **numResults**: `number`

Number of search results to return. Default 10. Max 10 for basic plans.

#### Defined in

[index.ts:17](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L17)

___

### startCrawlDate

• `Optional` **startCrawlDate**: `string`

Start date for results based on crawl date.

#### Defined in

[index.ts:20](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L20)

___

### startPublishedDate

• `Optional` **startPublishedDate**: `string`

Start date for results based on published date.

#### Defined in

[index.ts:22](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L22)

___

### type

• `Optional` **type**: `string`

Type of search, 'keyword' or 'neural'.

#### Defined in

[index.ts:25](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L25)

___

### useAutoprompt

• `Optional` **useAutoprompt**: `boolean`

If true, converts query to a Metaphor query.

#### Defined in

[index.ts:24](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L24)
