## Setting up the environment

This repository uses [`pnpm`](https://pnpm.io/).
Other package managers may work but are not officially supported for development.

To setup the repository, run:

```bash
pnpm install
cd packages/exa-js && pnpm run build
```

This will install all the required dependencies and build output files to `dist/`.

## Modifying/Adding code

Most of the SDK is generated code, and any modified code will be overridden on the next generation. The
`packages/exa-js/lib/` and `examples/` directories are exceptions and will never be overridden.

## Adding and running examples

All files in the `examples/` directory are not modified by the Stainless generator and can be freely edited or
added to.

```bash
// add an example to examples/<your-example>.ts

#!/usr/bin/env -S npm run tsn -T
…
```

```
chmod +x examples/<your-example>.ts
# run the example against your api
yarn tsn -T examples/<your-example>.ts
```

## Using the repository from source

If you’d like to use the repository from source, you can either install from git or link to a cloned repository:

To install via git:

```bash
pnpm install --save git+ssh://git@github.com:exa-labs/exa-js.git
```

Alternatively, to link a local copy of the repo:

```bash
# Clone
git clone https://www.github.com/exa-labs/exa-js
cd exa-js

# With pnpm
pnpm link --global
cd ../my-package
pnpm link -—global openai
```

## Running tests

Run the tests.

```bash
pnpm run test
```

## Linting and formatting

This repository uses [prettier](https://www.npmjs.com/package/prettier) and
[eslint](https://www.npmjs.com/package/eslint) to format the code in the repository.

To lint:

```bash
pnpm lint
```

To format and fix all lint issues automatically:

```bash
pnpm fix
```

## Publishing and releases

Changes made to this repository via the automated release PR pipeline should publish to npm automatically. If
the changes aren't made through the automated pipeline, you may want to make releases manually.

### Publish with a GitHub workflow

You can release to package managers by using [the `Publish NPM` GitHub action](https://www.github.com/exa-labs/exa-js/actions/workflows/publish-npm.yml). This will require a setup organization or repository secret to be set up.
