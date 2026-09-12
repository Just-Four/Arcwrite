"use client";

export type FrameworkStep = {
  title: string;
  purpose: string;
  keywords: string[];
};

export type FrameworkDef = {
  id: string;
  name: string;
  acts: string[];
  steps: FrameworkStep[];
};

export const frameworks: FrameworkDef[] = [
  {
    id: "three-act",
    name: "Three-Act",
    acts: ["Act I", "Act II", "Act III"],
    steps: [
      { title: "Setup", purpose: "Introduce world, tone, and protagonist in ordinary life.", keywords: ["status quo", "introduction", "tone"] },
      { title: "Inciting Incident", purpose: "Disrupt status quo with a compelling problem.", keywords: ["disruption", "call", "problem"] },
      { title: "First Plot Point", purpose: "Commitment to a goal; stakes rise and direction changes.", keywords: ["commitment", "stakes", "turn"] },
      { title: "Midpoint", purpose: "Revelation or reversal reshapes approach.", keywords: ["reversal", "revelation", "pivot"] },
      { title: "Second Plot Point", purpose: "All seems lost; regroup and transform.", keywords: ["low point", "regroup", "transformation"] },
      { title: "Climax", purpose: "Confrontation resolves central conflict.", keywords: ["confrontation", "resolve", "decision"] },
      { title: "Denouement", purpose: "New status quo; demonstrate change.", keywords: ["aftermath", "change", "new normal"] },
    ],
  },
  {
    id: "heros-journey",
    name: "Hero's Journey",
    acts: ["Departure", "Initiation", "Return"],
    steps: [
      { title: "Ordinary World", purpose: "Establish the hero's everyday life and flaws.", keywords: ["baseline", "flaws", "home"] },
      { title: "Call to Adventure", purpose: "Present the challenge or quest.", keywords: ["summons", "challenge", "quest"] },
      { title: "Refusal of the Call", purpose: "Reluctance and fear surface.", keywords: ["hesitation", "fear", "doubt"] },
      { title: "Meeting the Mentor", purpose: "Guidance, gifts, or training appears.", keywords: ["mentor", "guide", "tool"] },
      { title: "Crossing the Threshold", purpose: "Enter the special world; commitment.", keywords: ["first threshold", "special world", "commitment"] },
      { title: "Tests, Allies, Enemies", purpose: "Form relationships; face obstacles.", keywords: ["allies", "rivals", "trials"] },
      { title: "Approach the Inmost Cave", purpose: "Prepare for major ordeal.", keywords: ["preparation", "plan", "fear"] },
      { title: "Ordeal", purpose: "Face the central crisis; transformation.", keywords: ["crisis", "death/rebirth", "turn"] },
      { title: "Reward", purpose: "Claim treasure or insight.", keywords: ["boon", "treasure", "insight"] },
      { title: "The Road Back", purpose: "Return journey begins; consequences rise.", keywords: ["pursuit", "cost", "return"] },
      { title: "Resurrection", purpose: "Final test; purification and renewal.", keywords: ["final test", "purify", "renew"] },
      { title: "Return with the Elixir", purpose: "Bring change home; share the boon.", keywords: ["homecoming", "boon", "change"] },
    ],
  },
  {
    id: "save-the-cat",
    name: "Save the Cat",
    acts: ["Act I", "Act II", "Act III"],
    steps: [
      { title: "Opening Image", purpose: "Snapshot of the world before change.", keywords: ["tone", "world", "hero"] },
      { title: "Theme Stated", purpose: "Someone hints at the story's lesson.", keywords: ["theme", "hint", "lesson"] },
      { title: "Set-Up", purpose: "Introduce characters, stakes, and flaws.", keywords: ["stakes", "flaws", "relationships"] },
      { title: "Catalyst", purpose: "Event that knocks down the hero's world.", keywords: ["shock", "disruption", "call"] },
      { title: "Debate", purpose: "Hero questions the journey ahead.", keywords: ["debate", "doubt", "choice"] },
      { title: "Break into Two", purpose: "Enter the new world; decision to act.", keywords: ["act two", "commit", "new world"] },
      { title: "B Story", purpose: "Secondary thread: relationships or theme.", keywords: ["subplot", "relationship", "theme"] },
      { title: "Fun and Games", purpose: "Promise of the premise; hero explores.", keywords: ["explore", "premise", "tests"] },
      { title: "Midpoint", purpose: "False victory or defeat; stakes shift.", keywords: ["reversal", "stakes", "pivot"] },
      { title: "Bad Guys Close In", purpose: "Pressure mounts; flaws exploited.", keywords: ["pressure", "antagonism", "flaws"] },
      { title: "All Is Lost", purpose: "Lowest point; loss or sacrifice.", keywords: ["loss", "sacrifice", "despair"] },
      { title: "Dark Night of the Soul", purpose: "Introspection; find resolve.", keywords: ["introspection", "resolve", "insight"] },
      { title: "Break into Three", purpose: "Combine learnings to plan climax.", keywords: ["act three", "plan", "synthesis"] },
      { title: "Finale", purpose: "Execute plan; defeat the problem.", keywords: ["execution", "solution", "victory"] },
      { title: "Final Image", purpose: "Show transformed world.", keywords: ["change", "new normal", "echo"] },
    ],
  },
  {
    id: "seven-point",
    name: "Seven-Point",
    acts: ["Setup", "Confrontation", "Resolution"],
    steps: [
      { title: "Hook", purpose: "Compelling start that grabs attention.", keywords: ["hook", "intrigue", "question"] },
      { title: "First Plot Point", purpose: "Enter main conflict; stakes rise.", keywords: ["turn", "stakes", "goal"] },
      { title: "First Pinch Point", purpose: "Apply pressure; show antagonistic force.", keywords: ["pressure", "antagonist", "risk"] },
      { title: "Midpoint", purpose: "Shift from reactive to proactive.", keywords: ["reversal", "agency", "pivot"] },
      { title: "Second Pinch Point", purpose: "Escalate risk; show consequences.", keywords: ["escalation", "risk", "cost"] },
      { title: "Second Plot Point", purpose: "Final piece needed for resolution.", keywords: ["revelation", "tool", "resolve"] },
      { title: "Resolution", purpose: "Tie threads and show outcome.", keywords: ["outcome", "change", "closure"] },
    ],
  },
  {
    id: "fichtean-curve",
    name: "Fichtean Curve",
    acts: ["Build", "Crisis", "Resolution"],
    steps: [
      { title: "Immediate Conflict", purpose: "Story begins in action and tension.", keywords: ["in medias res", "tension", "stakes"] },
      { title: "Rising Crises", purpose: "Cyclical obstacles intensify.", keywords: ["cycles", "rising action", "pressure"] },
      { title: "Obstacle Peaks", purpose: "Major setback before climax.", keywords: ["setback", "peak", "strain"] },
      { title: "Climax", purpose: "Decisive confrontation.", keywords: ["showdown", "decision", "resolve"] },
      { title: "Denouement", purpose: "Short resolution and aftermath.", keywords: ["aftermath", "brevity", "echo"] },
    ],
  },
  {
    id: "kishotenketsu",
    name: "Kishōtenketsu",
    acts: ["Ki", "Shō", "Ten", "Ketsu"],
    steps: [
      { title: "Ki (Introduction)", purpose: "Introduce characters and setting.", keywords: ["intro", "context", "tone"] },
      { title: "Shō (Development)", purpose: "Develop situations without conflict.", keywords: ["development", "contrast", "expansion"] },
      { title: "Ten (Twist)", purpose: "Unexpected turn reframes meaning.", keywords: ["twist", "reframe", "surprise"] },
      { title: "Ketsu (Conclusion)", purpose: "Synthesize elements; quiet resolution.", keywords: ["synthesis", "resolution", "reflection"] },
    ],
  },
  {
    id: "story-circle",
    name: "Story Circle",
    acts: ["Act I", "Act II", "Act III"],
    steps: [
      { title: "You", purpose: "A character in a zone of comfort.", keywords: ["identity", "comfort", "flaw"] },
      { title: "Need", purpose: "They desire something.", keywords: ["desire", "lack", "motivation"] },
      { title: "Go", purpose: "Enter unfamiliar situation.", keywords: ["threshold", "new world", "venture"] },
      { title: "Search", purpose: "Adapt, struggle, learn.", keywords: ["trial", "adaptation", "learning"] },
      { title: "Find", purpose: "Get what they wanted.", keywords: ["acquire", "goal", "reward"] },
      { title: "Take", purpose: "Pay a heavy price.", keywords: ["sacrifice", "cost", "consequence"] },
      { title: "Return", purpose: "Return to familiar situation.", keywords: ["homecoming", "return", "loop"] },
      { title: "Change", purpose: "They are transformed.", keywords: ["growth", "change", "insight"] },
    ],
  },
  {
    id: "tragedy",
    name: "Tragedy",
    acts: ["Act I", "Act II", "Act III", "Act IV", "Act V"],
    steps: [
      { title: "Exposition", purpose: "Establish world and tragic flaw.", keywords: ["setup", "flaw", "fate"] },
      { title: "Rising Action", purpose: "Conflicts increase; hubris grows.", keywords: ["rise", "hubris", "conflict"] },
      { title: "Crisis", purpose: "Turning point where fate seals doom.", keywords: ["turn", "doom", "choice"] },
      { title: "Catastrophe", purpose: "Downfall and suffering.", keywords: ["downfall", "loss", "suffering"] },
      { title: "Catharsis", purpose: "Audience purges emotion; reflection.", keywords: ["purge", "reflection", "lesson"] },
    ],
  },
  {
    id: "rebirth",
    name: "Rebirth",
    acts: ["Act I", "Act II", "Act III"],
    steps: [
      { title: "Enslavement", purpose: "Protagonist trapped by flaw or situation.", keywords: ["trap", "flaw", "stasis"] },
      { title: "Hints of Redemption", purpose: "Signs of change appear.", keywords: ["kindness", "hope", "glimmer"] },
      { title: "Crisis of Self", purpose: "Confront the worst version of self.", keywords: ["self", "mirror", "crisis"] },
      { title: "Revelation", purpose: "Realize truth; new perspective.", keywords: ["revelation", "insight", "truth"] },
      { title: "Rebirth", purpose: "Transform and act from newfound self.", keywords: ["transformation", "action", "renewal"] },
    ],
  },
  {
    id: "freytag",
    name: "Freytag's Pyramid",
    acts: ["Exposition", "Rising Action", "Climax", "Falling Action", "Denouement"],
    steps: [
      { title: "Exposition", purpose: "Introduce setting and characters.", keywords: ["setup", "context", "tone"] },
      { title: "Rising Action", purpose: "Complications build tension.", keywords: ["complication", "tension", "stakes"] },
      { title: "Climax", purpose: "Peak confrontation; turning point.", keywords: ["peak", "confrontation", "turn"] },
      { title: "Falling Action", purpose: "Consequences unfold.", keywords: ["fallout", "aftermath", "consequence"] },
      { title: "Denouement", purpose: "Resolution and new equilibrium.", keywords: ["resolution", "equilibrium", "closure"] },
    ],
  },
];

export function getFrameworkById(id?: string): FrameworkDef | undefined {
  if (!id) return undefined;
  return frameworks.find(f => f.id === id);
}

export function makeStepId(frameworkId: string, stepIndex: number): string {
  return `${frameworkId}:${stepIndex}`;
}

export function parseStepId(stepId?: string): { frameworkId: string; index: number } | undefined {
  if (!stepId) return undefined;
  const m = stepId.match(/^([^:]+):(\d+)$/);
  if (!m) return undefined;
  return { frameworkId: m[1], index: Number(m[2]) };
}

export function getActIndexForStep(frameworkId: string, stepIndex: number): number {
  switch (frameworkId) {
    case "three-act":
      return [0, 0, 0, 1, 1, 2, 2][stepIndex] ?? 0;
    case "heros-journey":
      return stepIndex <= 4 ? 0 : stepIndex <= 8 ? 1 : 2;
    case "save-the-cat":
      if (stepIndex <= 4) return 0;
      if (stepIndex <= 11) return 1;
      return 2;
    case "seven-point":
      if (stepIndex === 0) return 0;
      if (stepIndex <= 4) return 1;
      return 2;
    case "fichtean-curve":
      if (stepIndex <= 1) return 0;
      if (stepIndex <= 3) return 1;
      return 2;
    case "kishotenketsu":
      return stepIndex; // 4 acts, 4 steps (1:1)
    case "story-circle":
      if (stepIndex <= 2) return 0;
      if (stepIndex <= 5) return 1;
      return 2;
    case "tragedy":
      return stepIndex; // 5 acts, 5 steps (1:1)
    case "rebirth":
      if (stepIndex <= 1) return 0;
      if (stepIndex === 2) return 1;
      return 2;
    case "freytag":
      return stepIndex; // 5 acts, 5 steps (1:1)
    default:
      return 0;
  }
}