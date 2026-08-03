export const LoginMutation = (email: string, password: string) => `
  mutation {
    login(email: "${email}", password: "${password}") {
      token
      refreshToken
      email
    }
  }
`;

export const RegisterMutation = (email: string, password: string) => `
  mutation {
    register(email: "${email}", password: "${password}") {
      token
      refreshToken
      email
    }
  }
`;
