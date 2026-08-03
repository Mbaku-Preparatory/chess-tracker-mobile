export const GetRepertoireQuery = () => `
  query {
    repertoire {
      white {
        slug
        name
        ecoCode
        family
        variation
        pgn
        uci
        epd
      }
      black {
        slug
        name
        ecoCode
        family
        variation
        pgn
        uci
        epd
      }
      onboardingComplete
    }
  }
`;

const formatOpenings = (openings: { slug: string; name: string; eco_code: string; family: string; variation: string; pgn: string; uci: string; epd: string }[]) => {
  return openings
    .map(
      (o) =>
        `{slug: "${o.slug}", name: "${o.name}", ecoCode: "${o.eco_code}", family: "${o.family}", variation: "${o.variation}", pgn: "${o.pgn.replace(/"/g, '\\"')}", uci: "${o.uci}", epd: "${o.epd}"}`
    )
    .join(", ");
};

export const SaveRepertoireMutation = (
  white: { slug: string; name: string; eco_code: string; family: string; variation: string; pgn: string; uci: string; epd: string }[],
  black: { slug: string; name: string; eco_code: string; family: string; variation: string; pgn: string; uci: string; epd: string }[],
  onboardingComplete: boolean
) => `
  mutation {
    saveRepertoire(
      white: [${formatOpenings(white)}]
      black: [${formatOpenings(black)}]
      onboardingComplete: ${onboardingComplete}
    ) {
      white { slug name ecoCode family variation pgn uci epd }
      black { slug name ecoCode family variation pgn uci epd }
      onboardingComplete
    }
  }
`;
