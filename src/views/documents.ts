export async function getDocument(req) {
  engine.getDocument();
  return Response.json({});
}

export async function updateDocument(req) {
  engine.addDocument();
  return Response.json({});
}

export async function deleteDocument(req) {
  engine.deleteDocument();
  return Response.json({});
}
