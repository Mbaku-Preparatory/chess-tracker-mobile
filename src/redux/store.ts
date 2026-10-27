import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./features/auth";
import playerDetailReducer from "./features/playerDetail";
import playersReducer from "./features/players";
import prepSessionsReducer from "./features/prepSessions";
import themeReducer from "./features/theme";

import {
  playerDetailMiddleware,
  playersMiddleware,
  prepSessionsMiddleware,
} from "./middleware";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    players: playersReducer,
    playerDetail: playerDetailReducer,
    prepSessions: prepSessionsReducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      playersMiddleware,
      playerDetailMiddleware,
      prepSessionsMiddleware,
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
