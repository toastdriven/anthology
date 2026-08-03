# anthology

A highly extensible/customizable search engine. Embeddable or stand-alone.

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

## Author

* Code by Daniel Lindsley (@toastdriven)
* Tests by [Claude](https://claude.ai/)

## License

New BSD (3-Clause)
