import graphqlClient from "@/api/graphqlClient";
import { LoginMutation, RegisterMutation } from "@/api/graphql/queries/auth";
import { LOGIN, REGISTER } from "@/redux/actions/actionTypes";
import { userMessage } from "@/lib/apiError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleAuth = async (action: any, queryFn: (email: string, password: string) => string) => {
  try {
    const { email, password } = action.payload;
    const query = queryFn(email, password);
    const result = await graphqlClient({ data: { query } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Authentication failed";
    } else {
      const data = result.data.data.login ?? result.data.data.register;
      action.payload = { token: data.token, refreshToken: data.refreshToken, email: data.email };
    }
  } catch (err) {
    action.errors = userMessage(err, "Authentication failed");
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case LOGIN: {
      storeAPI.dispatch({ type: LOGIN + "_pending" });
      action = await handleAuth(action, LoginMutation);
      break;
    }
    case REGISTER: {
      storeAPI.dispatch({ type: REGISTER + "_pending" });
      action = await handleAuth(action, RegisterMutation);
      break;
    }
  }
  return next(action);
};
