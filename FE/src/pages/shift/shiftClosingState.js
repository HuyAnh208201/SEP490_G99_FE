export function shouldRenderClosingDetails({ loading, data }) {
  return !loading && Boolean(data);
}

export function shouldLoadClosingDetails({ sessionLoading, session }) {
  return !sessionLoading && Boolean(session);
}
