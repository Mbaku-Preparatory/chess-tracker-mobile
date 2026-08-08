import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  Schedule: undefined;
  Players: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  VerifyEmail: { email: string };
  // Typed as nested params so `navigate("MainTabs", { screen: "Players" })` type-checks.
  // "Players" is deliberately NOT listed as a root screen: it lives in MainTabs, and a
  // phantom entry here let `navigate("Players")` compile everywhere while silently doing
  // nothing from any pushed screen - the root navigator has no route by that name and
  // there is no parent to bubble to.
  // `| undefined` keeps the bare `replace("MainTabs")` (SetupScreen's post-onboarding
  // redirect) valid - it should land on whichever tab is first, not name one.
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  PlayerNew: undefined;
  PlayerDetail: { slug: string };
  PlayerGames: { slug: string };
  PlayerPrep: { slug: string };
  PlayerImport: { slug: string; source?: "chesscom" | "lichess" | "chess_results" | "pgn" };
  MasterGames: undefined;
  Setup: undefined;
  SessionNew: undefined;
  SessionDetail: { id: number };
  Account: undefined;
};
