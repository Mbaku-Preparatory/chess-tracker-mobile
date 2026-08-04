export type MainTabParamList = {
  Schedule: undefined;
  Players: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyEmail: { email: string };
  MainTabs: undefined;
  Players: undefined;
  PlayerNew: undefined;
  PlayerDetail: { slug: string };
  PlayerGames: { slug: string };
  PlayerPrep: { slug: string };
  PlayerImport: { slug: string; source?: "chesscom" | "lichess" | "chess_results" | "pgn" };
  MasterGames: undefined;
  Setup: undefined;
};
