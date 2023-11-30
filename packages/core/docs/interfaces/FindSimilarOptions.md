[metaphor-node](../README.md) / [Exports](../modules.md) / FindSimilarOptions

# Interface: FindSimilarOptions

Options for finding similar links.

## Table of contents

### Properties

- [endCrawlDate](FindSimilarOptions.md#endcrawldate)
- [endPublishedDate](FindSimilarOptions.md#endpublisheddate)
- [excludeDomains](FindSimilarOptions.md#excludedomains)
- [excludeSourceDomain](FindSimilarOptions.md#excludesourcedomain)
- [includeDomains](FindSimilarOptions.md#includedomains)
- [numResults](FindSimilarOptions.md#numresults)
- [startCrawlDate](FindSimilarOptions.md#startcrawldate)
- [startPublishedDate](FindSimilarOptions.md#startpublisheddate)

## Properties

### endCrawlDate

• `Optional` **endCrawlDate**: `string`

End date for results based on crawl date.

#### Defined in

[index.ts:75](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L75)

___

### endPublishedDate

• `Optional` **endPublishedDate**: `string`

End date for results based on published date.

#### Defined in

[index.ts:77](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L77)

___

### excludeDomains

• `Optional` **excludeDomains**: `string`[]

List of domains to exclude from the search.

#### Defined in

[index.ts:73](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L73)

___

### excludeSourceDomain

• `Optional` **excludeSourceDomain**: `boolean`

If true, excludes links from the base domain of the input.

#### Defined in

[index.ts:78](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L78)

___

### includeDomains

• `Optional` **includeDomains**: `string`[]

List of domains to include in the search.

#### Defined in

[index.ts:72](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L72)

___

### numResults

• `Optional` **numResults**: `number`

Number of search results to return. Default 10. Max 10 for basic plans.

#### Defined in

[index.ts:71](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L71)

___

### startCrawlDate

• `Optional` **startCrawlDate**: `string`

Start date for results based on crawl date.

#### Defined in

[index.ts:74](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L74)

___

### startPublishedDate

• `Optional` **startPublishedDate**: `string`

Start date for results based on published date.

#### Defined in

[index.ts:76](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L76)
