export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
}

export interface Draft {
  id: string;
  content: unknown;
  updatedAt?: string;
}

export interface DataAccessHubModels {
  catalog?: CatalogItem[];
  drafts?: Draft[];
}
