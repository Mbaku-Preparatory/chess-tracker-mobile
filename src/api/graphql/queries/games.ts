export const GetPlayerGamesQuery = (
  slug: string,
  colorPlayed = "",
  result = "",
  ecoCode = "",
  page = 1
) => `
  query {
    playerGames(
      slug: "${slug}"
      colorPlayed: "${colorPlayed}"
      result: "${result}"
      ecoCode: "${ecoCode}"
      page: ${page}
    ) {
      count
      results {
        id
        event
        opponentName
        opponentRating
        colorPlayed
        result
        ecoCode
        openingName
        datePlayed
        numMoves
        source
        sourceUrl
      }
    }
  }
`;
