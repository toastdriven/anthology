import { readdir } from "node:fs/promises";

import {
  type Document,
  JSONDocumentStore,
  JSONIndex,
  type Result,
  SearchEngine,
} from '@toastdriven/anthology';

import {
  benchmark,
  showResults,
} from "./bench-utils";

const shakespearePath = "/Users/daniel/Desktop/shakespeares-works";
const storagePath = '/tmp/anthology-bench/data';

// Setup the engine;
const engine = new SearchEngine({
  index: new JSONIndex(storagePath),
  documentStore: new JSONDocumentStore(storagePath),
});
await engine.clear();

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

let query: string;
let results: Result[];

// Run some queries.
elapsed = await benchmark(async () => {
  query = 'what light through yonder window breaks';
  results = await engine.search(query);
  showResults(query, results);
});
console.log(`Query took '${elapsed}' seconds`);
console.log('\n===\n');

elapsed = await benchmark(async () => {
  query = 'Hamlet';
  results = await engine.search(query);
  showResults(query, results);
});
console.log(`Query took '${elapsed}' seconds`);
console.log('\n===\n');
