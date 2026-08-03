import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./features/auth";
import gamesReducer from "./features/games";
import playerDetailReducer from "./features/playerDetail";
import playersReducer from "./features/players";
import repertoireReducer from "./features/repertoire";
import themeReducer from "./features/theme";
import tournamentReducer from "./features/tournament";

import {
  authMiddleware,
  gamesMiddleware,
  playerDetailMiddleware,
  playersMiddleware,
  repertoireMiddleware,
  tournamentMiddleware,
} from "./middleware";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    players: playersReducer,
    playerDetail: playerDetailReducer,
    games: gamesReducer,
    repertoire: repertoireReducer,
    theme: themeReducer,
    tournament: tournamentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      authMiddleware,
      playersMiddleware,
      playerDetailMiddleware,
      gamesMiddleware,
      repertoireMiddleware,
      tournamentMiddleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
