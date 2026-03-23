const jsonHeaders = {
  "content-type": "application/json",
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

function getRouteKey(event) {
  const method = event?.requestContext?.http?.method ?? "GET";
  const path = event?.rawPath ?? "/";
  return `${method} ${path}`;
}

export async function handler(event) {
  const routeKey = getRouteKey(event);

  return response(501, {
    message:
      "Blobular sounds API scaffold is deployed, but the handler logic has not been implemented yet.",
    routeKey,
    nextSteps: [
      "read the caller identity from the Cognito JWT claims",
      "load and store sound metadata in DynamoDB",
      "issue presigned S3 URLs for upload and download",
      "enforce owner-only access for private sounds",
    ],
  });
}
