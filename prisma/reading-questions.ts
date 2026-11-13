export const ACTIVE_READING_TEST_VERSION = 2;
type Option = { id: string; text: string };
type Item = {
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE_NOT_GIVEN" | "YES_NO_NOT_GIVEN" | "MATCHING_INFORMATION" | "SENTENCE_COMPLETION" | "SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION" | "MATCHING_HEADINGS" | "MATCHING_FEATURES" | "MATCHING_SENTENCE_ENDINGS" | "DIAGRAM_LABEL_COMPLETION" | "SHORT_ANSWER";
  prompt: string;
  evidenceBlockIndex: number;
  passageBlockIndex?: number;
  options?: Option[];
  correctAnswers: string[];
  explanation: string;
};
type Bank = { multipleChoice: [Item, Item]; trueFalse: [Item, Item]; yesNo: Item; matchingInformation: Item; matchingHeadings: Item; matchingFeatures: Item; matchingEndings: Item; sentenceCompletion: Item; summaryCompletion: Item; diagramCompletion: Item; shortAnswer: Item };

const optionList = (labels: string[]): Option[] => labels.map((text, index) => ({ id: String.fromCharCode(65 + index), text }));
const headings = (labels: string[]): Option[] => labels.map((text, index) => ({ id: `H${index + 1}`, text }));
const tfnOptions: Option[] = [{ id: "TRUE", text: "TRUE" }, { id: "FALSE", text: "FALSE" }, { id: "NOT_GIVEN", text: "NOT GIVEN" }];
const ynOptions: Option[] = [{ id: "YES", text: "YES" }, { id: "NO", text: "NO" }, { id: "NOT_GIVEN", text: "NOT GIVEN" }];
const paragraphs: Option[] = "ABCDEFGH".split("").map((letter) => ({ id: letter, text: `Paragraph ${letter}` }));
const mc = (prompt: string, labels: string[], answer: string, evidence: number, explanation: string): Item => ({ type: "MULTIPLE_CHOICE", prompt, options: optionList(labels), correctAnswers: [answer], evidenceBlockIndex: evidence, explanation });
const tf = (prompt: string, answer: string, evidence: number, explanation: string): Item => ({ type: "TRUE_FALSE_NOT_GIVEN", prompt, options: tfnOptions, correctAnswers: [answer], evidenceBlockIndex: evidence, explanation });
const yesNo = (prompt: string, answer: string, evidence: number, explanation: string): Item => ({ type: "YES_NO_NOT_GIVEN", prompt, options: ynOptions, correctAnswers: [answer], evidenceBlockIndex: evidence, explanation });
const matchInfo = (prompt: string, paragraph: string, evidence: number): Item => ({ type: "MATCHING_INFORMATION", prompt, options: paragraphs, correctAnswers: [paragraph], evidenceBlockIndex: evidence, explanation: `The detail is located in paragraph ${paragraph}.` });
const matchHeadings = (passage: number, answer: string, labels: string[]): Item => ({ type: "MATCHING_HEADINGS", prompt: "Choose the heading that best summarises the labelled paragraph.", passageBlockIndex: passage, evidenceBlockIndex: passage, options: headings(labels), correctAnswers: [answer], explanation: `The paragraph's main idea is captured by heading ${answer.slice(1)}.` });
const matchFeatures = (prompt: string, labels: string[], answer: string, evidence: number, explanation: string): Item => ({ type: "MATCHING_FEATURES", prompt, options: optionList(labels), correctAnswers: [answer], evidenceBlockIndex: evidence, explanation });
const matchEnding = (prompt: string, labels: string[], answer: string, evidence: number, explanation: string): Item => ({ type: "MATCHING_SENTENCE_ENDINGS", prompt, options: optionList(labels), correctAnswers: [answer], evidenceBlockIndex: evidence, explanation });
const completion = (type: Item["type"], prompt: string, answer: string, evidence: number, explanation: string, options?: Option[]): Item => ({ type, prompt, correctAnswers: [answer], evidenceBlockIndex: evidence, explanation, ...(options ? { options } : {}) });

function buildBank(bank: Bank): Item[] {
  return [
    ...bank.multipleChoice,
    ...bank.trueFalse,
    bank.yesNo,
    bank.matchingInformation,
    bank.matchingHeadings,
    bank.matchingFeatures,
    bank.matchingEndings,
    bank.sentenceCompletion,
    bank.summaryCompletion,
    bank.diagramCompletion,
    bank.shortAnswer,
  ];
}

const aiHeadings = ["From calculation to collaboration", "Changing the nature of work", "Reliability and accountability", "A shared direction"];
const cityHeadings = ["Cities as centres of opportunity", "The cost of rapid growth", "Planning for everyday life", "A more resilient urban future"];
const climateHeadings = ["A changing climate, a changing habitat", "Effects that spread through ecosystems", "Protecting the capacity to adapt", "Difficult choices and shared responsibility"];
const memoryHeadings = ["Memory is an active process", "Why attention and meaning matter", "Forgetting and the passage of time", "Memory in ordinary life"];
const energyHeadings = ["A transition beyond fuel", "New industries and uneven change", "Managing reliability and investment", "A broader measure of progress"];

export const readingQuestionSets: Record<string, Item[]> = {
  "future-of-artificial-intelligence": buildBank({
    multipleChoice: [
      mc("What has made computers useful when rules are difficult to express precisely?", ["Learning statistical relationships from examples", "Following longer instruction lists", "Removing all human judgement", "Collecting fewer examples"], "A", 1, "Modern systems can learn statistical relationships from examples."),
      mc("Why can a model reproduce unequal treatment?", ["It is always trained without data", "Historical records may contain unequal treatment", "Sensitive characteristics are always included", "Models cannot make predictions"], "B", 2, "The training material may reflect unequal treatment even when sensitive characteristics are removed."),
    ],
    trueFalse: [
      tf("The passage says most occupations disappear as complete units when automation is introduced.", "FALSE", 4, "It explains that most jobs contain separate tasks, and only some may be easier to automate."),
      tf("Human review can help only when reviewers have enough time, authority and knowledge to question a recommendation.", "TRUE", 7, "The passage lists all three conditions for useful human review."),
    ],
    yesNo: yesNo("The writer believes people should have a way to challenge decisions made with the help of AI.", "YES", 7, "The writer recommends giving people a route to challenge decisions."),
    matchingInformation: matchInfo("Which paragraph explains why models may reproduce unfair patterns in their training material?", "B", 2),
    matchingHeadings: matchHeadings(1, "H1", aiHeadings),
    matchingFeatures: matchFeatures("Which group may need training as workplaces introduce new AI tools?", ["Workers", "Schools", "Governments", "Researchers"], "A", 4, "The passage says workers need training as organisations redesign responsibilities."),
    matchingEndings: matchEnding("Machine-learning results reflect…", ["the material on which the system was trained", "the length of its instruction list", "the number of owners in a company", "whether it uses a human voice"], "A", 2, "The results reflect the material on which the model was trained."),
    sentenceCompletion: completion("SENTENCE_COMPLETION", "A model adjusts its internal _____ when its predictions differ from the desired result. Use NO MORE THAN TWO WORDS.", "parameters", 2, "The passage says the model adjusts its internal parameters."),
    summaryCompletion: completion("SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "School students should assess machine-generated claims rather than treat them as _____. Use ONE WORD.", "authorities", 10, "Schools can teach students to assess claims rather than treat them as authorities."),
    diagramCompletion: completion("DIAGRAM_LABEL_COMPLETION", "Complete the final label in this process using ONE WORD.", "challenge", 7, "Organisations should provide a route for people to challenge decisions.", [{ id: "step1", text: "Document the system's purpose" }, { id: "step2", text: "Test it with realistic cases" }]),
    shortAnswer: completion("SHORT_ANSWER", "What can sometimes identify people even after their names are removed? Use NO MORE THAN FOUR WORDS.", "combinations of details", 8, "The passage notes that combinations of details may identify individuals."),
  }),
  "urbanization-modern-cities": buildBank({
    multipleChoice: [
      mc("Which advantage of a dense population is described?", ["Public transport can carry many passengers on one route", "Housing always keeps pace with growth", "Every resident can change careers", "Cities use fewer resources"], "A", 2, "Public transport can carry many passengers along one route."),
      mc("Why might building more homes fail to help the people who need affordable housing?", ["New homes cannot be renovated", "Location and price determine who benefits", "Cities have no public transport", "Housing policy prevents mixed neighbourhoods"], "B", 5, "The passage explains that location and price determine who benefits."),
    ],
    trueFalse: [
      tf("The passage says parks and tree-lined streets can offer shade.", "TRUE", 7, "The planning paragraph explicitly mentions shade from parks and tree-lined streets."),
      tf("The author says renovating buildings should displace the residents a project is intended to assist.", "FALSE", 8, "The text cautions that redevelopment should not displace the intended residents."),
    ],
    yesNo: yesNo("The writer argues that city planning should treat housing, transport and public space as connected issues.", "YES", 7, "The writer directly recommends considering these issues together."),
    matchingInformation: matchInfo("Which paragraph describes the effect of concrete and asphalt on local temperatures?", "D", 5),
    matchingHeadings: matchHeadings(7, "H3", cityHeadings),
    matchingFeatures: matchFeatures("Who may reveal barriers that are not visible on a map?", ["Local communities", "Car manufacturers", "University lecturers", "Tourists"], "A", 7, "The passage says local communities can reveal barriers that appear invisible on a map."),
    matchingEndings: matchEnding("New housing may fail to be affordable when it…", ["is far from jobs and transport", "includes a mix of housing types", "is built near public services", "is planned with local communities"], "A", 8, "Residents can face high costs when new homes are far from employment and transport."),
    sentenceCompletion: completion("SENTENCE_COMPLETION", "When population growth outpaces construction, _____ may rise. Use ONE WORD.", "rents", 4, "The passage directly links population growth outpacing construction with rising rents."),
    summaryCompletion: completion("SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "Parks and tree-lined streets provide _____ and may improve mental well-being. Use ONE WORD.", "shade", 7, "The text says these spaces offer shade and can improve mental well-being."),
    diagramCompletion: completion("DIAGRAM_LABEL_COMPLETION", "Complete the final label in this city-planning diagram using ONE WORD.", "flooding", 10, "Wetlands can reduce flooding, while green roofs absorb rainfall.", [{ id: "step1", text: "Green roofs absorb some rainfall" }, { id: "step2", text: "Wetlands can reduce" }]),
    shortAnswer: completion("SHORT_ANSWER", "Which two services give residents alternatives to private cars? Use NO MORE THAN THREE WORDS.", "buses and trains", 7, "The passage names reliable buses and trains as alternatives to private cars."),
  }),
  "climate-change-biodiversity": buildBank({
    multipleChoice: [
      mc("How do some species respond to changing temperatures?", ["They move towards cooler areas or change seasonal timing", "They all migrate to the coast", "They stop interacting with other species", "They adapt at exactly the same rate"], "A", 2, "Some move to cooler places; others change seasonal timing."),
      mc("What can wildlife corridors do?", ["Guarantee that every species will move", "Link protected areas across human-managed land", "Prevent changes in rainfall", "Replace conservation plans"], "B", 7, "Wildlife corridors link protected areas across farms, roads and settlements."),
    ],
    trueFalse: [
      tf("The passage says all species adjust to climate change at the same rate.", "FALSE", 2, "The passage says these adjustments do not always occur at the same rate."),
      tf("Repeated or prolonged coral bleaching can weaken reefs.", "TRUE", 4, "The passage says repeated or prolonged bleaching weakens reefs."),
    ],
    yesNo: yesNo("The writer believes adaptation measures can permanently compensate for continuing global warming.", "NO", 11, "The writer says adaptation cannot indefinitely compensate for continuing emissions and habitat loss."),
    matchingInformation: matchInfo("Which paragraph explains how corals lose the algae that supply much of their energy?", "C", 4),
    matchingHeadings: matchHeadings(4, "H2", climateHeadings),
    matchingFeatures: matchFeatures("Whose long-term observations may contribute to ecological stewardship?", ["Indigenous communities", "Road contractors", "Energy investors", "Tour operators"], "A", 8, "The passage notes that Indigenous knowledge can contribute long-term observations and practical stewardship."),
    matchingEndings: matchEnding("Wildlife corridors are valuable because they…", ["connect protected areas across landscapes", "guarantee successful movement", "stop rainfall from changing", "remove every human pressure"], "A", 7, "Corridors connect protected areas and preserve possible routes for species."),
    sentenceCompletion: completion("SENTENCE_COMPLETION", "When ocean temperatures rise, corals may expel microscopic _____. Use ONE WORD.", "algae", 4, "Elevated temperatures can cause corals to expel microscopic algae."),
    summaryCompletion: completion("SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "Some species move to higher _____ or latitudes. Use ONE WORD.", "elevations", 2, "The passage mentions movement to higher elevations or latitudes."),
    diagramCompletion: completion("DIAGRAM_LABEL_COMPLETION", "Complete the final label in this reef diagram using ONE WORD.", "reefs", 4, "The text explains that repeated bleaching weakens coral reefs.", [{ id: "step1", text: "Ocean temperatures rise" }, { id: "step2", text: "Corals expel algae" }, { id: "step3", text: "Repeated bleaching weakens" }]),
    shortAnswer: completion("SHORT_ANSWER", "What do corals expel when ocean temperatures are elevated? Use NO MORE THAN TWO WORDS.", "algae", 4, "The passage identifies the expelled organisms as microscopic algae."),
  }),
  "psychology-human-memory": buildBank({
    multipleChoice: [
      mc("Why is recognition often easier than recall?", ["A familiar option provides a cue", "Recognition stores every experience permanently", "Recall does not use attention", "Recognition requires a person to generate an answer"], "A", 2, "A familiar option supplies information that would otherwise need to be generated."),
      mc("Which study method is said to support longer-lasting retention?", ["Repeating a chapter in one sitting", "Spacing sessions over several days", "Avoiding self-testing", "Studying while distracted"], "B", 7, "The text says spacing study over several days supports longer-lasting retention."),
    ],
    trueFalse: [
      tf("The passage presents emotional vividness as proof that a memory is accurate.", "FALSE", 5, "The passage states that vividness is not the same as accuracy."),
      tf("The passage says external reminders replace memory entirely.", "FALSE", 10, "The passage says reminders change how memory is used rather than replace it."),
    ],
    yesNo: yesNo("The writer recommends evaluating eyewitness accounts carefully.", "YES", 5, "The passage says eyewitness accounts deserve careful evaluation because memory can change."),
    matchingInformation: matchInfo("Which paragraph explains why recognition may be easier than recall?", "B", 2),
    matchingHeadings: matchHeadings(4, "H2", memoryHeadings),
    matchingFeatures: matchFeatures("Whose recollections may be influenced by repeated questioning?", ["Witnesses", "Solar engineers", "City planners", "Energy investors"], "A", 5, "The passage explains that witnesses' later recollections may be influenced by repeated questioning."),
    matchingEndings: matchEnding("Spacing study sessions over several days tends to…", ["support longer-lasting retention", "weaken every memory cue", "make recognition harder", "eliminate the need to recall"], "A", 7, "The passage directly connects spaced study with longer-lasting retention."),
    sentenceCompletion: completion("SENTENCE_COMPLETION", "Researchers distinguish between encoding, storage and _____. Use ONE WORD.", "retrieval", 2, "These are the three stages listed in the text."),
    summaryCompletion: completion("SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "Organising new information around a larger principle can improve _____. Use ONE WORD.", "learning", 4, "Meaningful organisation can improve learning and recall."),
    diagramCompletion: completion("DIAGRAM_LABEL_COMPLETION", "Complete the final stage in this memory process using ONE WORD.", "retrieval", 2, "The passage lists encoding, storage and retrieval as interacting stages.", [{ id: "step1", text: "Encoding" }, { id: "step2", text: "Storage" }]),
    shortAnswer: completion("SHORT_ANSWER", "What kind of reminders can extend human memory? Use ONE WORD.", "external", 10, "The passage describes external reminders such as calendars and lists."),
  }),
  "renewable-energy-global-economy": buildBank({
    multipleChoice: [
      mc("Why does expanding renewable energy require more than new generating equipment?", ["Output can change with weather and time", "Renewables cannot be traded internationally", "Fossil fuels are continuously available everywhere", "Clean energy removes the need for coordination"], "A", 1, "Systems must accommodate renewable sources whose output changes with weather and time."),
      mc("What can help shift electricity from sunny afternoons to evenings?", ["Batteries", "Higher borrowing costs", "Fossil fuel imports", "Shorter construction periods"], "A", 7, "Batteries can shift electricity from sunny afternoons to evening periods."),
    ],
    trueFalse: [
      tf("The price of a generating unit is the only cost that affects renewable electricity systems.", "FALSE", 2, "The passage also names transmission, storage, flexible demand and financing costs."),
      tf("A country may generate renewable electricity while importing much of the equipment used to produce it.", "TRUE", 5, "The passage describes this exact situation."),
    ],
    yesNo: yesNo("The writer argues that stable policy helps energy projects attract investment.", "YES", 7, "The passage says stable policy is important because projects take a long time to plan and build."),
    matchingInformation: matchInfo("Which paragraph explains how batteries can help balance electricity supply at different times?", "G", 7),
    matchingHeadings: matchHeadings(4, "H2", energyHeadings),
    matchingFeatures: matchFeatures("Who must estimate future prices, rules and demand before investing?", ["Investors", "School students", "Witnesses", "Local bus passengers"], "A", 7, "The passage says investors make these estimates before committing capital."),
    matchingEndings: matchEnding("A country may generate renewable electricity at home but…", ["import much of the equipment", "avoid all system costs", "no longer need transmission", "guarantee profits for every firm"], "A", 5, "The passage says a country can import much of the equipment it uses."),
    sentenceCompletion: completion("SENTENCE_COMPLETION", "Sudden policy changes can delay projects and increase _____ costs. Use ONE WORD.", "financing", 7, "The passage says policy changes can increase financing costs."),
    summaryCompletion: completion("SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "Electricity output from renewable sources may change with _____ and time of day. Use ONE WORD.", "weather", 1, "The passage says output changes with weather and time of day."),
    diagramCompletion: completion("DIAGRAM_LABEL_COMPLETION", "Complete the final label in this electricity-storage diagram using ONE WORD.", "evening", 7, "Batteries shift electricity from sunny afternoons to evening periods.", [{ id: "step1", text: "Sunny afternoon electricity" }, { id: "step2", text: "Batteries store and shift supply to the" }]),
    shortAnswer: completion("SHORT_ANSWER", "Which device can shift electricity from sunny afternoons to evenings? Use ONE WORD.", "batteries", 7, "The passage names batteries as a way to shift electricity between these periods."),
  }),
};
