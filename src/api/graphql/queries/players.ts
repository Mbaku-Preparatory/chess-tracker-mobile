export const GetPlayersQuery = (
  search = "",
  page = 1,
  ordering = "-created_at"
) => `
  query {
    players(search: "${search}", page: ${page}, ordering: "${ordering}") {
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
    player(slug: "${slug}") {
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
