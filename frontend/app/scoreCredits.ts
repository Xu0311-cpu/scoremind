type Credit = { types: string[]; text: string };
type Creator = { type: string; text: string };

export type ScoreCreditInput = {
  workTitle: string;
  movementTitle: string;
  creators: Creator[];
  rights: string[];
  sources: string[];
  credits: Credit[];
};

export type ScoreCredits = {
  title: string;
  subtitle: string;
  composer: string;
  lyricist: string;
  details: string[];
};

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function resolveScoreCredits(input: ScoreCreditInput): ScoreCredits {
  const typed = (type: string) => unique(input.credits.filter((credit) => credit.types.includes(type)).map((credit) => credit.text));
  const creators = (type: string) => unique(input.creators.filter((creator) => creator.type === type).map((creator) => creator.text));
  const title = input.workTitle.trim() || input.movementTitle.trim() || typed("title")[0] || "";
  const subtitles = unique([input.movementTitle, ...typed("subtitle")]).filter((text) => text !== title);
  const composers = creators("composer").length ? creators("composer") : typed("composer");
  const lyricists = creators("lyricist").length ? creators("lyricist") : typed("lyricist");
  const displayed = new Set([title, ...subtitles, ...composers, ...lyricists]);
  const details = unique([
    ...input.creators.map((creator) => creator.text),
    ...input.rights,
    ...input.sources,
    ...input.credits.map((credit) => credit.text),
  ]).filter((text) => !displayed.has(text));
  return { title, subtitle: subtitles.join("\n"), composer: composers.join(" · "), lyricist: lyricists.join(" · "), details };
}

export function readScoreCredits(document: Document): ScoreCredits {
  const children = (node: Element | undefined, name: string): Element[] =>
    node ? Array.from(node.children).filter((child) => child.localName === name) : [];
  const texts = (node: Element | undefined, name: string) => children(node, name).map((child) => child.textContent?.trim() ?? "");
  const root = document.documentElement;
  const identification = children(root, "identification")[0];
  return resolveScoreCredits({
    workTitle: texts(children(root, "work")[0], "work-title")[0] ?? "",
    movementTitle: texts(root, "movement-title")[0] ?? "",
    creators: children(identification, "creator").map((creator) => ({ type: creator.getAttribute("type") ?? "", text: creator.textContent?.trim() ?? "" })),
    rights: texts(identification, "rights"),
    sources: texts(identification, "source"),
    credits: children(root, "credit").map((credit) => ({
      types: texts(credit, "credit-type"),
      text: texts(credit, "credit-words").filter(Boolean).join(" "),
    })),
  });
}
