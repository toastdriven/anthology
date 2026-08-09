import {
  type Document,
  InMemoryDocumentStore,
  InMemoryIndex,
  JSONDocumentStore,
  JSONIndex,
  type Result,
  SearchEngine,
} from 'anthology';

// In-memory engine.
// const engine = new SearchEngine({
//   index: new InMemoryIndex(),
//   documentStore: new InMemoryDocumentStore(),
// });

// JSON-based engine.
const dataRoot = '/tmp/anthology/data';
const engine = new SearchEngine({
  index: new JSONIndex(dataRoot),
  documentStore: new JSONDocumentStore(dataRoot),
});
await engine.clear();

const documents: Map<string, Document> = new Map();
documents.set(
  '1',
  {
    id: '1',
    content: 'Hello world!',
    contentType: 'text/plain',
    // metadata: {
    //   author: 'Every programmer ever',
    //   published: '1972',
    //   tags: [],
    // }
  }
);
documents.set(
  '2',
  {
    id: '2',
    content: 'So am I still waiting for this world to stop hating?',
    contentType: 'text/plain',
    // metadata: {
    //   author: 'Deryck Whibley',
    //   published: '2002-10-14',
    //   tags: [
    //     'punk',
    //   ],
    // }
  }
);
documents.set(
  '3',
  {
    id: '3',
    content: 'How can one little street swallow so many lives?',
    contentType: 'text/plain',
    // metadata: {
    //   author: 'Dexter Holland',
    //   published: '1999-08-09',
    //   tags: [
    //     'punk',
    //   ],
    // }
  }
);
documents.set(
  '4',
  {
    id: '4',
    content: "We'rе alive, we believe that summertime memories will never fade away",
    contentType: 'text/plain',
    // metadata: {
    //   author: 'Kevin Ratajczak & Nico Sallach',
    //   published: '2022-09-16',
    //   tags: [
    //     'metal',
    //     'metalcore',
    //     'partycore',
    //   ],
    // }
  }
);
documents.set(
  '5',
  {
    id: '5',
    content: "Take a look to the sky just before you die, it's the last time you will.",
    contentType: 'text/plain',
    // metadata: {
    //   author: 'James Hetfield',
    //   published: '1984-06-27',
    //   tags: [
    //     'metal',
    //     'thrash',
    //   ],
    // }
  }
);
documents.set(
  '6',
  {
    id: '6',
    content: "His oldest son knows just where the witch lived, He took Ed there but refused to go in, The boy knew what was about to begin.",
    contentType: 'text/plain',
    // metadata: {
    //   author: 'Michael Graves',
    //   published: '1999-10-05',
    //   tags: [
    //     'punk',
    //     'horrorpunk',
    //   ],
    // }
  }
);

// Index everything.
for (let [id, doc] of documents.entries()) {
  await engine.addDocument(doc);
}

// Setup
let query;
let results;

function trimScore(score: number): string {
  return parseFloat(score.toString()).toFixed(6);
}

function showResults(query: string, results: Result[]): void {
  console.log(`Query: '${query}'. Results: ${results.length}`);
  for (let res of results) {
    console.log(`* ${res.id} (Score: ${trimScore(res.score)})`)
  }
  console.log('\n===\n');
}

// Run some queries.
query = 'hello';
results = await engine.search(query);
showResults(query, results);

query = 'world';
results = await engine.search(query);
showResults(query, results);

query = 'lives';
results = await engine.search(query);
showResults(query, results);
