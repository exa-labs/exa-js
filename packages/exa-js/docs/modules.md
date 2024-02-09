[exa-js](README.md) / Exports

# exa-js

## Table of contents

### Type Aliases

- [BaseSearchOptions](modules.md#basesearchoptions)
- [ContentsOptions](modules.md#contentsoptions)
- [ContentsResultComponent](modules.md#contentsresultcomponent)
- [Default](modules.md#default)
- [FindSimilarOptions](modules.md#findsimilaroptions)
- [HighlightsContentsOptions](modules.md#highlightscontentsoptions)
- [HighlightsResponse](modules.md#highlightsresponse)
- [RegularSearchOptions](modules.md#regularsearchoptions)
- [SearchResponse](modules.md#searchresponse)
- [SearchResult](modules.md#searchresult)
- [TextContentsOptions](modules.md#textcontentsoptions)
- [TextResponse](modules.md#textresponse)

## Type Aliases

### BaseSearchOptions

Ƭ **BaseSearchOptions**: `Object`

Search options for performing a search query.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `category?` | `string` |
| `endCrawlDate?` | `string` |
| `endPublishedDate?` | `string` |
| `excludeDomains?` | `string`[] |
| `includeDomains?` | `string`[] |
| `numResults?` | `number` |
| `startCrawlDate?` | `string` |
| `startPublishedDate?` | `string` |

#### Defined in

exa.types.ts:15

___

### ContentsOptions

Ƭ **ContentsOptions**: `Object`

Search options for performing a search query.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `highlights?` | [`HighlightsContentsOptions`](modules.md#highlightscontentsoptions) \| ``true`` |
| `text?` | [`TextContentsOptions`](modules.md#textcontentsoptions) \| ``true`` |

#### Defined in

exa.types.ts:59

___

### ContentsResultComponent

Ƭ **ContentsResultComponent**\<`T`\>: [`Default`](modules.md#default)\<`T`[``"text"``] extends `object` \| ``true`` ? [`TextResponse`](modules.md#textresponse) : {} & `T`[``"highlights"``] extends `object` \| ``true`` ? [`HighlightsResponse`](modules.md#highlightsresponse) : {}, [`TextResponse`](modules.md#textresponse)\>

#### Type parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `T` | extends [`ContentsOptions`](modules.md#contentsoptions) | A type extending from 'ContentsOptions'. |

#### Defined in

exa.types.ts:112

___

### Default

Ƭ **Default**\<`T`, `U`\>: [keyof `T`] extends [`never`] ? `U` : `T`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` |
| `U` | `U` |

#### Defined in

exa.types.ts:104

___

### FindSimilarOptions

Ƭ **FindSimilarOptions**: [`BaseSearchOptions`](modules.md#basesearchoptions) & \{ `excludeSourceDomain?`: `boolean`  }

Options for finding similar links.

#### Defined in

exa.types.ts:49

___

### HighlightsContentsOptions

Ƭ **HighlightsContentsOptions**: `Object`

Options for retrieving highlights from page.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `highlightsPerUrl?` | `number` |
| `numSentences?` | `number` |
| `query?` | `string` |

#### Defined in

exa.types.ts:82

___

### HighlightsResponse

Ƭ **HighlightsResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `highlightScores` | `number`[] |
| `highlights` | `string`[] |

#### Defined in

exa.types.ts:99

___

### RegularSearchOptions

Ƭ **RegularSearchOptions**: [`BaseSearchOptions`](modules.md#basesearchoptions) & \{ `type?`: `string` ; `useAutoprompt?`: `boolean`  }

Search options for performing a search query.

#### Defined in

exa.types.ts:31

___

### SearchResponse

Ƭ **SearchResponse**\<`T`\>: `Object`

Represents a search response object.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ContentsOptions`](modules.md#contentsoptions) = {} |

#### Type declaration

| Name | Type |
| :------ | :------ |
| `autopromptString?` | `string` |
| `results` | [`SearchResult`](modules.md#searchresult)\<`T`\>[] |

#### Defined in

exa.types.ts:143

___

### SearchResult

Ƭ **SearchResult**\<`T`\>: \{ `author?`: `string` ; `id`: `string` ; `publishedDate?`: `string` ; `score?`: `number` ; `title`: `string` \| ``null`` ; `url`: `string`  } & [`ContentsResultComponent`](modules.md#contentsresultcomponent)\<`T`\>

Represents a search result object.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`ContentsOptions`](modules.md#contentsoptions) = {} |

#### Defined in

exa.types.ts:128

___

### TextContentsOptions

Ƭ **TextContentsOptions**: `Object`

Options for retrieving text from page.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `includeHtmlTags?` | `boolean` |
| `maxCharacters?` | `number` |

#### Defined in

exa.types.ts:70

___

### TextResponse

Ƭ **TextResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `text` | `string` |

#### Defined in

exa.types.ts:92
