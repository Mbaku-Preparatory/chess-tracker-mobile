import type { NavigatorScreenParams } from "@react-navigation/native";

import type { Game, MasterGame } from "@/types";

export type MainTabParamList = {
  Schedule: undefined;
  Players: undefined;
  Explorer: undefined;
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
  PlayerPrep: { slug: string; tab?: "tree" | "studies" | "ask" };
  PlayerImport: { slug: string; source?: "chesscom" | "lichess" | "chess_results" | "pgn" };
  SessionNew: undefined;
  SessionDetail: { id: number };
  MyProfile: undefined;
  // The game travels with the route: every list that opens one already holds
  // it, so the screen fetches only the PGN, and only for a scouted game.
  GameAnalysis: { kind: "game"; game: Game } | { kind: "master"; game: MasterGame };
  Account: undefined;
};
