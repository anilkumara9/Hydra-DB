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

export interface KnowledgeConflict {
  id: string;
  entityOrTopic: string;
  priorClaim: string;
  newClaim: string;
  resolution: "prefer_new_upload" | "coexist" | "needs_review";
  severity: "high" | "medium";
}

export interface WikiReconciliation {
  conflicts: KnowledgeConflict[];
  entityUpdates: string[];
  summary: string;
}

export interface LearnedTopic {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  concepts?: string[];
  generation?: number;
  sourceId?: string | null;
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
  kind: "knowledge" | "memory" | "session";
}

export interface ReasoningTrace {
  steps: string[];
  sources: RecallSource[];
  graphEdges: GraphEdge[];
  latencyMs: number;
  confidence: number | null;
  mode: "fast" | "thinking";
  freshnessPolicy?: string;
  filteredStaleChunks?: number;
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
  conflictsDetected: number;
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
