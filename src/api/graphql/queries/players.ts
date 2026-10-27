// Values are written into the query text, so each goes through JSON.stringify:
// a JSON string is a valid GraphQL string, quotes and backslashes escaped. A
// name typed with a quote in it used to end the string and break the query.
const str = (value: string) => JSON.stringify(value);

export const GetPlayersQuery = (
  search = "",
  page = 1,
  ordering = "-created_at"
) => `
  query {
    players(search: ${str(search)}, page: ${Math.max(1, Math.floor(page) || 1)}, ordering: ${str(ordering)}) {
      count
      results {
        id
        publicId
        fullName
        slug
        title
        standardRating
        rapidRating
        blitzRating
        fideId
        chesscomUsername
        lichessUsername
        federation
        profileImage
        createdAt
        gameSourceCounts {
          chessResults
          chessCom
          lichess
        }
      }
    }
  }
`;

export const GetPlayerQuery = (slug: string) => `
  query {
    player(slug: ${str(slug)}) {
      id
      publicId
      fullName
      slug
      title
      standardRating
      rapidRating
      blitzRating
      fideId
      chesscomUsername
      lichessUsername
      federation
      bio
      birthYear
      profileImage
      createdAt
      performanceSummary {
        totalGames
        wins
        draws
        losses
        winRate
        whiteGames
        whiteScore
        blackGames
        blackScore
        summaryText
      }
      openingStats {
        ecoCode
        openingName
        colorChoice
        gamesCount
        scorePercent
      }
      recentGames {
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
      gameSourceCounts {
        chessResults
        chessCom
        lichess
      }
    }
  }
`;
