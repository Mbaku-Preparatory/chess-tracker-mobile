export const GetActiveTournamentQuery = () => `
  query {
    activeTournament {
      id
      name
      url
      isActive
      createdAt
      pairings {
        id
        roundNumber
        opponentName
        color
        result
      }
    }
  }
`;

export const CreateTournamentMutation = (name = "", url = "") => `
  mutation {
    createTournament(name: "${name}", url: "${url}") {
      id
      name
      url
      isActive
      createdAt
      pairings {
        id
        roundNumber
        opponentName
        color
        result
      }
    }
  }
`;

export const UpdateTournamentMutation = (id: number, isActive: boolean) => `
  mutation {
    updateTournament(id: ${id}, isActive: ${isActive}) {
      id
      name
      url
      isActive
    }
  }
`;

export const UpsertPairingMutation = (
  tournamentId: number,
  roundNumber: number,
  opponentName: string,
  color: string,
  result: string
) => `
  mutation {
    upsertPairing(
      tournamentId: ${tournamentId}
      roundNumber: ${roundNumber}
      opponentName: "${opponentName}"
      color: "${color}"
      result: "${result}"
    ) {
      id
      roundNumber
      opponentName
      color
      result
    }
  }
`;
