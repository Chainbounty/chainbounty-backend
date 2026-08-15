export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: GitHubUser;
  html_url: string;
  private: boolean;
}

export interface GitHubIssueEvent {
  action:
    | 'opened'
    | 'edited'
    | 'deleted'
    | 'closed'
    | 'reopened'
    | 'labeled'
    | 'unlabeled'
    | 'assigned'
    | 'unassigned';
  issue: GitHubIssue;
  repository: GitHubRepository;
  sender: GitHubUser;
  label?: GitHubLabel;
}
