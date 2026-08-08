import { readdir } from "node:fs/promises";

import {
  type Document,
  InMemoryDocumentStore,
  InMemoryIndex,
  JSONDocumentStore,
  JSONIndex,
  SearchEngine,
} from 'anthology';

const shakespearePath = "/Users/daniel/Desktop/shakespeares-works";
let startTime: number;
let endTime: number;

function convertToElapsedSeconds(nanoStart: number, nanoEnd: number): number {
  const elapsed = nanoEnd - nanoStart;
  return elapsed / 1e9;
}

// Setup the engine;
const engine = new SearchEngine({
  index: new InMemoryIndex(),
  documentStore: new InMemoryDocumentStore(),
});

const files = await readdir(shakespearePath);

// First, we'll test indexing performance. This will likely be mostly I/O-bound.
startTime = Bun.nanoseconds();
for (let workFilename of files) {
  const workFullPath = `${shakespearePath}/${workFilename}`;
  const work = Bun.file(workFullPath);
  const doc: Document = {
    id: workFilename,
    content: await work.text(),
  };
  await engine.addDocument(doc);
}
endTime = Bun.nanoseconds();
console.log(`Indexing took '${convertToElapsedSeconds(startTime, endTime)}' seconds`);
console.log('\n===\n');

let query;
let results;

// Run some queries.
startTime = Bun.nanoseconds();
query = 'what light';
results = await engine.search(query);
console.log(`Query: '${query}'. Results: ${JSON.stringify(results)}`);
endTime = Bun.nanoseconds();
console.log(`Query took '${convertToElapsedSeconds(startTime, endTime)}' seconds`);
console.log('\n===\n');

startTime = Bun.nanoseconds();
query = 'Hamlet';
results = await engine.search(query);
console.log(`Query: '${query}'. Results: ${JSON.stringify(results)}`);
endTime = Bun.nanoseconds();
console.log(`Query took '${convertToElapsedSeconds(startTime, endTime)}' seconds`);
console.log('\n===\n');
