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
const engine = new SearchEngine({
  index: new InMemoryIndex(),
  tokenizer: new SimpleTokenizer(),
  preprocessor: new Preprocessor()
    .register(new HTMLPreprocessor())
    .register(new MarkdownPreprocessor())
    .register(new PDFPreprocessor()),
});

await engine.addDocument({
  id: "page-1",
  content: "<h1>Hello <b>world</b></h1>",
  contentType: "text/html",
});

const results = await engine.search("Hello");
for (let res of results) {
  console.log(`* ${res.id} (Score: ${res.score})`);
}
```

## Standalone Server

```bash
$ bun serve
# "Server running at http://0.0.0.0:8080/..."

$ curl \
    -X POST \
    -H "Content-Type: application/json" \
    --data '{"id: "1", "content": "Hello, world!"}' \
    http://0.0.0.0:8080/documents
# {"success":true,"id":"1"}

$ curl \
    -X GET \
    'http://0.0.0.0:8080/search/basic?q=hello'
# {"success": true, "query": "hello", "results": [{"id": "1", "locations": [{"originalWord": "Hello,", "location": 0}], "score": 0.46153846153846156, "docLength": 13}]}
```

## Roadmap

For a rough plan of development, see the [roadmap](./docs/src/project/roadmap.md).

## Author

* Code by Daniel Lindsley (@toastdriven)
* Tests by [Claude](https://claude.ai/)

## License

New BSD (3-Clause)
