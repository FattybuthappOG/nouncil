// Subgraph endpoints with fallbacks (Goldsky primary, The Graph hosted as backup)
const NOUNS_SUBGRAPH_URLS = [
  "https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn",
  "https://api.thegraph.com/subgraphs/name/nounsdao/nouns-subgraph",
]

/**
 * Query the Nouns subgraph with automatic fallback across multiple endpoints.
 * Returns the `data` portion of the GraphQL response, or throws if all endpoints fail.
 */
export async function querySubgraph(query: string): Promise<any> {
  for (const url of NOUNS_SUBGRAPH_URLS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      if (!response.ok) continue
      const json = await response.json()
      if (json.errors || !json.data) continue
      return json.data
    } catch {
      continue
    }
  }
  throw new Error("All subgraph endpoints failed")
}
