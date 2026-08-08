import { readdir } from "node:fs/promises";

import {
  type Document,
  InMemoryDocumentStore,
  InMemoryIndex,
  JSONDocumentStore,
  JSONIndex,
  SearchEngine,
} from 'anthology';

import { benchmark } from "./bench-utils";

const shakespearePath = "/Users/daniel/Desktop/shakespeares-works";

// Setup the engine;
const engine = new SearchEngine({
  index: new InMemoryIndex(),
  documentStore: new InMemoryDocumentStore(),
});

const files = await readdir(shakespearePath);
let elapsed: number;

// First, we'll test indexing performance. This will likely be mostly I/O-bound.
elapsed = await benchmark(async () => {
  for (let workFilename of files) {
    const workFullPath = `${shakespearePath}/${workFilename}`;
    const work = Bun.file(workFullPath);
    const doc: Document = {
      id: workFilename,
      content: await work.text(),
    };
    await engine.addDocument(doc);
  }
});
console.log(`Indexing took '${elapsed}' seconds`);
console.log('\n===\n');

let query;
let results;

// Run some queries.
elapsed = await benchmark(async () => {
  query = 'what light';
  results = await engine.search(query);
  console.log(`Query: '${query}'. Results: ${JSON.stringify(results)}`);
});
console.log(`Query took '${elapsed}' seconds`);
console.log('\n===\n');

elapsed = await benchmark(async () => {
  query = 'Hamlet';
  results = await engine.search(query);
  console.log(`Query: '${query}'. Results: ${JSON.stringify(results)}`);
});
console.log(`Query took '${elapsed}' seconds`);
console.log('\n===\n');
