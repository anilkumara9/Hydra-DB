export interface WikiEntity {
  name: string;
  role: string;
}

export interface WikiTimelineEvent {
  year: string;
  event: string;
}

export interface WikiSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface WikiInfoboxRow {
  label: string;
  value: string;
}

export interface WikiKeyFact {
  fact: string;
  evidence: string;
}

export type WikiSourceCoverage = "full" | "partial" | "minimal";

export interface WikiPage {
  title: string;
  summary: string;
  sections: WikiSection[];
  infobox: WikiInfoboxRow[];
  keyFacts: WikiKeyFact[];
  keyConcepts: string[];
  entities: WikiEntity[];
  timeline: WikiTimelineEvent[];
  relatedTechnologies: string[];
  inferences: string[];
  connections: string[];
  sourceCoverage: WikiSourceCoverage;
}

export interface LearnedTopic {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  concepts?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  reasoning?: ReasoningTrace;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

export interface RecallSource {
  title: string;
  excerpt: string;
  score: number | null;
}

export interface ReasoningTrace {
  steps: string[];
  sources: RecallSource[];
  graphEdges: GraphEdge[];
  latencyMs: number;
  confidence: number | null;
  mode: "fast" | "thinking";
}

export interface CrossTopicInsight {
  headline: string;
  bridges: string[];
  emergentThemes: string[];
  strategicImplication: string;
}

export interface IngestMetrics {
  conceptsExtracted: number;
  entitiesExtracted: number;
  memoryCommitted: boolean;
  hydraSourceId: string | null;
  processingMs: number;
  uploadGeneration: number;
  sourceChars: number;
}

export interface DashboardStats {
  topicsLearned: number;
  conceptsInWiki: number | null;
  hydraRelations: number | null;
  avgRecallMs: number | null;
  recallConfidence: number | null;
  chunksRetrieved: number | null;
}

export interface IndexingStatus {
  sourceId: string;
  status: "queued" | "processing" | "completed" | "error" | "unknown";
  ready: boolean;
  message: string;
}

export interface MemorySearchHit {
  title: string;
  excerpt: string;
  score: number | null;
}

export interface InvestorBrief {
  thesis: string;
  marketOpportunity: string;
  productMoat: string;
  tractionSignals: string[];
  askStatement: string;
}
