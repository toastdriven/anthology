# anthology

A highly extensible/customizable search engine. Embeddable or stand-alone.

> **WARNING:** This is very much pre-alpha software. Until `1.0.0` is released,
there is no guarantee of API stability, or complete implementations. Patience is
appreciated!

## Installation

To install dependencies:

```bash
bun install
```

## Embedded Usage

```typescript
const engine = new SearchEngine(
  new InMemoryIndex(),
  new SimpleTokenizer(),
  new Preprocessor()
    .register(new HTMLPreprocessor())
    .register(new MarkdownPreprocessor())
    .register(new PDFPreprocessor()),
);

await engine.addDocument({
  id: "page-1",
  content: "<h1>Hello <b>world</b></h1>",
  contentType: "text/html",
});

await engine.search("Hello");
```

## Standalone Server

```bash
$ bun run anthology.ts
# "Server running at http://0.0.0.0:8080/..."
```

## Roadmap

For a rough plan of development, see the [roadmap](./docs/src/project/roadmap.md).

## Author

* Code by Daniel Lindsley (@toastdriven)
* Tests by [Claude](https://claude.ai/)

## License

New BSD (3-Clause)
