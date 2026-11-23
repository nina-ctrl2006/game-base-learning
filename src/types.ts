export type UserRole = 'admin' | 'siswa';

export type Difficulty = 'Pemula' | 'Menengah' | 'Mahir';

export type PublishStatus = 'draft' | 'published';

export type ChallengeType =
  | 'multiple_choice'
  | 'true_false'
  | 'drag_and_drop'
  | 'matching'
  | 'ordering'
  | 'find_the_error'
  | 'case_simulation'
  | 'decision_making';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatarId: string;
  institution: string;
  createdAt: string;
  lastActiveAt: string;
}

export type PublicUser = Omit<User, 'password'>;

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface Material {
  id: string;
  title: string;
  categoryId: string;
  description: string;
  content: string;
  imageUrl: string;
  pdfUrl: string;
  pdfName: string;
  videoUrl: string;
  objectives: string[];
  keyPoints: string[];
  difficulty: Difficulty;
  estimatedMinutes: number;
  order: number;
  status: PublishStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DragZone {
  id: string;
  label: string;
  color?: string;
}

export interface DragItem {
  id: string;
  label: string;
  sublabel?: string;
  correctZoneId: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface OrderingStep {
  id: string;
  text: string;
}

export interface ErrorTableRow {
  id: string;
  cells: string[];
  isError: boolean;
  errorReason?: string;
}

export interface DecisionChoice {
  id: string;
  label: string;
  consequence: string;
  scoreRatio: number; // 0 to 1
  isOptimal: boolean;
}

export interface Challenge {
  id: string;
  order: number;
  type: ChallengeType;
  title: string;
  prompt: string;
  points: number;
  explanation: string;
  // multiple_choice & case_simulation
  options?: string[];
  correctIndex?: number;
  // true_false
  statement?: string;
  correctAnswer?: boolean;
  // drag_and_drop
  zones?: DragZone[];
  items?: DragItem[];
  // matching
  pairs?: MatchingPair[];
  // ordering
  steps?: OrderingStep[];
  // find_the_error
  tableTitle?: string;
  columns?: string[];
  rows?: ErrorTableRow[];
  // case_simulation
  dossierTitle?: string;
  dossierSender?: string;
  dossierContent?: string;
  // decision_making
  situation?: string;
  impactNote?: string;
  choices?: DecisionChoice[];
}

export interface GameSimulation {
  id: string;
  materialId: string;
  title: string;
  description: string;
  story: string;
  instructions: string;
  timerSeconds: number;
  difficulty: Difficulty;
  status: PublishStatus;
  challenges: Challenge[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  order: number;
  type: 'multiple_choice' | 'true_false';
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  materialId: string;
  title: string;
  description: string;
  timerSeconds: number;
  passingScore: number;
  status: PublishStatus;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface AttemptDetail {
  itemId: string;
  title: string;
  typeLabel: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  userAnswerSummary: string;
  correctAnswerSummary: string;
  explanation: string;
}

export type PredikatTitle =
  | 'Master Administrator'
  | 'Expert Staff'
  | 'Junior Administrator'
  | 'Trainee Administrator';

export interface AttemptRecord {
  id: string;
  userId: string;
  userName: string;
  materialId: string;
  materialTitle: string;
  kind: 'simulation' | 'quiz';
  targetId: string;
  targetTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  predikat: PredikatTitle;
  details: AttemptDetail[];
  completedAt: string;
}

export interface MaterialProgress {
  userId: string;
  materialId: string;
  materialRead: boolean;
  simulationCompleted: boolean;
  simulationBestScore: number;
  quizCompleted: boolean;
  quizBestScore: number;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetTitle: string;
  timestamp: string;
}

export interface DatabaseState {
  users: User[];
  categories: Category[];
  materials: Material[];
  games: GameSimulation[];
  quizzes: Quiz[];
  attempts: AttemptRecord[];
  progress: MaterialProgress[];
  activities: ActivityLog[];
}
