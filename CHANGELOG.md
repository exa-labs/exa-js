# Changelog

## [2.15.0](https://github.com/exa-labs/exa-js/compare/v2.14.0...v2.15.0) (2026-06-24)


### Features

* **agent:** add Exa Connect dataSources support ([e01e44a](https://github.com/exa-labs/exa-js/commit/e01e44a7aa399523105b7027416c08693179493d))
* **agent:** add Exa Connect dataSources support ([0738df4](https://github.com/exa-labs/exa-js/commit/0738df406742e440830a577b7613b5a1d00f7692))
* **agent:** widen AgentDataSourceProvider to accept arbitrary strings ([57e4dd1](https://github.com/exa-labs/exa-js/commit/57e4dd1cdebb101ffd051a30dad40baae73295aa))

## [2.14.0](https://github.com/exa-labs/exa-js/compare/v2.13.1...v2.14.0) (2026-06-16)


### Features

* add Entity types for company/people search results ([e00b4bd](https://github.com/exa-labs/exa-js/commit/e00b4bd6f797494b566b6d9241e17ecf8e7a1376))
* add imports and exports ([af0d843](https://github.com/exa-labs/exa-js/commit/af0d843de80f516e4bbf5fe49ae0fb348d1ffc0c))
* add maxAgeHours parameter to ContentsOptions ([05545c8](https://github.com/exa-labs/exa-js/commit/05545c89ee24124c885628abc3892462b77892b8))
* add maxCharacters highlights param, deprecate legacy params ([d6cd8d4](https://github.com/exa-labs/exa-js/commit/d6cd8d4b704a64592cdd2689e5d92405fd244e3d))
* add maxCharacters param for highlights, deprecate legacy params ([19215bb](https://github.com/exa-labs/exa-js/commit/19215bb18d18dbdb8f405bfb492bf9d7d1149148))
* add OpenAI wrapper (wrap method) for RAG integration ([99bd724](https://github.com/exa-labs/exa-js/commit/99bd72442cc8cb7a0df39b3773e86abc4ec5a7fc))
* add text content filtering options (verbosity, includeSections, excludeSections) ([cbdc9e8](https://github.com/exa-labs/exa-js/commit/cbdc9e83e912fa8bfb9bbe82612053118a7204d2))
* add web traffic to companies ([81de983](https://github.com/exa-labs/exa-js/commit/81de98345a05fdcc729c8d50d9b05c1b7efa541f))
* add webset streams clients ([#56](https://github.com/exa-labs/exa-js/issues/56)) ([533d4da](https://github.com/exa-labs/exa-js/commit/533d4da3aaed4e252882939b416f7220268ce35b))
* **agent:** remove beta header requirement ([d446ad8](https://github.com/exa-labs/exa-js/commit/d446ad818f944f103c9d8b0b54647a8fed671d2b))
* **agent:** remove beta header requirement ([04201f1](https://github.com/exa-labs/exa-js/commit/04201f157f870e75992722426c25c48d1156538e))
* bump 2.0.1 version ([2c3c74f](https://github.com/exa-labs/exa-js/commit/2c3c74f2db9fc43138a75a733ff79d7f69387852))
* deprecate context parameter in favor of highlights/text ([#137](https://github.com/exa-labs/exa-js/issues/137)) ([25c0e9e](https://github.com/exa-labs/exa-js/commit/25c0e9edcb3309c6cf9ffd972cbe240e540d880a))
* **exa-js:** add deep output schema modes and bump patch version ([e44f897](https://github.com/exa-labs/exa-js/commit/e44f897b534d9528aeed117b3f92d0546260cf6b))
* **exa-js:** add deep search effort and structured output params ([5744d80](https://github.com/exa-labs/exa-js/commit/5744d805302c134fd6ade8d4a97b662c9374ed5d))
* **exa-js:** add highlights feature back to SDK ([d97ee2c](https://github.com/exa-labs/exa-js/commit/d97ee2c8a6b86eb266e3f0083a1cba3cc099d285))
* **exa-js:** add instant search type support ([8d38821](https://github.com/exa-labs/exa-js/commit/8d38821b535bd2820ed9588422d070ca15674d2e))
* **exa-js:** expose deep search systemPrompt ([280139f](https://github.com/exa-labs/exa-js/commit/280139fe8942aa227e7c0b123c09f72397081f96))
* **exa-js:** model deep output as content and citations ([6b488b2](https://github.com/exa-labs/exa-js/commit/6b488b2da215da6bdd12f4d60dc3f5a4642e6c21))
* **exa-js:** remove deep search answer option ([a3bff08](https://github.com/exa-labs/exa-js/commit/a3bff084942bb2dcca7be2fd71a035dd53dc5e83))
* **exa-js:** remove deep search citations response field ([ffd24ef](https://github.com/exa-labs/exa-js/commit/ffd24ef2480b4c97d5a604842f5d6ffcbfcea0bc))
* **exa-js:** remove github from category type ([c27ed49](https://github.com/exa-labs/exa-js/commit/c27ed49429b324f8c49fddb275cdde4f7671a081))
* **exa-js:** remove tweet category enum value ([65733b8](https://github.com/exa-labs/exa-js/commit/65733b81cedb6cd422206bcdd512a4e1b35ea761))
* **exa-js:** rename deep effort values and bump version ([7fc7383](https://github.com/exa-labs/exa-js/commit/7fc738303cf31c598e229942c02b00f7cda2057d))
* **exa-js:** return deep search structured output in output field ([b556a93](https://github.com/exa-labs/exa-js/commit/b556a930ba090f700f1ad0205fe7e56e69bf00f7))
* **exa-js:** split deep search into dedicated types ([8d17e63](https://github.com/exa-labs/exa-js/commit/8d17e63b52fc2723e5e42e39194efe5471925c39))
* **exa-js:** switch deep output to field grounding ([1d44c1d](https://github.com/exa-labs/exa-js/commit/1d44c1da72e1557fe02a1c9865dd00d4769aa478))
* handle csv data ([25d5a13](https://github.com/exa-labs/exa-js/commit/25d5a13523a34161ca75fb07bd59be9def7f1371))
* **monitors:** add base client, types, and wire up monitors on Exa class ([136e933](https://github.com/exa-labs/exa-js/commit/136e9330672121784594fe29280f6a0033de3d0c))
* **monitors:** add contents options to search monitor params ([4c4e58c](https://github.com/exa-labs/exa-js/commit/4c4e58c44fc28490be43a255552868d95aa50278))
* **monitors:** add listAll/getAll auto-pagination for monitor runs ([0b1e604](https://github.com/exa-labs/exa-js/commit/0b1e60457e9a0a486731952ed231cf4f866018d7))
* **monitors:** replace cron triggers with interval-based scheduling ([8a0f3a4](https://github.com/exa-labs/exa-js/commit/8a0f3a4e92f40f4b7ff3fa21dcf56a96236ec196))
* new version ([37d231c](https://github.com/exa-labs/exa-js/commit/37d231c8100964dde9c5c212af18625ddff0a0b1))
* **sdk:** add people category and remove linkedin profile ([b70e328](https://github.com/exa-labs/exa-js/commit/b70e3289182b976b2ecc2120fc92943ef5ba6e20))
* set user agent from package version ([673c86e](https://github.com/exa-labs/exa-js/commit/673c86eacf33d7347f602a5b39c59caab4796d04))
* set user agent from package version ([101f1b4](https://github.com/exa-labs/exa-js/commit/101f1b4c8b0e1e82cfa726fbbbbe3fa5dd24a7b7))
* update client ([cd23074](https://github.com/exa-labs/exa-js/commit/cd2307461d0d8d7c0d692de33a62e6a275e338cd))
* update with latest schema and include webhook attempts ([a404c07](https://github.com/exa-labs/exa-js/commit/a404c076aecc065a98f1be05629f8b5e91f139e3))
* use OpenAPI generated types to match schema and improve error handling ([c860a3d](https://github.com/exa-labs/exa-js/commit/c860a3d7f418587cca81bc289d07a3402af40075))
* **websets:** add dashboardUrl field to Webset type ([0601bea](https://github.com/exa-labs/exa-js/commit/0601beac334c89b18a33fb61cbe08ea86978d936))


### Bug Fixes

* add userLocation parameter to streamAnswer() method ([384f1a1](https://github.com/exa-labs/exa-js/commit/384f1a1607b7f03ae86ae009bc50b7e5f13220ca))
* add userLocation parameter to streamAnswer() method ([9e954c7](https://github.com/exa-labs/exa-js/commit/9e954c79c050e276a279e2e2fbba9a1e93c55cd6))
* **ci:** compile top-level examples via tsconfig ([973fcb4](https://github.com/exa-labs/exa-js/commit/973fcb4406930a01bdc6e903469c3c2317091a09))
* **ci:** run top-level examples without emit ([3208489](https://github.com/exa-labs/exa-js/commit/32084895bc435a542a273db44b77f594f946ee71))
* **client:** surface real HTTP error when response body is not JSON ([ad4deb0](https://github.com/exa-labs/exa-js/commit/ad4deb0db0be438098c61ef1a9c557b46135f4bc))
* example.py ([6fe960c](https://github.com/exa-labs/exa-js/commit/6fe960c72298088858bdf73330cc7d20f053390d))
* example.yml ([4f9a4cd](https://github.com/exa-labs/exa-js/commit/4f9a4cdfd94b5d5a1c0efa3d0f5ca9e8e7ddf307))
* **examples:** use local exa-js package ([e0d6d1b](https://github.com/exa-labs/exa-js/commit/e0d6d1b66d5ff9f0098ccb2e903d1f38ded3c25e))
* handle useExa=required when model skips tool call by injecting results as system message ([8994683](https://github.com/exa-labs/exa-js/commit/8994683ffca827844713f38847a8323380659140))
* implement useExa parameter logic and add error handling to maybeGetQuery ([8899354](https://github.com/exa-labs/exa-js/commit/88993543630ea2d13585efa44245de7af26631d1))
* make highlightScores optional in HighlightsResponse ([937935e](https://github.com/exa-labs/exa-js/commit/937935e719948809889665878955f1735c62d546))
* make highlightScores optional in HighlightsResponse ([75e11c4](https://github.com/exa-labs/exa-js/commit/75e11c4b3a00cafe2ee5b98ec0ccf5782cfa978c))
* **monitors:** align GroundingEntry and SearchMonitorRunFailReason with API ([641dffb](https://github.com/exa-labs/exa-js/commit/641dffb07f2a7210aae465f8d5b4d177225507eb))
* **monitors:** type SearchMonitorRunOutput.content as string | object ([51daac9](https://github.com/exa-labs/exa-js/commit/51daac900d6805f16ac772a47cb051529a26f146))
* **monitors:** type SearchMonitorRunOutput.content as string | object ([cd0cd4a](https://github.com/exa-labs/exa-js/commit/cd0cd4aea97d079812c414f48f4ffc2c2e8dcc94))
* remove console.log from wrap method ([e0add16](https://github.com/exa-labs/exa-js/commit/e0add16d1d13ee6093092b187afc821fbb932a90))
* rm lock files ([#6](https://github.com/exa-labs/exa-js/issues/6)) ([054c16a](https://github.com/exa-labs/exa-js/commit/054c16a5fbdd095d2b3cf3ccb4e99fc1d699ee64))
* symbolic link to README ([#7](https://github.com/exa-labs/exa-js/issues/7)) ([4b617f5](https://github.com/exa-labs/exa-js/commit/4b617f51eca85f9e0ee462f51f4a0919ac271f57))
* unused variable ([8a1f38d](https://github.com/exa-labs/exa-js/commit/8a1f38dde725e3492ac6fd3fa70a52012932d3c9))
* update example compiling ([3d3f00c](https://github.com/exa-labs/exa-js/commit/3d3f00c23dfe795b6e8efe67a02df99f9e1b05e2))
* update pnpm-lock.yaml to match package.json ([e4f507a](https://github.com/exa-labs/exa-js/commit/e4f507a90ecdc1c3629d8f5e01a3f13171d699e0))
* use type-only import for OpenAI to fix CI compilation ([1d5574c](https://github.com/exa-labs/exa-js/commit/1d5574c0d2819441a517f3578474ff692a69996d))


### Reverts

* remove builder ([79f6aec](https://github.com/exa-labs/exa-js/commit/79f6aec4936c4c93ed6c9dae1b341949d3ebc83e))
