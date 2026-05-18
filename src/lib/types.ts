export interface WikiEntity {
  name: string;
  role: string;
}

export interface WikiTimelineEvent {
  year: string;
  event: string;
}

export interface WikiPage {
  title: string;
  summary: string;
  keyConcepts: string[];
  entities: WikiEntity[];
  timeline: WikiTimelineEvent[];
  relatedTechnologies: string[];
  futurePredictions: string[];
  connections: string[];
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
}

export interface DashboardStats {
  topicsLearned: number;
  conceptsInWiki: number | null;
  hydraRelations: number | null;
  avgRecallMs: number | null;
  recallConfidence: number | null;
}
