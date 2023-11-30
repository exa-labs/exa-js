[metaphor-node](../README.md) / [Exports](../modules.md) / default

# Class: default

The Metaphor class encapsulates the API's endpoints.

## Table of contents

### Constructors

- [constructor](default.md#constructor)

### Properties

- [baseURL](default.md#baseurl)
- [headers](default.md#headers)

### Methods

- [findSimilar](default.md#findsimilar)
- [getContents](default.md#getcontents)
- [request](default.md#request)
- [search](default.md#search)

## Constructors

### constructor

• **new default**(`apiKey`, `baseURL?`): [`default`](default.md)

Constructs the Metaphor API client.

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `apiKey` | `string` | `undefined` | The API key for authentication. |
| `baseURL?` | `string` | `"https://api.metaphor.systems"` | The base URL of the Metaphor API. |

#### Returns

[`default`](default.md)

#### Defined in

[index.ts:119](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L119)

## Properties

### baseURL

• `Private` **baseURL**: `string`

#### Defined in

[index.ts:111](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L111)

___

### headers

• `Private` **headers**: `Headers`

#### Defined in

[index.ts:112](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L112)

## Methods

### findSimilar

▸ **findSimilar**(`url`, `options?`): `Promise`\<[`SearchResponse`](../interfaces/SearchResponse.md)\>

Finds similar links to the provided URL.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `url` | `string` | The URL for which to find similar links. |
| `options?` | [`FindSimilarOptions`](../interfaces/FindSimilarOptions.md) | Additional options for finding similar links. |

#### Returns

`Promise`\<[`SearchResponse`](../interfaces/SearchResponse.md)\>

A list of similar search results.

#### Defined in

[index.ts:178](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L178)

___

### getContents

▸ **getContents**(`ids`): `Promise`\<[`GetContentsResponse`](../interfaces/GetContentsResponse.md)\>

Retrieves contents of documents based on a list of document IDs.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `ids` | `string`[] \| [`Result`](../interfaces/Result.md)[] | An array of document IDs. |

#### Returns

`Promise`\<[`GetContentsResponse`](../interfaces/GetContentsResponse.md)\>

A list of document contents.

#### Defined in

[index.ts:190](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L190)

___

### request

▸ **request**(`endpoint`, `method`, `body?`): `Promise`\<`any`\>

Makes a request to the Metaphor API.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `endpoint` | `string` | The API endpoint to call. |
| `method` | `string` | The HTTP method to use. |
| `body?` | `any` | The request body for POST requests. |

#### Returns

`Promise`\<`any`\>

The response from the API.

#### Defined in

[index.ts:138](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L138)

___

### search

▸ **search**(`query`, `options?`): `Promise`\<[`SearchResponse`](../interfaces/SearchResponse.md)\>

Performs a search with a Metaphor prompt-engineered query.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `query` | `string` | The query string. |
| `options?` | [`SearchOptions`](../interfaces/SearchOptions.md) | Additional search options. |

#### Returns

`Promise`\<[`SearchResponse`](../interfaces/SearchResponse.md)\>

A list of relevant search results.

#### Defined in

[index.ts:165](https://github.com/metaphorsystems/metaphor-node/blob/553b699/packages/core/src/index.ts#L165)
