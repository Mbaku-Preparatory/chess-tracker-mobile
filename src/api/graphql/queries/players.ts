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
      strengths {
        title
        description
        order
      }
      weaknesses {
        title
        description
        order
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

export const CreatePlayerMutation = (fullName: string) => `
  mutation {
    createPlayer(fullName: "${fullName}") {
      id
      fullName
      slug
    }
  }
`;

export const DeletePlayerMutation = (slug: string) => `
  mutation {
    deletePlayer(slug: "${slug}") {
      ok
    }
  }
`;
